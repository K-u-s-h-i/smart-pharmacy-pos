import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

interface Supplier {
  id: string;
  name: string;
  phone: string; // digits only, 10 chars
  email?: string;
  address?: string;
}

const SUPPLIERS_KEY = "suppliers";

const SuppliersPage = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    setSuppliers(loadSuppliers());
  }, []);

  const loadSuppliers = (): Supplier[] => {
    try {
      const raw = localStorage.getItem(SUPPLIERS_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as Supplier[];
    } catch {
      return [];
    }
  };

  const saveSuppliers = (list: Supplier[]) => {
    try {
      localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(list));
      setSuppliers(list);
    } catch (err) {
      console.error("Failed to save suppliers", err);
      toast.error("Failed to save suppliers");
    }
  };

  const resetForm = () => {
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
  };

  const addSupplier = () => {
    const trimmedName = name.trim();
    const digits = phone.replace(/\D/g, "").slice(0, 10);
    if (!trimmedName) {
      toast.error("Enter supplier name");
      return;
    }
    if (digits.length !== 10) {
      toast.error("Enter a 10-digit phone number");
      return;
    }
    const newSupplier: Supplier = {
      id: `supplier-${Date.now()}`,
      name: trimmedName,
      phone: digits,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
    };
    const next = [...loadSuppliers(), newSupplier];
    saveSuppliers(next);
    resetForm();
    toast.success("Supplier added");
  };

  const deleteSupplier = (id: string) => {
    if (!confirm("Delete this supplier?")) return;
    const next = loadSuppliers().filter(s => s.id !== id);
    saveSuppliers(next);
    toast.success("Supplier deleted");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-6">
      <div className="container mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Suppliers</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Add Supplier</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label>Phone (+91)</Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border bg-muted/10">+91</span>
                    <Input
                      className="rounded-l-none"
                      value={phone}
                      inputMode="numeric"
                      maxLength={10}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="10 digits"
                    />
                  </div>
                </div>
                <div>
                  <Label>Email (optional)</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label>Address (optional)</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
                <Button className="w-full" onClick={addSupplier}>
                  <Plus className="mr-2 h-4 w-4" /> Add Supplier
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Saved Suppliers</CardTitle>
            </CardHeader>
            <CardContent>
              {suppliers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No suppliers yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suppliers.map(s => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>+91{s.phone}</TableCell>
                          <TableCell>{s.email || "-"}</TableCell>
                          <TableCell>{s.address || "-"}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => {
                                try {
                                  navigator.clipboard?.writeText(`+91${s.phone}`);
                                  toast.success("Phone copied");
                                } catch {
                                  toast.error("Unable to copy");
                                }
                              }}>
                                Copy
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => deleteSupplier(s.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
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
    </div>
  );
};

export default SuppliersPage;
