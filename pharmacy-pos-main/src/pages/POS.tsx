import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Plus, Trash2, ShoppingCart } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Medicine {
  id: string;
  item_code: string;
  item_name: string;
  batch_no: string;
  quantity: number;
  sale_rate: number;
  mrp: number;
  cgst_per?: number;
  sgst_per?: number;
  source?: "remote" | "local" | "dataset";
}

interface CartItem extends Medicine {
  cartQuantity: number;
  cartKey?: string;
}

const USER_MED_KEY = "user_medicines";
const POS_CART_KEY = "pos_cart";
const LOCAL_SALES_KEY = "local_sales";
const GLOBAL_CGST_PER = 2.5;
const GLOBAL_SGST_PER = 2.5;

const POS = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  // phoneDigits holds only the 10 digits after +91
  const [phoneDigits, setPhoneDigits] = useState("");
  const [loading, setLoading] = useState(false);

  // Load cart from localStorage on mount
  const loadSavedCart = (): CartItem[] => {
    try {
      const raw = localStorage.getItem(POS_CART_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as CartItem[];
      return parsed.map((c) => ({
        ...c,
        cartQuantity: Number(c.cartQuantity || 1),
        cartKey: c.cartKey ?? `${c.id}|${c.batch_no || ""}`,
      }));
    } catch {
      return [];
    }
  };

  // Save cart
  const saveCart = (arr: CartItem[]) => {
    try {
      // ensure cartKey persisted
      const normalized = arr.map((c) => ({ ...c, cartKey: c.cartKey ?? `${c.id}|${c.batch_no || ""}` }));
      localStorage.setItem(POS_CART_KEY, JSON.stringify(normalized));
    } catch {}
  };

  // Initialize cart from storage
  useEffect(() => {
    setCart(loadSavedCart());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist cart on changes
  useEffect(() => {
    saveCart(cart);
  }, [cart]);
   
  // load local user medicines from Inventory (localStorage)
  const loadLocalMeds = (): Medicine[] => {
    try {
      const raw = localStorage.getItem(USER_MED_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Medicine[];
      // local meds might not have cgst/sgst — default to 0
      return parsed.map((m) => ({
        ...m,
        cgst_per: (m as any).cgst_per ?? 0,
        sgst_per: (m as any).sgst_per ?? 0,
      }));
    } catch {
      return [];
    }
  };

  // load dataset (cleaned_medicine_data.json) and map to Medicine shape
  const loadDatasetMeds = async (): Promise<Medicine[]> => {
    try {
      const res = await fetch("/cleaned_medicine_data.json");
      const json = await res.json();
      return (json as any[]).map((row, idx) => ({
        id: `ds-${idx}`,
        item_code: String(row["ItemCode"] || ""),
        item_name: String(row["ItemName"] || ""),
        batch_no: String(row["BatchNo"] || ""),
        quantity: Number(row["InvQty"]) || 0,
        sale_rate: Number(row["SaleRate"]) || 0,
        mrp: Number(row["ItemMRP"]) || 0,
        cgst_per: 0,
        sgst_per: 0,
        source: "dataset",
      })) as Medicine[];
    } catch {
      return [];
    }
  };

  // Helper to merge and dedupe remote, local and dataset lists (priority: remote > local > dataset)
  const mergeAndDedupe = (remoteList: Medicine[], localList: Medicine[], datasetList: Medicine[]) => {
    const map = new Map<string, Medicine>();
    const keyFor = (m: Medicine) => `${(m.item_code || m.item_name || "").toString().toLowerCase()}|${(m.batch_no || "").toString().toLowerCase()}`;

    // add dataset first (lowest priority)
    datasetList.forEach((m) => {
      const k = keyFor(m);
      if (!map.has(k)) map.set(k, { ...m, source: m.source ?? "dataset" });
    });
    // then local (override dataset)
    localList.forEach((m) => {
      const k = keyFor(m);
      map.set(k, { ...map.get(k), ...m, source: m.source ?? "local" });
    });
    // finally remote (override local/dataset)
    remoteList.forEach((m) => {
      const k = keyFor(m);
      map.set(k, { ...map.get(k), ...m, source: m.source ?? "remote" });
    });

    const merged = Array.from(map.values());
    // Ensure every dataset row is also present (append any dataset entries omitted by dedupe)
    const mergedIds = new Set(merged.map((m) => m.id));
    const extras = datasetList.filter((d) => !mergedIds.has(d.id)).map(d => ({ ...d, source: d.source ?? "dataset" }));
    return [...merged, ...extras];
  };

  const searchMedicines = async () => {
    if (!searchTerm.trim()) {
      setMedicines([]);
      return;
    }

    setLoading(true);
    try {
      // search local inventory first
      const localAll = loadLocalMeds();
      const term = searchTerm.toLowerCase();
      const localMatches = localAll.filter(
        (m) =>
          (m.item_name || "").toLowerCase().includes(term) ||
          (m.item_code || "").toLowerCase().includes(term)
      );

      // search dataset
      const datasetAll = await loadDatasetMeds();
      const datasetMatches = datasetAll.filter(
        (m) =>
          (m.item_name || "").toLowerCase().includes(term) ||
          (m.item_code || "").toLowerCase().includes(term)
      ).map(m => ({ ...m, source: "dataset" as const }));

      // search db (try, but do not discard localMatches if db fails or returns empty)
      let dbList: Medicine[] = [];
      try {
        const { data, error } = await supabase
          .from("medicines")
          .select("*")
          .or(`item_name.ilike.%${searchTerm}%,item_code.ilike.%${searchTerm}%`)
          .limit(50);

        if (error) throw error;
        dbList = (data || []).map((row: any) => ({
          id: String(row.id),
          item_code: row.item_code || "",
          item_name: row.item_name || "",
          batch_no: row.batch_no || "",
          quantity: Number(row.quantity) || 0,
          sale_rate: Number(row.sale_rate) || 0,
          mrp: Number(row.mrp) || 0,
          cgst_per: Number(row.cgst_per) || 0,
          sgst_per: Number(row.sgst_per) || 0,
          source: "remote"
         })) as Medicine[];
      } catch (dbErr) {
        console.warn("Supabase search failed, falling back to local/dataset matches", dbErr);
        // keep dbList empty so merge will fall back to localMatches + datasetMatches
      }

      // merge remote (dbList), localMatches and datasetMatches with priority remote>local>dataset
      const merged = mergeAndDedupe(dbList, localMatches.map(m => ({ ...m, source: m.source ?? "local" })), datasetMatches);

      // If merged is empty but localMatches exist, show localMatches
      if (merged.length === 0 && localMatches.length > 0) {
        setMedicines(localMatches);
      } else {
        // ensure unique keys for rendering, keep dataset entries too
        setMedicines(merged);
      }
    } catch (error) {
      console.error("Error searching medicines:", error);
      toast.error("Failed to search medicines");
      // fallback: try to at least show local matches
      const localAll = loadLocalMeds();
      const term = searchTerm.toLowerCase();
      const localMatches = localAll.filter(
        (m) =>
          (m.item_name || "").toLowerCase().includes(term) ||
          (m.item_code || "").toLowerCase().includes(term)
      );
      setMedicines(localMatches);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (medicine: Medicine) => {
    // build cartKey to identify a unique batch/item (include item_code to avoid collisions)
    const cartKey = `${medicine.id}|${medicine.batch_no || ""}|${medicine.item_code || ""}`;

    // check inventory availability from authoritative source (local first then DB)
    const localAll = loadLocalMeds();
    const localMatch = localAll.find((m) => m.id === medicine.id || (m as any).original_id === medicine.id);

    // For dataset items we allow adding even if dataset reports 0:
    const available = localMatch
      ? localMatch.quantity
      : (medicine.source === "dataset"
          ? (medicine.quantity && medicine.quantity > 0 ? medicine.quantity : 9999) // treat dataset as available
          : medicine.quantity);

    const existing = cart.find((item) => item.cartKey === cartKey);
    const currentQty = existing ? existing.cartQuantity : 0;
    if (currentQty + 1 > available) {
      toast.error("Insufficient stock");
      return;
    }

    if (existing) {
      const updated = cart.map((item) => item.cartKey === cartKey ? { ...item, cartQuantity: item.cartQuantity + 1 } : item);
      setCart(updated);
    } else {
      // add new cart item (preserve batch_no so multiple batches can be separate)
      setCart([...cart, { ...medicine, cartQuantity: 1, cartKey }]);
    }
    toast.success("Added to cart");
  };

  const removeFromCart = (cartKey?: string) => {
    if (!cartKey) return;
    setCart(cart.filter((item) => item.cartKey !== cartKey));
  };

  const updateQuantity = (cartKey: string | undefined, quantity: number) => {
    if (!cartKey || quantity < 1) return;
    // find cart item
    const cartItem = cart.find((c) => c.cartKey === cartKey);
    if (!cartItem) return;
    // find available qty in authoritative inventory
    const localAll = loadLocalMeds();
    const localMatch = localAll.find((m) => m.id === cartItem.id || (m as any).original_id === cartItem.id);
    const available = localMatch
      ? localMatch.quantity
      : (cartItem.source === "dataset" ? (cartItem.quantity && cartItem.quantity > 0 ? cartItem.quantity : 9999) : cartItem?.quantity ?? 0);
    if (quantity > available) {
      toast.error("Quantity exceeds stock");
      return;
    }
    setCart(cart.map((item) => (item.cartKey === cartKey ? { ...item, cartQuantity: quantity } : item)));
  };

  // fetch authoritative inventory item (localStorage first, dataset next, otherwise supabase)
  const fetchInventoryItem = async (id: string): Promise<Medicine | null> => {
    const localAll = loadLocalMeds();
    const local = localAll.find((m) => m.id === id || (m as any).original_id === id);
    if (local) return local;

    // dataset check (ids prefixed with 'ds-')
    if (id.startsWith("ds-")) {
      const datasetAll = await loadDatasetMeds();
      const ds = datasetAll.find((d) => d.id === id);
      if (ds) return ds;
    } else {
      // also try to find matching dataset by original id if numeric string
      const datasetAll = await loadDatasetMeds();
      const dsByCode = datasetAll.find((d) => (d.item_code || "") === id || d.id === id);
      if (dsByCode) return dsByCode;
    }

    try {
      const { data, error } = await supabase.from("medicines").select("*").eq("id", id).single();
      if (error || !data) return null;
      return {
        id: String(data.id),
        item_code: data.item_code || "",
        item_name: data.item_name || "",
        batch_no: data.batch_no || "",
        quantity: Number(data.quantity) || 0,
        sale_rate: Number(data.sale_rate) || 0,
        mrp: Number(data.mrp) || 0,
        cgst_per: Number(data.cgst_per) || 0,
        sgst_per: Number(data.sgst_per) || 0,
      };
    } catch {
      return null;
    }
  };

  const isPhoneValid = phoneDigits.length === 10;
  const formattedPhone = `+91${phoneDigits}`;

  const generateInvoice = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    if (!customerName.trim()) {
      toast.error("Please enter customer name");
      return;
    }
    if (!isPhoneValid) {
      toast.error("Enter valid phone: +91XXXXXXXXXX");
      return;
    }

    setLoading(true);
    try {
      // Validate stock and compute subtotal + fixed CGST/SGST (2.5% each)
      let subtotal = 0;
      let cgstTotal = 0;
      let sgstTotal = 0;

      const authoritativeItems: { inv: Medicine; cartQty: number; cartKey?: string; lineNet?: number }[] = [];

      for (const c of cart) {
        const inv = await fetchInventoryItem(c.id);
        if (!inv) {
          throw new Error(`Inventory item not found: ${c.item_name}`);
        }
        // For dataset items, skip strict stock validation (dataset can't be updated server-side).
        if (inv.source !== "dataset" && Number(inv.quantity || 0) < c.cartQuantity) {
          throw new Error(`Insufficient stock for ${inv.item_name}`);
        }
        const lineNet = inv.sale_rate * c.cartQuantity;
        subtotal += lineNet;
        authoritativeItems.push({ inv, cartQty: c.cartQuantity, cartKey: c.cartKey, lineNet });
      }

      // apply fixed taxes
      cgstTotal = +(subtotal * (GLOBAL_CGST_PER / 100));
      sgstTotal = +(subtotal * (GLOBAL_SGST_PER / 100));
      const total = +(subtotal + cgstTotal + sgstTotal);

      // All validated — create sale in DB, but be resilient if Supabase fails
      const invoiceNo = `INV${Date.now()}`;

      let sale: any = null;
      let saleError: any = null;
      try {
        const res = await supabase
          .from("sales")
          .insert({
            invoice_no: invoiceNo,
            customer_name: customerName,
            customer_phone: formattedPhone,
            total_amount: +(subtotal + cgstTotal + sgstTotal),
            cgst_total: cgstTotal,
            sgst_total: sgstTotal,
          })
          .select()
          .single();
        sale = res.data;
        saleError = res.error;
        if (saleError) throw saleError;
      } catch (err) {
        console.warn("Supabase sale insert failed, falling back to local save:", err);
        sale = null;
      }

      // If sale created on server: use server flow; else use local fallback
      if (sale) {
        // server flow (existing)
        for (const ai of authoritativeItems) {
          const inv = ai.inv;
          const qty = ai.cartQty;
          const lineNet = ai.lineNet ?? inv.sale_rate * qty;
          // allocate tax per-line proportional to lineNet/subtotal
          const lineCgst = subtotal > 0 ? (lineNet / subtotal) * cgstTotal : lineNet * (GLOBAL_CGST_PER / 100);
          const lineSgst = subtotal > 0 ? (lineNet / subtotal) * sgstTotal : lineNet * (GLOBAL_SGST_PER / 100);

          await supabase.from("sale_items").insert({
            sale_id: sale.id,
            medicine_id: inv.id,
            quantity: qty,
            sale_rate: inv.sale_rate,
            mrp: inv.mrp,
            cgst_amount: Number(lineCgst.toFixed(2)),
            sgst_amount: Number(lineSgst.toFixed(2)),
            total_amount: Number(lineNet.toFixed(2)),
            cgst_per: GLOBAL_CGST_PER,
            sgst_per: GLOBAL_SGST_PER,
          });

          // update inventory: local or DB
          const isLocal = String(inv.id).startsWith("local-");
          // Treat dataset items like remote items that need local overrides (cannot update dataset file)
          if (isLocal || inv.source === "dataset") {
            const userMeds = loadLocalMeds();
            const idx = userMeds.findIndex((m) => m.id === inv.id || (m as any).original_id === inv.id);
            if (idx >= 0) {
              userMeds[idx].quantity = Math.max(0, userMeds[idx].quantity - qty);
              localStorage.setItem(USER_MED_KEY, JSON.stringify(userMeds));
            }
          } else {
            await supabase.from("medicines").update({ quantity: inv.quantity - qty }).eq("id", inv.id);
          }
        }

        toast.success("Invoice generated successfully!");
        printInvoice(invoiceNo, { ...sale, cgst_total: cgstTotal, sgst_total: sgstTotal, total_amount: +(subtotal + cgstTotal + sgstTotal), customer_name: customerName, customer_phone: formattedPhone }, cart);
      } else {
        // Local fallback: create a local sale record and update inventory locally (including creating overrides for remote meds)
        const localSale = {
          id: `local-sale-${Date.now()}`,
          invoice_no: invoiceNo,
          customer_name: customerName,
          customer_phone: formattedPhone,
          total_amount: +(subtotal + cgstTotal + sgstTotal),
          cgst_total: cgstTotal,
          sgst_total: sgstTotal,
          created_at: new Date().toISOString(),
        };

        // persist sale items locally
        const localSalesRaw = localStorage.getItem(LOCAL_SALES_KEY);
        const localSales = localSalesRaw ? JSON.parse(localSalesRaw) : [];
        localSales.push({
          sale: localSale,
          items: authoritativeItems.map((ai) => {
            const lineNet = ai.lineNet ?? ai.inv.sale_rate * ai.cartQty;
            const lineCgst = subtotal > 0 ? (lineNet / subtotal) * cgstTotal : lineNet * (GLOBAL_CGST_PER / 100);
            const lineSgst = subtotal > 0 ? (lineNet / subtotal) * sgstTotal : lineNet * (GLOBAL_SGST_PER / 100);
            return { medicine: ai.inv, qty: ai.cartQty, cgst_amount: Number(lineCgst.toFixed(2)), sgst_amount: Number(lineSgst.toFixed(2)), total_amount: Number(lineNet.toFixed(2)) };
          }),
        });
        localStorage.setItem(LOCAL_SALES_KEY, JSON.stringify(localSales));

        // update inventory locally: for remote items create local override entries (original_id) and adjust quantities
        const userMeds = loadLocalMeds();
        for (const ai of authoritativeItems) {
          const inv = ai.inv;
          const qty = ai.cartQty;
          if (String(inv.id).startsWith("local-")) {
            const idx = userMeds.findIndex((m) => m.id === inv.id || (m as any).original_id === inv.id);
            if (idx >= 0) {
              userMeds[idx].quantity = Math.max(0, userMeds[idx].quantity - qty);
            }
          } else {
            // create or update an override entry for this remote medicine
            const idx = userMeds.findIndex((m) => (m as any).original_id === inv.id);
            if (idx >= 0) {
              userMeds[idx].quantity = Math.max(0, userMeds[idx].quantity - qty);
            } else {
              const override: any = {
                id: `local-${inv.id}`,
                original_id: inv.id,
                item_code: (inv as any).item_code || "",
                item_name: inv.item_name,
                batch_no: inv.batch_no,
                quantity: Math.max(0, inv.quantity - qty),
                sale_rate: inv.sale_rate,
                mrp: inv.mrp,
                cgst_per: GLOBAL_CGST_PER,
                sgst_per: GLOBAL_SGST_PER,
                manufacturer: (inv as any).manufacturer ?? ""
              };
              userMeds.push(override);
            }
          }
        }
        localStorage.setItem(USER_MED_KEY, JSON.stringify(userMeds));

        toast.success("Invoice saved locally (offline mode).");
        printInvoice(localSale.invoice_no, localSale, cart);
      }

      // Reset cart & customer
      setCart([]);
      setCustomerName("");
      setPhoneDigits("");
      setMedicines([]);
      setSearchTerm("");
    } catch (error: any) {
      console.error("Error generating invoice:", error);
      toast.error(error?.message || "Failed to generate invoice");
    } finally {
      setLoading(false);
    }
  };

  const printInvoice = (invoiceNo: string, sale: any, cartSnapshot: CartItem[]) => {
    const printWindow = window.open("", "", "height=600,width=800");
    if (!printWindow) return;

    const rowsHtml = (cartSnapshot || [])
      .map(
        (item) => `
        <tr>
          <td>${item.item_name}</td>
          <td>${item.batch_no || "-"}</td>
          <td style="text-align:right">${item.cartQuantity}</td>
          <td style="text-align:right">₹${Number(item.sale_rate || 0).toFixed(2)}</td>
          <td style="text-align:right">₹${(Number(item.sale_rate || 0) * Number(item.cartQuantity || 0)).toFixed(2)}</td>
        </tr>
      `
      )
      .join("");

    const cgst = Number(sale?.cgst_total || 0).toFixed(2);
    const sgst = Number(sale?.sgst_total || 0).toFixed(2);
    const total = Number(sale?.total_amount || 0).toFixed(2);
    const customerName = sale?.customer_name || "";
    const customerPhone = sale?.customer_phone || "";

    const invoiceHTML = `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Invoice ${invoiceNo}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #222; }
          .header { text-align: center; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin: 12px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; }
          th { background-color: #f7f7f7; text-align: left; }
          .right { text-align: right; }
          .total { font-weight: bold; font-size: 16px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Smart Pharmacy</h2>
          <div>Invoice: ${invoiceNo}</div>
          <div>Date: ${new Date().toLocaleString()}</div>
          <div>Customer: ${customerName} ${customerPhone ? `(${customerPhone})` : ""}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Batch</th>
              <th class="right">Qty</th>
              <th class="right">Rate</th>
              <th class="right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="margin-top:12px;">
          <div style="display:flex;justify-content:space-between;">
            <div>CGST:</div>
            <div>₹${cgst}</div>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <div>SGST:</div>
            <div>₹${sgst}</div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:8px;" class="total">
            <div>Total:</div>
            <div>₹${total}</div>
          </div>
        </div>

        <script>
          window.print();
          // don't auto-close to allow user to check print dialog behaviour; close if desired:
          // window.close();
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
  };

  // compute provisional totals from cart (used in UI)
  const cartSubtotal = cart.reduce((s, it) => s + (Number(it.sale_rate || 0) * Number(it.cartQuantity || 0)), 0);
  const cartCgst = +(cartSubtotal * (GLOBAL_CGST_PER / 100));
  const cartSgst = +(cartSubtotal * (GLOBAL_SGST_PER / 100));
  const cartTotal = +(cartSubtotal + cartCgst + cartSgst);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-6">
      <div className="container mx-auto space-y-6">
        {/* Search & Add Section */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Search Medicine</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Search by name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && searchMedicines()}
                />
                <Button onClick={searchMedicines} disabled={loading}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              {medicines.length > 0 && (
                <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                  {medicines.map((medicine) => (
                    <div
                      key={medicine.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/50"
                    >
                      <div>
                        <p className="font-medium">{medicine.item_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {medicine.batch_no} | Stock: {medicine.quantity} | ₹{medicine.sale_rate.toFixed(2)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addToCart(medicine)}
                        // allow dataset entries to be added even when dataset quantity is 0
                        disabled={medicine.source !== "dataset" && (Number(medicine.quantity || 0) < 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cart Card */}
          <Card>
            <CardHeader>
              <CardTitle>Cart Items</CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Cart is empty</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((item) => (
                      <TableRow key={item.cartKey}>
                        <TableCell>{item.item_name}</TableCell>
                        <TableCell>₹{item.sale_rate.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.cartKey, item.cartQuantity - 1)}
                              disabled={item.cartQuantity <= 1}
                            >
                              -
                            </Button>
                            <span>{item.cartQuantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.cartKey, item.cartQuantity + 1)}
                              disabled={item.source !== "dataset" && item.cartQuantity >= (item.quantity || 0)}
                            >
                              +
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>₹{(item.sale_rate * item.cartQuantity).toFixed(2)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.cartKey)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Customer & Invoice Section */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Customer Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    placeholder="Customer name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-3 py-2 border border-r-0 rounded-l-md bg-muted/20">+91</span>
                    <Input
                      placeholder="Enter 10 digits"
                      value={phoneDigits}
                      onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      maxLength={10}
                      inputMode="numeric"
                      className="rounded-l-none"
                    />
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {phoneDigits.length === 10 ? "Phone valid" : "Enter 10 digits only"}
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={generateInvoice}
                  disabled={loading || cart.length === 0 || !customerName.trim() || !isPhoneValid}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Generate Invoice
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bill Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items:</span>
                  <span>{cart.length}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>₹{cartSubtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">CGST ({GLOBAL_CGST_PER}%):</span>
                  <span>₹{cartCgst.toFixed(2)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">SGST ({GLOBAL_SGST_PER}%):</span>
                  <span>₹{cartSgst.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary">₹{cartTotal.toFixed(2)}</span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={generateInvoice}
                disabled={loading || cart.length === 0 || !customerName.trim() || !isPhoneValid}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Generate Invoice
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default POS;