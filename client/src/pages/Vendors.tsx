import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Store, Wrench, Phone, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Vendors() {
  const [vendorDialog, setVendorDialog] = useState(false);
  const { data: vendorList, isLoading } = trpc.vendors.list.useQuery({});
  const { data: workOrderList } = trpc.vendors.workOrders.useQuery({});
  const utils = trpc.useUtils();

  const createVendor = trpc.vendors.create.useMutation({
    onSuccess: () => { utils.vendors.list.invalidate(); setVendorDialog(false); toast.success("Vendor added"); },
    onError: (err) => toast.error(err.message),
  });

  const [form, setForm] = useState({ name: "", category: "", contactName: "", phone: "", email: "" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy">Vendors & Work Orders</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage vendor relationships and work orders</p>
        </div>
      </div>

      <Tabs defaultValue="vendors" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="work-orders">Work Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="vendors" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={vendorDialog} onOpenChange={setVendorDialog}>
              <DialogTrigger asChild>
                <Button className="bg-navy text-white hover:bg-navy/90"><Plus className="h-4 w-4 mr-2" />Add Vendor</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display text-navy">Add Vendor</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Plumbing, Electrical" /></div>
                  <div className="space-y-2"><Label>Contact Person</Label><Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  </div>
                  <Button onClick={() => { if (!form.name) { toast.error("Name required"); return; } createVendor.mutate({ name: form.name, category: form.category || undefined, contactName: form.contactName || undefined, phone: form.phone || undefined, email: form.email || undefined }); }} className="w-full bg-navy text-white hover:bg-navy/90" disabled={createVendor.isPending}>
                    {createVendor.isPending ? "Adding..." : "Add Vendor"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-2">
            {vendorList?.map((v) => (
              <Card key={v.id} className="border-border/50">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center"><Store className="h-4 w-4 text-purple-600" /></div>
                    <div>
                      <p className="font-medium text-sm">{v.name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        {v.category && <span>{v.category}</span>}
                        {v.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{v.phone}</span>}
                      </div>
                    </div>
                  </div>
                  <Badge className={v.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>{v.status}</Badge>
                </CardContent>
              </Card>
            ))}
            {!isLoading && (!vendorList || vendorList.length === 0) && (
              <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><Store className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No vendors yet</p></CardContent></Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="work-orders" className="space-y-2">
          {workOrderList?.map((wo) => (
            <Card key={wo.id} className="border-border/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center"><Wrench className="h-4 w-4 text-blue-600" /></div>
                  <div>
                    <p className="font-medium text-sm">{wo.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{wo.quotedAmount ? `₹${Number(wo.quotedAmount).toLocaleString()}` : "No quote"}</p>
                  </div>
                </div>
                <Badge className={wo.status === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>{wo.status}</Badge>
              </CardContent>
            </Card>
          ))}
          {(!workOrderList || workOrderList.length === 0) && (
            <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><Wrench className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No work orders yet</p></CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
