import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  ShoppingCart, 
  Package, 
  AlertTriangle, 
  TrendingUp,
  Pill,
  Users,
  Calendar
} from "lucide-react";

interface DashboardStats {
  totalMedicines: number;
  lowStockCount: number;
  expiringCount: number;
  todaySales: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalMedicines: 0,
    lowStockCount: 0,
    expiringCount: 0,
    todaySales: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  // load local user medicines (same key used elsewhere)
  const loadLocalMeds = () => {
    try {
      const raw = localStorage.getItem("user_medicines");
      if (!raw) return [];
      return JSON.parse(raw) as any[];
    } catch {
      return [];
    }
  };

  // load dataset medicines (cleaned file)
  const loadDatasetMeds = async () => {
    try {
      const res = await fetch("/cleaned_medicine_data.json");
      const json = await res.json();
      return (json as any[]).map((row, idx) => ({
        id: `ds-${idx}`,
        item_code: String(row["ItemCode"] || row["ItemName"] || `ds-${idx}`),
        item_name: String(row["ItemName"] || ""),
        batch_no: String(row["BatchNo"] || ""),
        quantity: Number(row["InvQty"]) || 0,
        expiry_date: row["ExpDate"] || "",
        mrp: Number(row["ItemMRP"]) || 0,
      }));
    } catch {
      return [];
    }
  };

  const loadLocalSales = () => {
    try {
      const raw = localStorage.getItem("local_sales");
      if (!raw) return [];
      return JSON.parse(raw) as any[]; // [{ sale: {...}, items: [...] }, ...]
    } catch {
      return [];
    }
  };

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      // 1) Load remote medicines (all minimal fields)
      let remoteMeds: any[] = [];
      try {
        const { data, error } = await supabase
          .from("medicines")
          .select("id,item_code,item_name,batch_no,quantity,expiry_date");
        if (!error && data) remoteMeds = data;
      } catch (err) {
        console.warn("Failed to fetch remote medicines:", err);
        remoteMeds = [];
      }

      // 2) Load dataset and local medicines
      const dataset = await loadDatasetMeds();
      const localMeds = loadLocalMeds();

      // 3) Merge & dedupe by key (item_code|batch_no). Prefer remote > local > dataset for values.
      const map = new Map<string, any>();
      const keyFor = (m: any) => `${(m.item_code || m.item_name || "").toString().toLowerCase()}|${(m.batch_no || "").toString().toLowerCase()}`;

      // add dataset first
      for (const m of dataset) {
        map.set(keyFor(m), { ...m });
      }
      // then local overrides/additions
      for (const m of localMeds) {
        map.set(keyFor(m), { ...m, // local may override dataset
          id: m.id || `local-${Math.random()}`,
          item_code: m.item_code || m.item_name || "",
        });
      }
      // finally remote (highest priority)
      for (const m of remoteMeds) {
        map.set(keyFor(m), { ...m, id: String(m.id) });
      }

      const mergedMeds = Array.from(map.values());

      // 4) Compute totals
      const totalMedicines = mergedMeds.length;
      const lowStockCount = mergedMeds.filter((m:any) => Number(m.quantity || 0) < 10).length;

      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const expiringCount = mergedMeds.reduce((acc:any, m:any) => {
        if (!m.expiry_date) return acc;
        const exp = new Date(m.expiry_date);
        if (isNaN(exp.getTime())) return acc;
        const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return acc + (diff >= 0 && diff <= 30 ? 1 : 0);
      }, 0);

      // 5) Today's sales: remote + local manual sales
      const todayStr = today.toISOString().split("T")[0];
      let todaySalesTotal = 0;
      try {
        const { data: remoteSales, error } = await supabase
          .from("sales")
          .select("invoice_date,total_amount");
        if (!error && remoteSales) {
          const remoteToday = (remoteSales || []).filter((s:any) => {
            const d = (s.invoice_date || s.created_at || "").split("T")[0];
            return d === todayStr;
          });
          todaySalesTotal += remoteToday.reduce((sum:any, s:any) => sum + Number(s.total_amount || 0), 0);
        }
      } catch (err) {
        console.warn("Failed to fetch remote sales for dashboard:", err);
      }

      // include local sales
      const localSalesRecords = loadLocalSales(); // each record { sale, items }
      const localTodayTotal = localSalesRecords.reduce((acc:any, rec:any) => {
        const date = (rec.sale?.created_at || rec.sale?.invoice_date || "").split("T")[0];
        if (date === todayStr) return acc + Number(rec.sale?.total_amount || 0);
        return acc;
      }, 0);
      todaySalesTotal += localTodayTotal;

      setStats({
        totalMedicines,
        lowStockCount,
        expiringCount,
        todaySales: todaySalesTotal,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Medicines",
      value: stats.totalMedicines,
      icon: Pill,
      color: "text-primary",
      bgColor: "bg-primary/10",
      action: () => navigate("/inventory"),
    },
    {
      title: "Low Stock Alert",
      value: stats.lowStockCount,
      icon: AlertTriangle,
      color: "text-warning",
      bgColor: "bg-warning/10",
      action: () => navigate("/alerts"),
    },
    {
      title: "Expiring Soon",
      value: stats.expiringCount,
      icon: Calendar,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      action: () => navigate("/alerts"),
    },
    {
      title: "Today's Sales",
      value: `₹${stats.todaySales.toFixed(2)}`,
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10",
      action: () => navigate("/reports"),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Smart Pharmacy POS
            </h1>
            <p className="text-muted-foreground mt-2">
              Complete pharmacy management & inventory system
            </p>
          </div>
          <Button 
            onClick={() => navigate("/pos")} 
            size="lg"
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            New Sale
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <Card
              key={index}
              className="cursor-pointer transition-all hover:shadow-xl hover:scale-105 border-none bg-gradient-to-br from-card to-card/50"
              onClick={stat.action}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${stat.color}`}>
                  {loading ? "..." : stat.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none bg-gradient-to-br from-card to-card/50 hover:shadow-xl transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                POS Billing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Create new invoices and process customer billing
              </p>
              <Button onClick={() => navigate("/pos")} className="w-full" variant="outline">
                Go to POS
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none bg-gradient-to-br from-card to-card/50 hover:shadow-xl transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-accent" />
                Inventory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Manage medicines, add stock, and update inventory
              </p>
              <Button onClick={() => navigate("/inventory")} className="w-full" variant="outline">
                Manage Inventory
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none bg-gradient-to-br from-card to-card/50 hover:shadow-xl transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-success" />
                Suppliers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                View and manage supplier information
              </p>
              <Button onClick={() => navigate("/suppliers")} className="w-full" variant="outline">
                View Suppliers
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
