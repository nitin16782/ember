import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Briefcase, Users, ChevronRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  filled: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const candidateStatusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  screening: "bg-purple-100 text-purple-700",
  interview: "bg-yellow-100 text-yellow-700",
  offered: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  joined: "bg-emerald-100 text-emerald-700",
};

export default function Hiring() {
  const [reqDialogOpen, setReqDialogOpen] = useState(false);
  const [candDialogOpen, setCandDialogOpen] = useState(false);
  const { data: requisitions, isLoading: reqLoading } = trpc.hiring.requisitions.useQuery({});
  const { data: candidates, isLoading: candLoading } = trpc.hiring.candidates.useQuery({});
  const utils = trpc.useUtils();

  const createReq = trpc.hiring.createRequisition.useMutation({
    onSuccess: () => { utils.hiring.requisitions.invalidate(); setReqDialogOpen(false); toast.success("Requisition created"); },
    onError: (err) => toast.error(err.message),
  });

  const createCand = trpc.hiring.createCandidate.useMutation({
    onSuccess: () => { utils.hiring.candidates.invalidate(); setCandDialogOpen(false); toast.success("Candidate added"); },
    onError: (err) => toast.error(err.message),
  });

  const [reqForm, setReqForm] = useState({ roleCode: "housekeeping" as const, headcount: 1, priority: "medium" as const });
  const [candForm, setCandForm] = useState({ fullName: "", phone: "", source: "direct" as const });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy">Hiring & ATS</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Requisitions and candidate pipeline</p>
        </div>
      </div>

      <Tabs defaultValue="requisitions" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="requisitions">Requisitions</TabsTrigger>
          <TabsTrigger value="candidates">Candidates</TabsTrigger>
        </TabsList>

        <TabsContent value="requisitions" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={reqDialogOpen} onOpenChange={setReqDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-navy text-white hover:bg-navy/90"><Plus className="h-4 w-4 mr-2" />New Requisition</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display text-navy">New Requisition</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={reqForm.roleCode} onValueChange={(v) => setReqForm({ ...reqForm, roleCode: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["housekeeping", "kitchen", "f_and_b", "maintenance", "security", "supervisor", "manager", "other"].map((r) => (
                          <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Headcount</Label>
                      <Input type="number" value={reqForm.headcount} onChange={(e) => setReqForm({ ...reqForm, headcount: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select value={reqForm.priority} onValueChange={(v) => setReqForm({ ...reqForm, priority: v as any })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["low", "medium", "high", "urgent"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={() => createReq.mutate(reqForm)} className="w-full bg-navy text-white hover:bg-navy/90" disabled={createReq.isPending}>
                    {createReq.isPending ? "Creating..." : "Create Requisition"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-2">
            {requisitions?.map((req) => (
              <Card key={req.id} className="border-border/50">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-navy/5 flex items-center justify-center">
                      <Briefcase className="h-4 w-4 text-navy" />
                    </div>
                    <div>
                      <p className="font-medium text-sm capitalize">{req.roleCode.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">{req.headcount} position{req.headcount > 1 ? "s" : ""} · {req.priority} priority</p>
                    </div>
                  </div>
                  <Badge className={statusColors[req.status]}>{req.status.replace("_", " ")}</Badge>
                </CardContent>
              </Card>
            ))}
            {!reqLoading && (!requisitions || requisitions.length === 0) && (
              <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><p className="text-sm text-muted-foreground">No requisitions yet</p></CardContent></Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="candidates" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={candDialogOpen} onOpenChange={setCandDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-navy text-white hover:bg-navy/90"><Plus className="h-4 w-4 mr-2" />Add Candidate</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display text-navy">Add Candidate</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Full Name *</Label>
                    <Input value={candForm.fullName} onChange={(e) => setCandForm({ ...candForm, fullName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={candForm.phone} onChange={(e) => setCandForm({ ...candForm, phone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Source</Label>
                    <Select value={candForm.source} onValueChange={(v) => setCandForm({ ...candForm, source: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["referral", "direct", "agency", "walk_in", "social_media"].map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => createCand.mutate({ fullName: candForm.fullName, phone: candForm.phone || undefined, source: candForm.source })} className="w-full bg-navy text-white hover:bg-navy/90" disabled={createCand.isPending}>
                    {createCand.isPending ? "Adding..." : "Add Candidate"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-2">
            {candidates?.map((c) => (
              <Card key={c.id} className="border-border/50">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-navy/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-navy">{c.fullName?.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{c.fullName}</p>
                      <p className="text-xs text-muted-foreground">{c.phone || "No phone"} · {c.source?.replace("_", " ")}</p>
                    </div>
                  </div>
                  <Badge className={candidateStatusColors[c.status] || ""}>{c.status}</Badge>
                </CardContent>
              </Card>
            ))}
            {!candLoading && (!candidates || candidates.length === 0) && (
              <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><p className="text-sm text-muted-foreground">No candidates yet</p></CardContent></Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
