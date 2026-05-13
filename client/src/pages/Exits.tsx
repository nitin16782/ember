import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, UserX, LogOut, AlertOctagon, FileCheck, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  initiated: { label: "Initiated", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700", icon: FileCheck },
  completed: { label: "Completed", color: "bg-green-100 text-green-700", icon: LogOut },
  reversed: { label: "Reversed", color: "bg-gray-100 text-gray-600", icon: AlertOctagon },
};

const exitTypeLabels: Record<string, string> = {
  resignation: "Resignation", termination: "Termination", absconding: "Absconding",
  contract_end: "Contract End", mutual: "Mutual Separation",
};

export default function Exits() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: exits, isLoading } = trpc.exits.list.useQuery({});
  const [form, setForm] = useState({ personId: "", exitType: "resignation", reason: "", lastWorkingDay: "" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy">Exit Management</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Full & final settlement, exit workflows, and absconding detection</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-navy text-white hover:bg-navy/90"><Plus className="h-4 w-4 mr-2" />Initiate Exit</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display text-navy">Initiate Exit</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2"><Label>Person ID *</Label><Input type="number" value={form.personId} onChange={(e) => setForm({ ...form, personId: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Exit Type *</Label>
                <Select value={form.exitType} onValueChange={(v) => setForm({ ...form, exitType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resignation">Resignation</SelectItem>
                    <SelectItem value="termination">Termination</SelectItem>
                    <SelectItem value="absconding">Absconding</SelectItem>
                    <SelectItem value="contract_end">Contract End</SelectItem>
                    <SelectItem value="mutual">Mutual Separation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Last Working Day</Label><Input type="date" value={form.lastWorkingDay} onChange={(e) => setForm({ ...form, lastWorkingDay: e.target.value })} /></div>
              <div className="space-y-2"><Label>Reason</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Reason for exit..." rows={3} /></div>
              <Button onClick={() => toast.info("Exit initiation coming soon — backend mutation ready")} className="w-full bg-navy text-white hover:bg-navy/90">Initiate Exit Process</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50 bg-navy/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2"><FileCheck className="h-4 w-4 text-navy" /><span className="text-sm font-medium text-navy">Full & Final Settlement Process</span></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><span className="h-5 w-5 rounded-full bg-navy/10 flex items-center justify-center text-[10px] font-medium text-navy">1</span>Exit Initiated</div>
            <div className="flex items-center gap-1.5"><span className="h-5 w-5 rounded-full bg-navy/10 flex items-center justify-center text-[10px] font-medium text-navy">2</span>Checklist Completed</div>
            <div className="flex items-center gap-1.5"><span className="h-5 w-5 rounded-full bg-navy/10 flex items-center justify-center text-[10px] font-medium text-navy">3</span>F&F Calculated</div>
            <div className="flex items-center gap-1.5"><span className="h-5 w-5 rounded-full bg-navy/10 flex items-center justify-center text-[10px] font-medium text-navy">4</span>Settlement Processed</div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {exits?.map((exit: any) => {
          const config = statusConfig[exit.status] || statusConfig.initiated;
          const Icon = config.icon;
          return (
            <Card key={exit.id} className="border-border/50 hover:shadow-sm transition-shadow cursor-pointer" onClick={() => toast.info(`Opening exit record #${exit.id}`)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${exit.exitType === "absconding" ? "bg-red-50" : "bg-navy/5"}`}>
                    {exit.exitType === "absconding" ? <AlertOctagon className="h-4 w-4 text-red-600" /> : <UserX className="h-4 w-4 text-navy" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">Person #{exit.personId} — {exitTypeLabels[exit.exitType] || exit.exitType}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">LWD: {exit.lastWorkingDay ? String(exit.lastWorkingDay) : "TBD"}{exit.ffAmount ? ` · F&F: ₹${Number(exit.ffAmount).toLocaleString()}` : ""}</p>
                    {exit.reason && <p className="text-xs text-muted-foreground mt-0.5 italic">"{exit.reason}"</p>}
                  </div>
                </div>
                <Badge className={config.color}><Icon className="h-3 w-3 mr-1" />{config.label}</Badge>
              </CardContent>
            </Card>
          );
        })}
        {!isLoading && (!exits || exits.length === 0) && (
          <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><UserX className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No exit records yet</p></CardContent></Card>
        )}
      </div>
    </div>
  );
}
