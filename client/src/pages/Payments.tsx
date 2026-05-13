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
import { Plus, IndianRupee, List, ArrowUpDown, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  initiated: "bg-gray-100 text-gray-600",
  captured: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  reconciled: "bg-blue-100 text-blue-700",
  refunded: "bg-orange-100 text-orange-700",
};

const mockReconciliation = [
  { id: 1, invoiceNo: "INV-2026-001", invoiceAmt: 85000, paidAmt: 85000, status: "matched", date: "May 5, 2026" },
  { id: 2, invoiceNo: "INV-2026-002", invoiceAmt: 120000, paidAmt: 100000, status: "partial", date: "May 8, 2026" },
  { id: 3, invoiceNo: "INV-2026-003", invoiceAmt: 65000, paidAmt: 0, status: "unmatched", date: "—" },
  { id: 4, invoiceNo: "INV-2026-004", invoiceAmt: 95000, paidAmt: 95000, status: "matched", date: "May 12, 2026" },
];

export default function Payments() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: paymentList, isLoading } = trpc.payments.list.useQuery({});
  const utils = trpc.useUtils();

  const recordPayment = trpc.payments.create.useMutation({
    onSuccess: () => { utils.payments.list.invalidate(); setDialogOpen(false); toast.success("Payment recorded"); },
    onError: (err: any) => toast.error(err.message),
  });

  const [form, setForm] = useState({ invoiceId: 0, amount: 0, method: "upi_direct" as "cashfree" | "bank_transfer" | "cheque" | "upi_direct" | "adjustment", bankReference: "" });

  const totalCollected = paymentList?.reduce((s: number, p: any) => s + Number(p.amount || 0), 0) || 0;
  const capturedCount = paymentList?.filter((p: any) => p.status === "captured").length || 0;
  const reconciledCount = paymentList?.filter((p: any) => p.status === "reconciled").length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy">Payments & Reconciliation</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Track collections, record payments, and reconcile with invoices</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button className="bg-navy text-white hover:bg-navy/90"><Plus className="h-4 w-4 mr-2" />Record Payment</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display text-navy">Record Payment</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2"><Label>Invoice ID *</Label><Input type="number" value={form.invoiceId || ""} onChange={(e) => setForm({ ...form, invoiceId: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Amount (₹) *</Label><Input type="number" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Method</Label>
                <Select value={form.method} onValueChange={(v: string) => setForm({ ...form, method: v as typeof form.method })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="upi_direct">UPI</SelectItem><SelectItem value="bank_transfer">Bank Transfer</SelectItem><SelectItem value="cashfree">Cashfree</SelectItem><SelectItem value="cheque">Cheque</SelectItem><SelectItem value="adjustment">Adjustment</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Bank Reference</Label><Input value={form.bankReference} onChange={(e) => setForm({ ...form, bankReference: e.target.value })} placeholder="UTR / Transaction ID" /></div>
              <Button onClick={() => { if (!form.invoiceId || !form.amount) { toast.error("Fill required fields"); return; } recordPayment.mutate({ invoiceId: form.invoiceId, amount: String(form.amount), method: form.method as "cashfree" | "bank_transfer" | "cheque" | "upi_direct" | "adjustment", bankReference: form.bankReference || undefined }); }} className="w-full bg-navy text-white hover:bg-navy/90" disabled={recordPayment.isPending}>
                {recordPayment.isPending ? "Recording..." : "Record Payment"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Collected</p><p className="text-2xl font-semibold text-navy mt-1">₹{(totalCollected / 100000).toFixed(1)}L</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Captured</p><p className="text-2xl font-semibold text-green-600 mt-1">{capturedCount}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reconciled</p><p className="text-2xl font-semibold text-blue-600 mt-1">{reconciledCount}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending Match</p><p className="text-2xl font-semibold text-gold mt-1">{mockReconciliation.filter(r => r.status !== "matched").length}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList className="bg-cream border border-border/50">
          <TabsTrigger value="list"><List className="h-4 w-4 mr-1.5" />Payments</TabsTrigger>
          <TabsTrigger value="reconciliation"><ArrowUpDown className="h-4 w-4 mr-1.5" />Reconciliation</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-2">
          {paymentList?.map((p: any) => (
            <Card key={p.id} className="border-border/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center"><IndianRupee className="h-4 w-4 text-green-600" /></div>
                  <div>
                    <p className="font-medium text-sm flex items-center"><IndianRupee className="h-3.5 w-3.5" />{Number(p.amount).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Invoice #{p.invoiceId} · {p.method || "—"} · {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {p.bankReference && <Badge variant="outline" className="text-xs">{p.bankReference}</Badge>}
                  <Badge className={statusColors[p.status] || "bg-gray-100 text-gray-600"}>{p.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {!isLoading && (!paymentList || paymentList.length === 0) && (
            <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><IndianRupee className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No payments recorded</p></CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="reconciliation">
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-sm font-medium text-navy">Invoice-Payment Reconciliation</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-cream/50">
                  <TableHead className="text-xs">Invoice</TableHead><TableHead className="text-xs text-right">Invoice Amt</TableHead><TableHead className="text-xs text-right">Paid Amt</TableHead><TableHead className="text-xs text-right">Difference</TableHead><TableHead className="text-xs text-center">Status</TableHead><TableHead className="text-xs">Date</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {mockReconciliation.map(r => (
                    <TableRow key={r.id} className="text-sm">
                      <TableCell className="font-medium">{r.invoiceNo}</TableCell>
                      <TableCell className="text-right">₹{r.invoiceAmt.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{r.paidAmt > 0 ? `₹${r.paidAmt.toLocaleString()}` : "—"}</TableCell>
                      <TableCell className="text-right">{r.invoiceAmt - r.paidAmt > 0 ? <span className="text-red-600">₹{(r.invoiceAmt - r.paidAmt).toLocaleString()}</span> : <span className="text-green-600">₹0</span>}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={r.status === "matched" ? "bg-green-100 text-green-700" : r.status === "partial" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}>
                          {r.status === "matched" ? <><CheckCircle2 className="h-3 w-3 mr-1" />Matched</> : r.status === "partial" ? <><Clock className="h-3 w-3 mr-1" />Partial</> : <><AlertCircle className="h-3 w-3 mr-1" />Unmatched</>}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.date}</TableCell>
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
