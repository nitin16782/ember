import { trpc } from "@/lib/trpc";
import { QRCodeCanvas } from "@/components/QRCode";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, QrCode, Plus, CheckCircle2, XCircle, Clock, ShieldOff, Eye } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  active: { label: "Active", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  expired: { label: "Expired", color: "bg-red-100 text-red-700", icon: XCircle },
  revoked: { label: "Revoked", color: "bg-gray-100 text-gray-600", icon: ShieldOff },
  suspended: { label: "Suspended", color: "bg-yellow-100 text-yellow-700", icon: Clock },
};

export default function IdCards() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [previewCard, setPreviewCard] = useState<any>(null);
  const { data: cards, isLoading } = trpc.idCards.list.useQuery({});
  const [form, setForm] = useState({ personId: "", cardNumber: "", designation: "", propertyId: "", validFrom: "", validUntil: "" });
  const utils = trpc.useUtils();
  const createCard = trpc.idCards.create.useMutation({
    onSuccess: () => { utils.idCards.list.invalidate(); setCreateDialogOpen(false); setForm({ personId: "", cardNumber: "", designation: "", propertyId: "", validFrom: "", validUntil: "" }); toast.success("ID card generated"); },
    onError: (e) => toast.error(e.message),
  });
  const revokeCard = trpc.idCards.revoke.useMutation({
    onSuccess: () => { utils.idCards.list.invalidate(); toast.success("Card revoked"); },
    onError: (e) => toast.error(e.message),
  });

  const activeCount = cards?.filter((c: any) => c.status === "active").length ?? 0;
  const expiredCount = cards?.filter((c: any) => c.status === "expired").length ?? 0;
  const totalCount = cards?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy">Digital ID Cards</h2>
          <p className="text-sm text-muted-foreground mt-0.5">QR-coded identity cards with expiry management</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-navy text-white hover:bg-navy/90"><Plus className="h-4 w-4 mr-2" />Generate Card</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display text-navy">Generate ID Card</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2"><Label>Person ID *</Label><Input type="number" value={form.personId} onChange={(e) => setForm({ ...form, personId: e.target.value })} /></div>
              <div className="space-y-2"><Label>Card Number *</Label><Input value={form.cardNumber} onChange={(e) => setForm({ ...form, cardNumber: e.target.value })} placeholder="EMB-2026-XXXX" /></div>
              <div className="space-y-2"><Label>Designation</Label><Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></div>
              <div className="space-y-2"><Label>Property ID</Label><Input type="number" value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Valid From</Label><Input type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} /></div>
                <div className="space-y-2"><Label>Valid Until</Label><Input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} /></div>
              </div>
              <Button
                onClick={() => createCard.mutate({
                  personId: Number(form.personId),
                  cardNumber: form.cardNumber,
                  qrToken: `EMB-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                  designation: form.designation || undefined,
                  propertyId: form.propertyId ? Number(form.propertyId) : undefined,
                  validFrom: form.validFrom || undefined,
                  validUntil: form.validUntil || undefined,
                })}
                disabled={!form.personId || !form.cardNumber || createCard.isPending}
                className="w-full bg-navy text-white hover:bg-navy/90"
              >{createCard.isPending ? "Generating..." : "Generate Card"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border/50"><CardContent className="p-4 text-center"><p className="text-2xl font-semibold text-green-600">{activeCount}</p><p className="text-xs text-muted-foreground mt-1">Active Cards</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><p className="text-2xl font-semibold text-red-600">{expiredCount}</p><p className="text-xs text-muted-foreground mt-1">Expired</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><p className="text-2xl font-semibold text-navy">{totalCount}</p><p className="text-xs text-muted-foreground mt-1">Total Issued</p></CardContent></Card>
      </div>

      <div className="space-y-2">
        {cards?.map((card: any) => {
          const config = statusConfig[card.status] || statusConfig.active;
          const Icon = config.icon;
          return (
            <Card key={card.id} className="border-border/50 hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-navy flex items-center justify-center overflow-hidden">
                      <QRCodeCanvas data={card.qrToken || card.cardNumber} size={48} className="rounded" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Person #{card.personId}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{card.cardNumber}{card.designation ? ` · ${card.designation}` : ""}</p>
                      <p className="text-xs text-muted-foreground">
                        {card.validFrom ? `Valid: ${String(card.validFrom).slice(0, 10)}` : ""}
                        {card.validUntil ? ` to ${String(card.validUntil).slice(0, 10)}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={config.color}><Icon className="h-3 w-3 mr-1" />{config.label}</Badge>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setPreviewCard(card)}>
                        <Eye className="h-3 w-3 mr-1" />Preview
                      </Button>
                      {card.status === "active" && (
                        <Button variant="outline" size="sm" className="text-xs h-7 text-red-600 hover:text-red-700" onClick={() => revokeCard.mutate({ id: card.id })}>
                          <ShieldOff className="h-3 w-3 mr-1" />Revoke
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!isLoading && (!cards || cards.length === 0) && (
          <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><CreditCard className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No ID cards generated yet</p></CardContent></Card>
        )}
      </div>

      {/* Card Preview Dialog */}
      <Dialog open={!!previewCard} onOpenChange={(open) => { if (!open) setPreviewCard(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-display text-navy text-center">Digital ID Card</DialogTitle></DialogHeader>
          {previewCard && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-navy to-navy/80 rounded-xl p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gold/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-6 w-6 rounded-full bg-gold/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-gold">E</span>
                    </div>
                    <span className="text-xs font-medium tracking-wider text-gold/80">EMBER OPERATIONS</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-lg font-semibold">Person #{previewCard.personId}</p>
                      {previewCard.designation && <p className="text-sm text-white/70">{previewCard.designation}</p>}
                      <p className="text-xs text-white/50 mt-2">{previewCard.cardNumber}</p>
                    </div>
                    <div className="bg-white rounded-lg p-1.5">
                      <QRCodeCanvas data={previewCard.qrToken || previewCard.cardNumber} size={80} />
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
                    <span>{previewCard.validFrom ? `From: ${String(previewCard.validFrom).slice(0, 10)}` : ""}</span>
                    <span>{previewCard.validUntil ? `Until: ${String(previewCard.validUntil).slice(0, 10)}` : ""}</span>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">QR Token: <code className="bg-navy/5 px-1.5 py-0.5 rounded text-[10px]">{previewCard.qrToken}</code></p>
                <Badge className={statusConfig[previewCard.status]?.color || "bg-gray-100 text-gray-600"} >
                  {previewCard.status}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
