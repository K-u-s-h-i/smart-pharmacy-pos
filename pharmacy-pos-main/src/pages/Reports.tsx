import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Package, Calendar } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface SalesReport {
  invoice_no: string;
  invoice_date: string;
  customer_name: string;
  total_amount: number;
}

const Reports = () => {
  const [todaySales, setTodaySales] = useState<SalesReport[]>([]);
  const [monthlySales, setMonthlySales] = useState<SalesReport[]>([]);
  const [todayTotal, setTodayTotal] = useState(0);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const loadLocalSales = () => {
    try {
      const raw = localStorage.getItem("local_sales");
      if (!raw) return [];
      return JSON.parse(raw) as any[]; // [{ sale: {...}, items: [...] }, ...]
    } catch {
      return [];
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      // fetch remote sales from supabase (best-effort)
      let remoteSales: any[] = [];
      try {
        const { data, error } = await supabase.from("sales").select("*");
        if (!error && data) remoteSales = data;
      } catch (err) {
        console.warn("Failed to fetch remote sales, falling back to local-only", err);
      }

      // local manual sales
      const localSalesRecords = loadLocalSales(); // array of { sale, items }

      // normalize into SalesReport[]
      const normalizeRemote = (r: any): SalesReport => ({
        invoice_no: r.invoice_no || String(r.id || ""),
        invoice_date: r.invoice_date || r.created_at || r.created_at || "",
        customer_name: r.customer_name || "Walk-in Customer",
        total_amount: Number(r.total_amount || 0),
      });

      const normalizeLocal = (rec: any): SalesReport => ({
        invoice_no: rec.sale?.invoice_no || rec.sale?.id || `local-${Date.now()}`,
        invoice_date: rec.sale?.created_at || rec.sale?.invoice_date || rec.sale?.created_at || "",
        customer_name: rec.sale?.customer_name || "Walk-in Customer",
        total_amount: Number(rec.sale?.total_amount || 0),
      });

      const allSales: SalesReport[] = [
        ...remoteSales.map(normalizeRemote),
        ...localSalesRecords.map(normalizeLocal),
      ];

      // compute today and monthly
      const todayStr = new Date().toISOString().split("T")[0];
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

      const todaySalesArr = allSales.filter(s => (s.invoice_date || "").split("T")[0] === todayStr);
      const monthlySalesArr = allSales.filter(s => (s.invoice_date || "").split("T")[0] >= firstDayOfMonth);

      setTodaySales(todaySalesArr);
      setTodayTotal(todaySalesArr.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0));
      setMonthlySales(monthlySalesArr);
      setMonthlyTotal(monthlySalesArr.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0));
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-6">
      <div className="container mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Sales Reports
          </h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-none bg-gradient-to-br from-card to-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Calendar className="h-5 w-5" />
                Today's Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">
                ₹{todayTotal.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {todaySales.length} transactions today
              </p>
            </CardContent>
          </Card>

          <Card className="border-none bg-gradient-to-br from-card to-accent/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-accent">
                <TrendingUp className="h-5 w-5" />
                Monthly Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-accent">
                ₹{monthlyTotal.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {monthlySales.length} transactions this month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Today's Sales Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today's Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : todaySales.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No sales today</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice No</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todaySales.map((sale) => (
                      <TableRow key={sale.invoice_no}>
                        <TableCell className="font-medium">{sale.invoice_no}</TableCell>
                        <TableCell>{sale.customer_name || 'Walk-in Customer'}</TableCell>
                        <TableCell>
                          {sale.invoice_date ? new Date(sale.invoice_date).toLocaleString() : "-"}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          ₹{Number(sale.total_amount).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Sales Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : monthlySales.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No sales this month</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice No</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlySales.map((sale) => (
                      <TableRow key={sale.invoice_no}>
                        <TableCell className="font-medium">{sale.invoice_no}</TableCell>
                        <TableCell>{sale.customer_name || 'Walk-in Customer'}</TableCell>
                        <TableCell>
                          {sale.invoice_date ? new Date(sale.invoice_date).toLocaleString() : "-"}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-accent">
                          ₹{Number(sale.total_amount).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;