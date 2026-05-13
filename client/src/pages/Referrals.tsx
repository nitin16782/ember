import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Gift, Users, IndianRupee, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-700" },
  converted: { label: "Converted", color: "bg-green-100 text-green-700" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700" },
  withdrawn: { label: "Withdrawn", color: "bg-gray-100 text-gray-600" },
};

export default function Referrals() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: referrals, isLoading } = trpc.referrals.list.useQuery({});
  const [form, setForm] = useState({ referrerPersonId: "", candidateName: "", candidatePhone: "", notes: "" });
  const utils = trpc.useUtils();
  const createReferral = trpc.referrals.create.useMutation({
    onSuccess: () => { utils.referrals.list.invalidate(); setDialogOpen(false); setForm({ referrerPersonId: "", candidateName: "", candidatePhone: "", notes: "" }); toast.success("Referral submitted"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy">Referrals</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Retention-tied bounty tracking for associate referrals</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-navy text-white hover:bg-navy/90"><Plus className="h-4 w-4 mr-2" />Submit Referral</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display text-navy">Submit a Referral</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2"><Label>Referrer Person ID *</Label><Input type="number" value={form.referrerPersonId} onChange={(e) => setForm({ ...form, referrerPersonId: e.target.value })} /></div>
              <div className="space-y-2"><Label>Candidate Name *</Label><Input value={form.candidateName} onChange={(e) => setForm({ ...form, candidateName: e.target.value })} /></div>
              <div className="space-y-2"><Label>Candidate Phone *</Label><Input value={form.candidatePhone} onChange={(e) => setForm({ ...form, candidatePhone: e.target.value })} placeholder="+91..." /></div>
              <div className="space-y-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" /></div>
              <Button onClick={() => createReferral.mutate({ referrerPersonId: form.referrerPersonId, candidateName: form.candidateName, candidatePhone: form.candidatePhone, notes: form.notes || undefined })} disabled={!form.referrerPersonId || !form.candidateName || !form.candidatePhone || createReferral.isPending} className="w-full bg-navy text-white hover:bg-navy/90">{createReferral.isPending ? "Submitting..." : "Submit Referral"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50 bg-gold/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2"><Gift className="h-4 w-4 text-gold" /><span className="text-sm font-medium text-navy">Bounty Structure</span></div>
          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-gold/10 flex items-center justify-center"><IndianRupee className="h-3 w-3 text-gold" /></span>
              <div><p className="font-medium text-foreground">Tranche 1 — 30 Days</p><p>50% of bounty paid after 30-day retention</p></div>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-gold/10 flex items-center justify-center"><IndianRupee className="h-3 w-3 text-gold" /></span>
              <div><p className="font-medium text-foreground">Tranche 2 — 90 Days</p><p>Remaining 50% paid after 90-day retention</p></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {referrals?.map((ref: any) => {
          const config = statusConfig[ref.status] || statusConfig.pending;
          return (
            <Card key={ref.id} className="border-border/50 hover:shadow-sm transition-shadow cursor-pointer" onClick={() => toast.info(`Opening referral #${ref.id}`)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-gold/10 flex items-center justify-center"><Users className="h-4 w-4 text-gold" /></div>
                  <div>
                    <p className="font-medium text-sm">{ref.candidateName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Phone: {ref.candidatePhone} · Referrer #{ref.referrerPersonId}
                      {ref.bountyAmount ? ` · Bounty: ₹${Number(ref.bountyAmount).toLocaleString()}` : ""}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {ref.tranche1PaidAt && <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />T1 Paid</span>}
                      {ref.tranche2PaidAt && <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />T2 Paid</span>}
                    </div>
                  </div>
                </div>
                <Badge className={config.color}>{config.label}</Badge>
              </CardContent>
            </Card>
          );
        })}
        {!isLoading && (!referrals || referrals.length === 0) && (
          <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><Gift className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No referrals yet</p><p className="text-xs text-muted-foreground mt-1">Associates can submit referrals for bounty rewards</p></CardContent></Card>
        )}
      </div>
    </div>
  );
}
