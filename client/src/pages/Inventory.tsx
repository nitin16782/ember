import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Package } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Inventory() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: items, isLoading } = trpc.inventory.list.useQuery({});
  const utils = trpc.useUtils();

  const createItem = trpc.inventory.create.useMutation({
    onSuccess: () => { utils.inventory.list.invalidate(); setDialogOpen(false); toast.success("Item added"); },
    onError: (err: any) => toast.error(err.message),
  });

  const [form, setForm] = useState({ propertyId: 0, name: "", category: "", unit: "pcs", quantity: 1, condition: "good" as const });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy">Inventory</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Track supplies and assets across properties</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-navy text-white hover:bg-navy/90"><Plus className="h-4 w-4 mr-2" />Add Item</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display text-navy">Add Inventory Item</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2"><Label>Item Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Property ID *</Label><Input type="number" value={form.propertyId || ""} onChange={(e) => setForm({ ...form, propertyId: Number(e.target.value) })} /></div>
                <div className="space-y-2"><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Cleaning" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2"><Label>Qty</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></div>
                <div className="space-y-2"><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Condition</Label>
                  <Select value={form.condition} onValueChange={(v: any) => setForm({ ...form, condition: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                      <SelectItem value="damaged">Damaged</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={() => { if (!form.name || !form.propertyId) { toast.error("Name and property required"); return; } createItem.mutate({ propertyId: form.propertyId, name: form.name, category: form.category || undefined, quantity: form.quantity, unit: form.unit || undefined, condition: form.condition }); }} className="w-full bg-navy text-white hover:bg-navy/90" disabled={createItem.isPending}>
                {createItem.isPending ? "Adding..." : "Add Item"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="space-y-2">
        {items?.map((item) => (
          <Card key={item.id} className="border-border/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-teal-50 flex items-center justify-center"><Package className="h-4 w-4 text-teal-600" /></div>
                <div>
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.category || "Uncategorized"} · {item.quantity ?? 0} {item.unit || "pcs"}</p>
                </div>
              </div>
              <Badge className={item.condition === "damaged" || item.condition === "poor" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}>
                {item.condition || "good"}
              </Badge>
            </CardContent>
          </Card>
        ))}
        {!isLoading && (!items || items.length === 0) && (
          <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><Package className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No inventory items yet</p></CardContent></Card>
        )}
      </div>
    </div>
  );
}
