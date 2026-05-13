import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Package, AlertTriangle, History, ClipboardCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const mockReorderAlerts = [
  { item: "Cleaning Solution (500ml)", property: "Villa Serenity", current: 2, minimum: 5, status: "critical" },
  { item: "Toilet Paper (rolls)", property: "Ocean View Apt", current: 8, minimum: 10, status: "low" },
  { item: "Hand Towels", property: "Mountain Lodge", current: 3, minimum: 10, status: "critical" },
  { item: "Light Bulbs (LED)", property: "City Center Hotel", current: 4, minimum: 6, status: "low" },
];

const mockAuditLog = [
  { id: 1, item: "Cleaning Solution", action: "stock_out", qty: -5, by: "Rahul Sharma", date: "2026-05-12", note: "Monthly cleaning supply" },
  { id: 2, item: "Bed Sheets (Queen)", action: "stock_in", qty: 20, by: "Priya Patel", date: "2026-05-11", note: "New purchase from vendor" },
  { id: 3, item: "Light Bulbs", action: "stock_out", qty: -3, by: "Amit Kumar", date: "2026-05-10", note: "Replacement at Villa 3" },
  { id: 4, item: "Hand Towels", action: "audit_adjust", qty: -2, by: "Sunita Devi", date: "2026-05-09", note: "Physical count mismatch" },
  { id: 5, item: "Toilet Paper", action: "stock_in", qty: 50, by: "Vikram Singh", date: "2026-05-08", note: "Bulk order received" },
];

export default function Inventory() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: items, isLoading } = trpc.inventory.list.useQuery({});
  const utils = trpc.useUtils();

  const createItem = trpc.inventory.create.useMutation({
    onSuccess: () => { utils.inventory.list.invalidate(); setDialogOpen(false); toast.success("Item added"); },
    onError: (err: any) => toast.error(err.message),
  });

  const [form, setForm] = useState({ propertyId: "", name: "", category: "", unit: "pcs", quantity: 1, condition: "good" as const });
  const totalItems = items?.length || 0;
  const damagedItems = items?.filter((i: any) => i.condition === "damaged" || i.condition === "poor").length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy">Inventory & Assets</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Stock tracking, reorder alerts, and audit trail</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button className="bg-navy text-white hover:bg-navy/90"><Plus className="h-4 w-4 mr-2" />Add Item</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display text-navy">Add Inventory Item</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2"><Label>Item Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Property ID *</Label><Input value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })} /></div>
                <div className="space-y-2"><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Cleaning" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2"><Label>Qty</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></div>
                <div className="space-y-2"><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
                <div className="space-y-2"><Label>Condition</Label>
                  <Select value={form.condition} onValueChange={(v: any) => setForm({ ...form, condition: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="good">Good</SelectItem><SelectItem value="fair">Fair</SelectItem><SelectItem value="poor">Poor</SelectItem><SelectItem value="damaged">Damaged</SelectItem></SelectContent>
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Items</p><p className="text-2xl font-semibold text-navy mt-1">{totalItems}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reorder Alerts</p><p className="text-2xl font-semibold text-red-600 mt-1">{mockReorderAlerts.filter(a => a.status === "critical").length}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Damaged/Poor</p><p className="text-2xl font-semibold text-yellow-600 mt-1">{damagedItems}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Movements Today</p><p className="text-2xl font-semibold text-navy mt-1">3</p></CardContent></Card>
      </div>

      <Tabs defaultValue="items" className="space-y-4">
        <TabsList className="bg-cream border border-border/50">
          <TabsTrigger value="items"><Package className="h-4 w-4 mr-1.5" />Items</TabsTrigger>
          <TabsTrigger value="alerts"><AlertTriangle className="h-4 w-4 mr-1.5" />Reorder Alerts</TabsTrigger>
          <TabsTrigger value="audit"><History className="h-4 w-4 mr-1.5" />Stock Movements</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-2">
          {items?.map((item: any) => (
            <Card key={item.id} className="border-border/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-teal-50 flex items-center justify-center"><Package className="h-4 w-4 text-teal-600" /></div>
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.category || "Uncategorized"} · {item.quantity ?? 0} {item.unit || "pcs"} · Property #{item.propertyId}</p>
                  </div>
                </div>
                <Badge className={item.condition === "damaged" || item.condition === "poor" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}>{item.condition || "good"}</Badge>
              </CardContent>
            </Card>
          ))}
          {!isLoading && (!items || items.length === 0) && (
            <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><Package className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No inventory items yet</p></CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="alerts">
          <Card className="border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-cream/50">
                  <TableHead className="text-xs">Item</TableHead>
                  <TableHead className="text-xs">Property</TableHead>
                  <TableHead className="text-xs text-center">Current</TableHead>
                  <TableHead className="text-xs text-center">Minimum</TableHead>
                  <TableHead className="text-xs text-center">Status</TableHead>
                  <TableHead className="text-xs text-center">Action</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {mockReorderAlerts.map((a, i) => (
                    <TableRow key={i} className="text-sm">
                      <TableCell className="font-medium">{a.item}</TableCell>
                      <TableCell className="text-muted-foreground">{a.property}</TableCell>
                      <TableCell className="text-center font-semibold text-red-600">{a.current}</TableCell>
                      <TableCell className="text-center">{a.minimum}</TableCell>
                      <TableCell className="text-center"><Badge className={a.status === "critical" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}>{a.status}</Badge></TableCell>
                      <TableCell className="text-center"><Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toast.info("Purchase order creation coming soon")}>Reorder</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-2">
          {mockAuditLog.map(entry => (
            <Card key={entry.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{entry.item}</p>
                      <Badge variant="outline" className={`text-[10px] ${entry.action === "stock_in" ? "text-green-600" : entry.action === "stock_out" ? "text-red-600" : "text-yellow-600"}`}>{entry.action.replace("_", " ")}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{entry.note}</p>
                    <p className="text-xs text-muted-foreground">By: {entry.by} · {entry.date}</p>
                  </div>
                  <span className={`text-sm font-semibold ${entry.qty > 0 ? "text-green-600" : "text-red-600"}`}>{entry.qty > 0 ? "+" : ""}{entry.qty}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
