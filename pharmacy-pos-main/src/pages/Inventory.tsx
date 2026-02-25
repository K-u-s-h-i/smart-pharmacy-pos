import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  item_code?: string;
  item_name: string;
  batch_no: string;
  expiry_date: string;
  quantity: number;
  sale_rate: number;
  mrp: number;
  manufacturer: string; // for manual entry this will be digits-only string
  original_id?: string; // optional, used when an edited item overrides a JSON row
}

const USER_MED_KEY = "user_medicines";
const DELETED_KEY = "deleted_medicines";

const Inventory = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [formData, setFormData] = useState({
    item_code: "",
    item_name: "",
    batch_no: "",
    expiry_date: "",
    quantity: 0,
    sale_rate: 0,
    mrp: 0,
    manufacturer: ""
  });

  // Helpers for localStorage
  const loadUserMeds = (): Medicine[] => {
    try {
      const raw = localStorage.getItem(USER_MED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const saveUserMeds = (arr: Medicine[]) => {
    localStorage.setItem(USER_MED_KEY, JSON.stringify(arr));
  };

  const loadDeletedIds = (): string[] => {
    try {
      const raw = localStorage.getItem(DELETED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const saveDeletedIds = (arr: string[]) => {
    localStorage.setItem(DELETED_KEY, JSON.stringify(arr));
  };

  // Format/parse currency inputs
  // Always display two decimals (default .00). Parse currency allowing up to 2 decimal places.
  const formatRupee = (val: number) => `₹${Number(val || 0).toFixed(2)}`;

  const parseCurrency = (input: string) => {
    // remove any non-digit/dot chars (including ₹, spaces, commas)
    let s = (input || "").replace(/[^0-9.]/g, "");
    if (s === "") return 0;
    // allow only one dot
    const parts = s.split(".");
    const intPart = parts[0] || "0";
    const decPart = parts[1] ? parts.slice(1).join("").slice(0, 2) : "";
    const normalized = decPart ? `${intPart}.${decPart}` : intPart;
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  };

  useEffect(() => {
    fetchJSONMedicines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mergeWithUserMeds = (baseMapped: Medicine[]) => {
    const userMeds = loadUserMeds();
    const deletedIds = loadDeletedIds();

    // Filter out deleted base rows
    let baseFiltered = baseMapped.filter((b) => !deletedIds.includes(b.id));

    // Replace base rows by user edited versions (userMed.original_id === base.id)
    const replacedBase = baseFiltered.map((base) => {
      const replacement = userMeds.find((u) => u.original_id === base.id);
      return replacement ? { ...replacement } : base;
    });

    // Include user-added medicines (those without original_id)
    const userAdded = userMeds.filter((u) => !u.original_id);

    const merged = [...replacedBase, ...userAdded];

    // sort optionally by name
    merged.sort((a, b) => a.item_name.localeCompare(b.item_name));
    return merged;
  };

  const fetchJSONMedicines = async () => {
    try {
      const response = await fetch("/cleaned_medicine_data.json");
      const json = await response.json();
      const mapped = (json as any[]).map((row, idx) => ({
        id: String(idx),
        item_code: row["ItemCode"] || "",
        item_name: row["ItemName"] || "",
        batch_no: row["BatchNo"] || "",
        expiry_date: row["ExpDate"] || "",
        quantity: Number(row["InvQty"]) || 0,
        sale_rate: Number(row["SaleRate"]) || 0,
        mrp: Number(row["ItemMRP"]) || 0,
        manufacturer: String(row["MfgComp"] || "")
      })) as Medicine[];

      const merged = mergeWithUserMeds(mapped);
      setMedicines(merged);
    } catch (error) {
      console.error("Error loading JSON:", error);
      toast.error("Failed to load medicines from JSON");
    }
  };

  const applyAndPersist = (updatedUserMeds: Medicine[], deletedIds: string[]) => {
    saveUserMeds(updatedUserMeds);
    saveDeletedIds(deletedIds);
    // Re-fetch/merge base data and apply user changes
    // If the initial JSON is already loaded into state, we can merge directly:
    // But safest to re-run fetchJSONMedicines (it reads localStorage)
    fetchJSONMedicines();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const userMeds = loadUserMeds();
    const deletedIds = loadDeletedIds();

    // Build medicine object to store (ensure numeric fields)
    let resultMed: Medicine;

    if (!editingMedicine) {
      // New medicine: local id
      resultMed = {
        id: `local-${Date.now()}`,
        item_code: formData.item_code,
        item_name: formData.item_name,
        batch_no: formData.batch_no,
        expiry_date: formData.expiry_date,
        quantity: Number(formData.quantity),
        sale_rate: Number(formData.sale_rate),
        mrp: Number(formData.mrp),
        manufacturer: formData.manufacturer
      };
      userMeds.push(resultMed);
    } else {
      // Editing existing displayed medicine
      const isLocal = editingMedicine.id.startsWith("local-");
      if (isLocal) {
        // update existing local/user medicine (match by id)
        resultMed = {
          ...editingMedicine,
          item_code: formData.item_code,
          item_name: formData.item_name,
          batch_no: formData.batch_no,
          expiry_date: formData.expiry_date,
          quantity: Number(formData.quantity),
          sale_rate: Number(formData.sale_rate),
          mrp: Number(formData.mrp),
          manufacturer: formData.manufacturer
        };
        const idx = userMeds.findIndex((m) => m.id === editingMedicine.id || m.original_id === editingMedicine.original_id);
        if (idx >= 0) userMeds[idx] = resultMed;
        else userMeds.push(resultMed);
      } else {
        // editing a base JSON row => create or update a local override with original_id
        resultMed = {
          id: `local-${editingMedicine.id}`,
          original_id: editingMedicine.id,
          item_code: formData.item_code,
          item_name: formData.item_name,
          batch_no: formData.batch_no,
          expiry_date: formData.expiry_date,
          quantity: Number(formData.quantity),
          sale_rate: Number(formData.sale_rate),
          mrp: Number(formData.mrp),
          manufacturer: formData.manufacturer
        };
        // replace if there is already a local override for this original_id
        const idx = userMeds.findIndex((m) => m.original_id === editingMedicine.id);
        if (idx >= 0) userMeds[idx] = resultMed;
        else userMeds.push(resultMed);
        // ensure original id not listed as deleted
        const delIdx = deletedIds.indexOf(editingMedicine.id);
        if (delIdx >= 0) deletedIds.splice(delIdx, 1);
      }
    }

    applyAndPersist(userMeds, loadDeletedIds());
    setIsDialogOpen(false);
    setEditingMedicine(null);
    resetForm();
    toast.success(editingMedicine ? "Medicine updated (saved locally)" : "Medicine added (saved locally)");
  };

  const handleEdit = (medicine: Medicine) => {
    setEditingMedicine(medicine);
    setFormData({
      item_code: medicine.item_code || "",
      item_name: medicine.item_name,
      batch_no: medicine.batch_no,
      expiry_date: medicine.expiry_date,
      quantity: medicine.quantity,
      sale_rate: Number(medicine.sale_rate) || 0,
      mrp: Number(medicine.mrp) || 0,
      manufacturer: medicine.manufacturer || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this medicine?")) return;

    const userMeds = loadUserMeds();
    let deletedIds = loadDeletedIds();

    if (id.startsWith("local-")) {
      // Remove local user medicine
      const idx = userMeds.findIndex((m) => m.id === id);
      if (idx >= 0) userMeds.splice(idx, 1);
      saveUserMeds(userMeds);
    } else {
      // Base JSON: add id to deletedIds and also remove any local override
      if (!deletedIds.includes(id)) deletedIds.push(id);
      const overrideIdx = userMeds.findIndex((m) => m.original_id === id);
      if (overrideIdx >= 0) userMeds.splice(overrideIdx, 1);
      saveUserMeds(userMeds);
      saveDeletedIds(deletedIds);
    }

    fetchJSONMedicines();
    toast.success("Medicine deleted (saved locally)");
  };

  const resetForm = () => {
    setFormData({
      item_code: "",
      item_name: "",
      batch_no: "",
      expiry_date: "",
      quantity: 0,
      sale_rate: 0,
      mrp: 0,
      manufacturer: ""
    });
  };

  const filteredMedicines = medicines.filter(medicine =>
    medicine.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    medicine.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    medicine.batch_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-6">
      <div className="container mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Medicine Inventory
          </h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingMedicine(null); resetForm(); }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Medicine
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingMedicine ? "Edit Medicine" : "Add New Medicine"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Item Code*</Label>
                    <Input
                      required
                      value={formData.item_code}
                      onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Item Name*</Label>
                    <Input
                      required
                      value={formData.item_name}
                      onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Batch No*</Label>
                    <Input
                      required
                      value={formData.batch_no}
                      onChange={(e) => setFormData({ ...formData, batch_no: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Expiry Date*</Label>
                    <Input
                      required
                      type="date"
                      value={formData.expiry_date}
                      onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Quantity*</Label>
                    <Input
                      required
                      type="text"
                      inputMode="numeric"
                      value={String(formData.quantity === 0 ? "" : formData.quantity)}
                      onChange={(e) => {
                        // allow only digits, remove leading zeros if user types multiple digits
                        const digits = e.target.value.replace(/\D/g, "");
                        const cleaned = digits.replace(/^0+(?=\d)/, "");
                        setFormData({ ...formData, quantity: cleaned === "" ? 0 : parseInt(cleaned, 10) });
                      }}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Sale Rate*</Label>
                    <Input
                      required
                      type="text"
                      value={formatRupee(Number(formData.sale_rate))}
                      onChange={(e) => {
                        const parsed = parseCurrency(e.target.value);
                        setFormData({ ...formData, sale_rate: parsed });
                      }}
                    />
                  </div>
                  <div>
                    <Label>MRP*</Label>
                    <Input
                      required
                      type="text"
                      value={formatRupee(Number(formData.mrp))}
                      onChange={(e) => {
                        const parsed = parseCurrency(e.target.value);
                        setFormData({ ...formData, mrp: parsed });
                      }}
                    />
                  </div>
                  <div>
                    <Label>Manufacturer*</Label>
                    <Input
                      required
                      value={formData.manufacturer}
                      onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value.replace(/\D/g, "") })}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  {editingMedicine ? "Update Medicine" : "Add Medicine"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Search Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, manufacturer, or batch..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Medicines ({filteredMedicines.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Batch No</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>MRP</TableHead>
                    <TableHead>Sale Rate</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMedicines.map((medicine) => (
                    <TableRow key={medicine.id}>
                      <TableCell className="font-medium">{medicine.item_name}</TableCell>
                      <TableCell>{medicine.batch_no}</TableCell>
                      <TableCell>{medicine.manufacturer}</TableCell>
                      <TableCell>
                        <span className={medicine.quantity < 10 ? "text-destructive font-semibold" : ""}>
                          {medicine.quantity}
                        </span>
                      </TableCell>
                      <TableCell>₹{(Number(medicine.mrp) || 0).toFixed(2)}</TableCell>
                      <TableCell>₹{(Number(medicine.sale_rate) || 0).toFixed(2)}</TableCell>
                      <TableCell>{medicine.expiry_date ? new Date(medicine.expiry_date).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(medicine)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(medicine.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Inventory;