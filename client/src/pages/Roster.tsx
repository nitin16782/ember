import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Calendar, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  transferred: "bg-blue-100 text-blue-700",
  ended: "bg-gray-100 text-gray-500",
};

export default function Roster() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: assignments, isLoading } = trpc.assignments.list.useQuery({});
  const utils = trpc.useUtils();

  const createAssignment = trpc.assignments.create.useMutation({
    onSuccess: () => { utils.assignments.list.invalidate(); setDialogOpen(false); toast.success("Assignment created"); },
    onError: (err: any) => toast.error(err.message),
  });

  const [form, setForm] = useState({ personId: "", propertyId: "", roleCode: "", startDate: "" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy">Assignment Roster</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Staff-to-property assignments and coverage</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-navy text-white hover:bg-navy/90"><Plus className="h-4 w-4 mr-2" />Assign</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display text-navy">New Assignment</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Person ID</Label><Input type="number" value={form.personId} onChange={(e) => setForm({ ...form, personId: e.target.value })} /></div>
                <div className="space-y-2"><Label>Property ID</Label><Input type="number" value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Role Code</Label><Input value={form.roleCode} onChange={(e) => setForm({ ...form, roleCode: e.target.value })} placeholder="e.g. housekeeping" /></div>
              <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
              <Button onClick={() => { if (!form.personId || !form.propertyId) { toast.error("Person and property required"); return; } createAssignment.mutate({ personId: Number(form.personId), propertyId: Number(form.propertyId), roleCode: form.roleCode || "general", startDate: form.startDate || new Date().toISOString().split('T')[0] }); }} className="w-full bg-navy text-white hover:bg-navy/90" disabled={createAssignment.isPending}>
                {createAssignment.isPending ? "Assigning..." : "Create Assignment"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {assignments?.map((a: any) => (
          <Card key={a.id} className="border-border/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-navy/5 flex items-center justify-center"><Calendar className="h-4 w-4 text-navy" /></div>
                <div>
                  <p className="font-medium text-sm">Person #{a.personId} → Property #{a.propertyId}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.roleCode || "No role"} · From {a.startDate ? String(a.startDate) : "—"}</p>
                </div>
              </div>
              <Badge className={statusColors[a.status] || "bg-gray-100 text-gray-600"}>{a.status}</Badge>
            </CardContent>
          </Card>
        ))}
        {!isLoading && (!assignments || assignments.length === 0) && (
          <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No assignments yet</p></CardContent></Card>
        )}
      </div>
    </div>
  );
}
