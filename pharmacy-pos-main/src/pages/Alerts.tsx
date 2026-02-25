import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Calendar, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
interface Medicine {
  id: string;
  item_name: string;
  batch_no: string;
  quantity: number;
  expiry_date: string;
  manufacturer: string;
  mrp: number;
}
const Alerts = () => {
  const [lowStockMedicines, setLowStockMedicines] = useState<Medicine[]>([]);
  const [expiringMedicines, setExpiringMedicines] = useState<Medicine[]>([]); // within 30 days
  const [expiredMedicines, setExpiredMedicines] = useState<Medicine[]>([]); // already expired
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchAlerts();
  }, []);
  const fetchAlerts = async () => {
    try {
      // load dataset and local user medicines and merge
      const resp = await fetch("/cleaned_medicine_data.json");
      const json = await resp.json();
      const dataset = (json as any[]).map((row, idx) => ({
        id: `ds-${idx}`,
        item_name: row["ItemName"] || "",
        batch_no: row["BatchNo"] || "",
        quantity: Number(row["InvQty"]) || 0,
        expiry_date: row["ExpDate"] || "",
        manufacturer: String(row["MfgComp"] || ""),
        mrp: Number(row["ItemMRP"]) || 0,
      })) as Medicine[];
      // load local user medicines (added/edited via Inventory page)
      let local: Medicine[] = [];
      try {
        const raw = localStorage.getItem("user_medicines");
        if (raw) {
          const parsed = JSON.parse(raw) as any[];
          local = parsed.map((m, i) => ({
            id: m.id || `local-${i}`,
            item_name: m.item_name || "",
            batch_no: m.batch_no || "",
            quantity: Number(m.quantity) || 0,
            expiry_date: m.expiry_date || "",
            manufacturer: m.manufacturer || "",
            mrp: Number(m.mrp) || 0,
          }));
        }
      } catch {
        local = [];
      }
      const mapped = [...dataset, ...local];
      // Low stock: quantity < 10
      setLowStockMedicines(mapped.filter(med => med.quantity < 10));
      // Expiring: expiry within 30 days OR already expired
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      const soon = mapped.filter(med => {
        if (!med.expiry_date) return false;
        const exp = new Date(med.expiry_date);
        if (isNaN(exp.getTime())) return false;
        const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diff >= 0 && diff <= 30;
      });
      const expired = mapped.filter(med => {
        if (!med.expiry_date) return false;
        const exp = new Date(med.expiry_date);
        if (isNaN(exp.getTime())) return false;
        const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diff < 0;
      });
      setExpiringMedicines(soon);
      setExpiredMedicines(expired);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };
  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  const downloadLowStockCSV = () => {
    if (!lowStockMedicines || lowStockMedicines.length === 0) return;
    const headers = ["Item Name", "Batch No", "Quantity", "Expiry Date", "Manufacturer", "MRP"];
    const rows = lowStockMedicines.map(m => [
      m.item_name || "",
      m.batch_no || "",
      String(m.quantity ?? ""),
      m.expiry_date || "",
      m.manufacturer || "",
      m.mrp != null ? String(m.mrp) : "",
    ]);
    const csvContent = [headers, ...rows]
      .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `low_stock_medicines_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-6">
      <div className="container mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-warning" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-warning to-destructive bg-clip-text text-transparent">
            Alerts & Notifications
          </h1>
        </div>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-warning/50 bg-gradient-to-br from-card to-warning/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-warning">
                <Package className="h-5 w-5" />
                Low Stock Alert
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-warning">
                {lowStockMedicines.length}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Medicines with stock less than 10 units
              </p>
            </CardContent>
          </Card>
          <Card className="border-destructive/50 bg-gradient-to-br from-card to-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Calendar className="h-5 w-5" />
                Expiry Alert
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                Expiring: {expiringMedicines.length}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Within 30 days</div>
              <div className="text-2xl font-bold text-destructive mt-3">
                Expired: {expiredMedicines.length}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Already expired</div>
            </CardContent>
          </Card>
        </div>
        {/* Low Stock Medicines */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-warning" />
              Low Stock Medicines
            </CardTitle>
            <Button size="sm" variant="outline" onClick={downloadLowStockCSV} disabled={lowStockMedicines.length === 0}>
              Download CSV
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : lowStockMedicines.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No low stock alerts</p>
            ) : (
              <div className="space-y-3">
                {lowStockMedicines.map((medicine) => (
                  <div
                    key={medicine.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold">{medicine.item_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Batch: {medicine.batch_no} | {medicine.manufacturer}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Stock</p>
                        <p className="text-xl font-bold text-warning">{medicine.quantity}</p>
                      </div>
                      <Badge variant="outline" className="border-warning text-warning">
                        Low Stock
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        {/* Expiring Medicines */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-destructive" />
              Expiring Medicines
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : expiringMedicines.length === 0 ? (
              (expiredMedicines.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No expiring medicines</p>
              ) : (
                <div className="space-y-3">
                  {expiredMedicines.map((medicine) => {
                    const daysLeft = getDaysUntilExpiry(medicine.expiry_date);
                    return (
                      <div
                        key={`expired-${medicine.id}`}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold">{medicine.item_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Batch: {medicine.batch_no} | {medicine.manufacturer}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Expiry Date</p>
                            <p className="font-semibold">
                              {new Date(medicine.expiry_date).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-destructive">
                              Expired {Math.abs(daysLeft)} days ago
                            </p>
                          </div>
                          <Badge variant="outline" className="border-destructive text-destructive bg-destructive/10">
                            Expired
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
             ) : (
              <div className="space-y-3">
                {expiringMedicines.map((medicine) => {
                  const daysLeft = getDaysUntilExpiry(medicine.expiry_date);
                  const isExpired = daysLeft < 0;
                  const isUrgent = daysLeft <= 7 && daysLeft >= 0;
                  
                  return (
                    <div
                      key={`soon-${medicine.id}`}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold">{medicine.item_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Batch: {medicine.batch_no} | {medicine.manufacturer}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Stock: {medicine.quantity} | MRP: ₹{Number(medicine.mrp).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Expiry Date</p>
                          <p className="font-semibold">
                            {new Date(medicine.expiry_date).toLocaleDateString()}
                          </p>
                          <p className={`text-sm ${isExpired ? 'text-destructive' : isUrgent ? 'text-warning' : 'text-muted-foreground'}`}>
                            {isExpired 
                              ? `Expired ${Math.abs(daysLeft)} days ago`
                              : `${daysLeft} days left`
                            }
                          </p>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={
                            isExpired 
                              ? "border-destructive text-destructive bg-destructive/10" 
                              : isUrgent 
                              ? "border-warning text-warning bg-warning/10"
                              : "border-muted text-muted-foreground"
                          }
                        >
                          {isExpired ? "Expired" : isUrgent ? "Urgent" : "Soon"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                {/* also show expired items below the soon list if any */}
                {expiredMedicines.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-destructive">Already Expired</h4>
                    <div className="space-y-3 mt-2">
                      {expiredMedicines.map((medicine) => (
                        <div key={`expired-2-${medicine.id}`} className="flex items-center justify-between p-4 border rounded-lg bg-destructive/5">
                          <div>
                            <h3 className="font-semibold">{medicine.item_name}</h3>
                            <p className="text-sm text-muted-foreground">Batch: {medicine.batch_no} | {medicine.manufacturer}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{new Date(medicine.expiry_date).toLocaleDateString()}</p>
                            <Badge variant="outline" className="border-destructive text-destructive">Expired</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
             )}
           </CardContent>
         </Card>
       </div>
     </div>
   );
 };
 
 export default Alerts;