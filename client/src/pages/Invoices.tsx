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
import { Plus, FileBarChart, IndianRupee, List, BarChart3, Receipt } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  issued: "bg-blue-100 text-blue-700",
  partially_paid: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const mockGSTSummary = {
  totalBase: 850000,
  cgst: 76500,
  sgst: 76500,
  igst: 0,
  totalWithGST: 1003000,
  gstRate: 18,
};

const mockRevenueSummary = [
  { month: "Jan 2026", invoiced: 320000, collected: 300000, outstanding: 20000 },
  { month: "Feb 2026", invoiced: 280000, collected: 280000, outstanding: 0 },
  { month: "Mar 2026", invoiced: 350000, collected: 310000, outstanding: 40000 },
  { month: "Apr 2026", invoiced: 400000, collected: 350000, outstanding: 50000 },
  { month: "May 2026", invoiced: 250000, collected: 180000, outstanding: 70000 },
];

export default function Invoices() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryInput = useMemo(() => ({ status: statusFilter !== "all" ? statusFilter : undefined, limit: 50 }), [statusFilter]);
  const { data: invoiceList, isLoading } = trpc.invoices.list.useQuery(queryInput);
  const utils = trpc.useUtils();

  const createInvoice = trpc.invoices.create.useMutation({
    onSuccess: () => { utils.invoices.list.invalidate(); setDialogOpen(false); toast.success("Invoice created"); },
    onError: (err: any) => toast.error(err.message),
  });

  const [form, setForm] = useState({ propertyId: "", ownerId: "", invoiceNo: "", monthCovered: "", totalAmount: 0, gstAmount: 0, dueDate: "" });

  const totalInvoiced = invoiceList?.reduce((s: number, i: any) => s + Number(i.totalAmount || 0), 0) || 0;
  const paidCount = invoiceList?.filter((i: any) => i.status === "paid").length || 0;
  const overdueCount = invoiceList?.filter((i: any) => i.status === "overdue").length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy">Invoices</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Billing, GST compliance, and revenue tracking</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button className="bg-navy text-white hover:bg-navy/90"><Plus className="h-4 w-4 mr-2" />Create Invoice</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display text-navy">Create Invoice</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Property ID *</Label><Input value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })} /></div>
                <div className="space-y-2"><Label>Owner ID *</Label><Input value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Invoice No *</Label><Input value={form.invoiceNo} onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })} placeholder="INV-2026-001" /></div>
              <div className="space-y-2"><Label>Month Covered *</Label><Input value={form.monthCovered} onChange={(e) => setForm({ ...form, monthCovered: e.target.value })} placeholder="May 2026" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Base Amount (₹)</Label><Input type="number" value={form.totalAmount || ""} onChange={(e) => { const base = Number(e.target.value); setForm({ ...form, totalAmount: base, gstAmount: Math.round(base * 0.18) }); }} /></div>
                <div className="space-y-2"><Label>GST @18% (₹)</Label><Input type="number" value={form.gstAmount} readOnly className="bg-cream/50" /></div>
              </div>
              <div className="space-y-2"><Label>Due Date *</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
              <div className="p-3 rounded-lg bg-cream/50 border border-border/30 text-sm">
                <p className="font-medium">Total: ₹{(form.totalAmount + form.gstAmount).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Base ₹{form.totalAmount.toLocaleString()} + GST ₹{form.gstAmount.toLocaleString()}</p>
              </div>
              <Button onClick={() => { if (!form.propertyId || !form.ownerId || !form.invoiceNo || !form.monthCovered || !form.dueDate) { toast.error("Fill all required fields"); return; } createInvoice.mutate({ propertyId: form.propertyId, ownerId: form.ownerId, invoiceNo: form.invoiceNo, invoiceDate: new Date().toISOString().split('T')[0], monthCovered: form.monthCovered, totalAmount: String(form.totalAmount + form.gstAmount), dueDate: form.dueDate }); }} className="w-full bg-navy text-white hover:bg-navy/90" disabled={createInvoice.isPending}>
                {createInvoice.isPending ? "Creating..." : "Create Invoice"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Invoiced</p><p className="text-2xl font-semibold text-navy mt-1">₹{(totalInvoiced / 100000).toFixed(1)}L</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Paid</p><p className="text-2xl font-semibold text-green-600 mt-1">{paidCount}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overdue</p><p className="text-2xl font-semibold text-red-600 mt-1">{overdueCount}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">GST Collected</p><p className="text-2xl font-semibold text-gold mt-1">₹{(mockGSTSummary.cgst + mockGSTSummary.sgst).toLocaleString()}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList className="bg-cream border border-border/50">
          <TabsTrigger value="list"><List className="h-4 w-4 mr-1.5" />Invoices</TabsTrigger>
          <TabsTrigger value="gst"><Receipt className="h-4 w-4 mr-1.5" />GST Summary</TabsTrigger>
          <TabsTrigger value="revenue"><BarChart3 className="h-4 w-4 mr-1.5" />Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Filter" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="issued">Issued</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="overdue">Overdue</SelectItem></SelectContent>
          </Select>
          <div className="space-y-2">
            {invoiceList?.map((inv: any) => (
              <Card key={inv.id} className="border-border/50">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center"><FileBarChart className="h-4 w-4 text-blue-600" /></div>
                    <div>
                      <p className="font-medium text-sm">{inv.invoiceNo}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{inv.monthCovered} · Due {String(inv.dueDate)}{inv.gstAmount ? ` · GST ₹${Number(inv.gstAmount).toLocaleString()}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm flex items-center"><IndianRupee className="h-3.5 w-3.5" />{Number(inv.totalAmount).toLocaleString()}</span>
                    <Badge className={statusColors[inv.status]}>{inv.status.replace("_", " ")}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!isLoading && (!invoiceList || invoiceList.length === 0) && (
              <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><FileBarChart className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No invoices yet</p></CardContent></Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="gst">
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-sm font-medium text-navy">GST Summary — Current Period</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-cream/50 border border-border/30">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Base Amount</p>
                  <p className="text-xl font-semibold text-navy mt-1">₹{mockGSTSummary.totalBase.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-lg bg-cream/50 border border-border/30">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Total with GST</p>
                  <p className="text-xl font-semibold text-navy mt-1">₹{mockGSTSummary.totalWithGST.toLocaleString()}</p>
                </div>
              </div>
              <Table>
                <TableBody>
                  <TableRow><TableCell className="font-medium">CGST @{mockGSTSummary.gstRate / 2}%</TableCell><TableCell className="text-right">₹{mockGSTSummary.cgst.toLocaleString()}</TableCell></TableRow>
                  <TableRow><TableCell className="font-medium">SGST @{mockGSTSummary.gstRate / 2}%</TableCell><TableCell className="text-right">₹{mockGSTSummary.sgst.toLocaleString()}</TableCell></TableRow>
                  <TableRow><TableCell className="font-medium">IGST</TableCell><TableCell className="text-right">₹{mockGSTSummary.igst.toLocaleString()}</TableCell></TableRow>
                  <TableRow className="font-semibold"><TableCell>Total GST</TableCell><TableCell className="text-right">₹{(mockGSTSummary.cgst + mockGSTSummary.sgst + mockGSTSummary.igst).toLocaleString()}</TableCell></TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue">
          <Card className="border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-cream/50">
                  <TableHead className="text-xs">Month</TableHead>
                  <TableHead className="text-xs text-right">Invoiced</TableHead>
                  <TableHead className="text-xs text-right">Collected</TableHead>
                  <TableHead className="text-xs text-right">Outstanding</TableHead>
                  <TableHead className="text-xs text-right">Collection %</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {mockRevenueSummary.map(r => (
                    <TableRow key={r.month} className="text-sm">
                      <TableCell className="font-medium">{r.month}</TableCell>
                      <TableCell className="text-right">₹{(r.invoiced / 1000).toFixed(0)}K</TableCell>
                      <TableCell className="text-right text-green-600">₹{(r.collected / 1000).toFixed(0)}K</TableCell>
                      <TableCell className="text-right text-red-600">{r.outstanding > 0 ? `₹${(r.outstanding / 1000).toFixed(0)}K` : "—"}</TableCell>
                      <TableCell className="text-right"><Badge className={r.collected / r.invoiced >= 0.95 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>{Math.round((r.collected / r.invoiced) * 100)}%</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
