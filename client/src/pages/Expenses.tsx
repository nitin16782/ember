import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Receipt, Check, X, IndianRupee } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const approvalColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const categories = ["utility", "food", "maintenance", "consumables", "vendor", "staff", "other"] as const;

export default function Expenses() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const queryInput = useMemo(() => ({ status: statusFilter !== "all" ? statusFilter : undefined, limit: 50 }), [statusFilter]);
  const { data: expenseList, isLoading } = trpc.expenses.list.useQuery(queryInput);
  const utils = trpc.useUtils();

  const createExpense = trpc.expenses.create.useMutation({
    onSuccess: () => { utils.expenses.list.invalidate(); setDialogOpen(false); toast.success("Expense logged"); },
    onError: (err) => toast.error(err.message),
  });

  const approveExpense = trpc.expenses.approve.useMutation({
    onSuccess: () => { utils.expenses.list.invalidate(); toast.success("Expense approved"); },
  });

  const rejectExpense = trpc.expenses.reject.useMutation({
    onSuccess: () => { utils.expenses.list.invalidate(); toast.success("Expense rejected"); },
  });

  const [form, setForm] = useState({ amount: "", category: "utility" as typeof categories[number], description: "", incurredAt: new Date().toISOString().split("T")[0] });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy">Expenses</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Track and approve property expenses</p>
        </div>
        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Filter" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-navy text-white hover:bg-navy/90"><Plus className="h-4 w-4 mr-2" />Log Expense</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display text-navy">Log Expense</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Amount (₹) *</Label>
                  <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={form.incurredAt} onChange={(e) => setForm({ ...form, incurredAt: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What was this expense for?" />
                </div>
                <Button onClick={() => { if (!form.amount) { toast.error("Amount required"); return; } createExpense.mutate({ amount: form.amount, category: form.category, incurredAt: form.incurredAt, description: form.description || undefined }); }} className="w-full bg-navy text-white hover:bg-navy/90" disabled={createExpense.isPending}>
                  {createExpense.isPending ? "Logging..." : "Log Expense"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-2">
        {expenseList?.map((exp) => (
          <Card key={exp.id} className="border-border/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-orange-50 flex items-center justify-center">
                  <IndianRupee className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">₹{Number(exp.amount).toLocaleString()}</p>
                    <Badge variant="outline" className="text-[10px]">{exp.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{exp.description || "No description"} · {String(exp.incurredAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={approvalColors[exp.approvalStatus]}>{exp.approvalStatus}</Badge>
                {exp.approvalStatus === "pending" && (
                  <div className="flex gap-1 ml-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600 hover:bg-green-50" onClick={() => approveExpense.mutate({ id: exp.id })}><Check className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600 hover:bg-red-50" onClick={() => rejectExpense.mutate({ id: exp.id })}><X className="h-4 w-4" /></Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && (!expenseList || expenseList.length === 0) && (
          <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><Receipt className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No expenses recorded</p></CardContent></Card>
        )}
      </div>
    </div>
  );
}
