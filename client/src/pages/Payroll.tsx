import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  processing: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  paid: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function Payroll() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: runs, isLoading } = trpc.payroll.runs.useQuery({});
  const utils = trpc.useUtils();

  const createRun = trpc.payroll.createRun.useMutation({
    onSuccess: () => { utils.payroll.runs.invalidate(); setDialogOpen(false); toast.success("Payroll run created"); },
    onError: (err) => toast.error(err.message),
  });

  const [form, setForm] = useState({ cycleMonth: "", entity: "" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy">Payroll</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Pay runs, deductions, and salary management</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-navy text-white hover:bg-navy/90"><Plus className="h-4 w-4 mr-2" />New Pay Run</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display text-navy">New Payroll Run</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Cycle Month *</Label>
                <Input type="month" value={form.cycleMonth} onChange={(e) => setForm({ ...form, cycleMonth: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Entity</Label>
                <Input value={form.entity} onChange={(e) => setForm({ ...form, entity: e.target.value })} placeholder="e.g. Pinch Lifestyle" />
              </div>
              <Button onClick={() => { if (!form.cycleMonth) { toast.error("Month required"); return; } createRun.mutate(form); }} className="w-full bg-navy text-white hover:bg-navy/90" disabled={createRun.isPending}>
                {createRun.isPending ? "Creating..." : "Create Pay Run"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {runs?.map((run) => (
          <Card key={run.id} className="border-border/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">{run.cycleMonth}</p>
                  <p className="text-xs text-muted-foreground">{run.entity || "All entities"} · Created {run.createdAt ? new Date(run.createdAt).toLocaleDateString() : ""}</p>
                </div>
              </div>
              <Badge className={statusColors[run.status]}>{run.status}</Badge>
            </CardContent>
          </Card>
        ))}
        {!isLoading && (!runs || runs.length === 0) && (
          <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><Wallet className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No payroll runs yet</p></CardContent></Card>
        )}
      </div>
    </div>
  );
}
