import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Store, Wrench, Phone, Ban, Star, IndianRupee } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const mockBlacklist = [
  { id: 1, name: "QuickFix Plumbing", reason: "Repeated no-shows and poor quality work", blacklistedDate: "2026-03-15", blacklistedBy: "Ops Manager" },
  { id: 2, name: "ABC Electricals", reason: "Safety violation during wiring work at Villa 12", blacklistedDate: "2026-04-02", blacklistedBy: "Area Manager" },
];

const mockRatings = [
  { vendorId: 1, name: "Metro Cleaning Services", avgRating: 4.5, totalJobs: 28, onTimeRate: 92, lastJob: "2026-05-10" },
  { vendorId: 2, name: "Sharma Electricals", avgRating: 4.2, totalJobs: 15, onTimeRate: 87, lastJob: "2026-05-08" },
  { vendorId: 3, name: "Green Gardens", avgRating: 3.8, totalJobs: 12, onTimeRate: 75, lastJob: "2026-05-05" },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`h-3 w-3 ${i <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
      ))}
      <span className="text-xs font-medium ml-1">{rating}</span>
    </div>
  );
}

export default function Vendors() {
  const [vendorDialog, setVendorDialog] = useState(false);
  const { data: vendorList, isLoading } = trpc.vendors.list.useQuery({});
  const { data: workOrderList } = trpc.vendors.workOrders.useQuery({});
  const utils = trpc.useUtils();

  const createVendor = trpc.vendors.create.useMutation({
    onSuccess: () => { utils.vendors.list.invalidate(); setVendorDialog(false); toast.success("Vendor added"); },
    onError: (err: any) => toast.error(err.message),
  });

  const [form, setForm] = useState({ name: "", category: "", contactName: "", phone: "", email: "" });
  const totalVendors = vendorList?.length || 0;
  const activeVendors = vendorList?.filter((v: any) => v.status === "active").length || 0;
  const totalWOs = workOrderList?.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy">Vendors & Work Orders</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Vendor management, work orders, ratings, and blacklist</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Vendors</p><p className="text-2xl font-semibold text-navy mt-1">{totalVendors}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active</p><p className="text-2xl font-semibold text-green-600 mt-1">{activeVendors}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Work Orders</p><p className="text-2xl font-semibold text-navy mt-1">{totalWOs}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Blacklisted</p><p className="text-2xl font-semibold text-red-600 mt-1">{mockBlacklist.length}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="vendors" className="space-y-4">
        <TabsList className="bg-cream border border-border/50 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="vendors"><Store className="h-4 w-4 mr-1.5" />Vendors</TabsTrigger>
          <TabsTrigger value="work-orders"><Wrench className="h-4 w-4 mr-1.5" />Work Orders</TabsTrigger>
          <TabsTrigger value="ratings"><Star className="h-4 w-4 mr-1.5" />Ratings</TabsTrigger>
          <TabsTrigger value="blacklist"><Ban className="h-4 w-4 mr-1.5" />Blacklist</TabsTrigger>
        </TabsList>

        <TabsContent value="vendors" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={vendorDialog} onOpenChange={setVendorDialog}>
              <DialogTrigger asChild><Button className="bg-navy text-white hover:bg-navy/90"><Plus className="h-4 w-4 mr-2" />Add Vendor</Button></DialogTrigger>
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
            {vendorList?.map((v: any) => (
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
                  <div className="flex items-center gap-2">
                    <Badge className={v.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>{v.status}</Badge>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500" onClick={() => toast.info(`Blacklist ${v.name}? Confirmation required.`)}><Ban className="h-3.5 w-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!isLoading && (!vendorList || vendorList.length === 0) && (
              <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><Store className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No vendors yet</p></CardContent></Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="work-orders" className="space-y-2">
          {workOrderList?.map((wo: any) => (
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

        <TabsContent value="ratings">
          <Card className="border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-cream/50">
                  <TableHead className="text-xs">Vendor</TableHead>
                  <TableHead className="text-xs">Rating</TableHead>
                  <TableHead className="text-xs text-center">Jobs</TableHead>
                  <TableHead className="text-xs text-center">On-Time %</TableHead>
                  <TableHead className="text-xs">Last Job</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {mockRatings.map(r => (
                    <TableRow key={r.vendorId} className="text-sm">
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell><StarRating rating={r.avgRating} /></TableCell>
                      <TableCell className="text-center">{r.totalJobs}</TableCell>
                      <TableCell className="text-center"><span className={r.onTimeRate >= 90 ? "text-green-600" : r.onTimeRate >= 80 ? "text-yellow-600" : "text-red-600"}>{r.onTimeRate}%</span></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.lastJob}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blacklist" className="space-y-2">
          {mockBlacklist.map(b => (
            <Card key={b.id} className="border-border/50 border-red-200/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2"><Ban className="h-4 w-4 text-red-500" /><p className="font-medium text-sm">{b.name}</p></div>
                    <p className="text-xs text-muted-foreground mt-1">{b.reason}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Blacklisted: {b.blacklistedDate} by {b.blacklistedBy}</p>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => toast.info("Reinstate vendor? This requires admin approval.")}>Reinstate</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
