import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, FileSignature, Plus, Clock, CheckCircle2, XCircle, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-600", icon: Clock },
  sent: { label: "Sent for Signing", color: "bg-blue-100 text-blue-700", icon: Send },
  signed: { label: "Signed", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  active: { label: "Active", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  expired: { label: "Expired", color: "bg-orange-100 text-orange-700", icon: XCircle },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700", icon: XCircle },
};

export default function Contracts() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: contracts, isLoading } = trpc.contracts.list.useQuery({});
  const { data: templates } = trpc.contracts.templates.useQuery();
  const [form, setForm] = useState({ personId: "", contractType: "employment", templateId: "", startDate: "", endDate: "" });
  const utils = trpc.useUtils();
  const createContract = trpc.contracts.create.useMutation({
    onSuccess: () => { utils.contracts.list.invalidate(); setDialogOpen(false); setForm({ personId: "", contractType: "employment", templateId: "", startDate: "", endDate: "" }); toast.success("Contract created"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy">Contracts & Documents</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Template-driven generation with digital signatures</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-navy text-white hover:bg-navy/90"><Plus className="h-4 w-4 mr-2" />Generate Contract</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display text-navy">Generate Contract</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2"><Label>Person ID *</Label><Input type="number" value={form.personId} onChange={(e) => setForm({ ...form, personId: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Contract Type *</Label>
                <Select value={form.contractType} onValueChange={(v) => setForm({ ...form, contractType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employment">Employment</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                    <SelectItem value="nda">NDA</SelectItem>
                    <SelectItem value="separation">Separation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {templates && templates.length > 0 && (
                <div className="space-y-2">
                  <Label>Template (optional)</Label>
                  <Select value={form.templateId} onValueChange={(v) => setForm({ ...form, templateId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select template..." /></SelectTrigger>
                    <SelectContent>
                      {templates.map((t: any) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Start Date *</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
                <div className="space-y-2"><Label>End Date</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
              </div>
              <Button
                onClick={() => createContract.mutate({
                  personId: Number(form.personId),
                  contractType: form.contractType,
                  templateId: form.templateId ? Number(form.templateId) : undefined,
                  startDate: form.startDate,
                  endDate: form.endDate || undefined,
                })}
                disabled={!form.personId || !form.startDate || createContract.isPending}
                className="w-full bg-navy text-white hover:bg-navy/90"
              >{createContract.isPending ? "Creating..." : "Generate Contract"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="contracts" className="space-y-4">
        <TabsList className="bg-cream border border-border/50">
          <TabsTrigger value="contracts"><FileText className="h-4 w-4 mr-1.5" />Contracts</TabsTrigger>
          <TabsTrigger value="templates"><FileSignature className="h-4 w-4 mr-1.5" />Templates</TabsTrigger>
          <TabsTrigger value="signing"><FileSignature className="h-4 w-4 mr-1.5" />Signing Service</TabsTrigger>
        </TabsList>

        <TabsContent value="contracts" className="space-y-2">
          {contracts?.map((c: any) => {
            const config = statusConfig[c.status] || statusConfig.draft;
            const Icon = config.icon;
            return (
              <Card key={c.id} className="border-border/50 hover:shadow-sm transition-shadow cursor-pointer" onClick={() => toast.info(`Opening contract #${c.id}`)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-navy/5 flex items-center justify-center"><FileText className="h-4 w-4 text-navy" /></div>
                    <div>
                      <p className="font-medium text-sm">Person #{c.personId} — {c.contractType}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Start: {c.startDate}{c.endDate ? ` · End: ${c.endDate}` : ""} · Created {String(c.createdAt).slice(0, 10)}</p>
                    </div>
                  </div>
                  <Badge className={config.color}><Icon className="h-3 w-3 mr-1" />{config.label}</Badge>
                </CardContent>
              </Card>
            );
          })}
          {!isLoading && (!contracts || contracts.length === 0) && (
            <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No contracts yet</p></CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-2">
          {templates?.map((t: any) => (
            <Card key={t.id} className="border-border/50 hover:shadow-sm transition-shadow cursor-pointer" onClick={() => toast.info(`Opening template: ${t.name}`)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-gold/10 flex items-center justify-center"><FileSignature className="h-4 w-4 text-gold" /></div>
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Type: {t.contractType} · Created {String(t.createdAt).slice(0, 10)}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">{t.active ? "Active" : "Inactive"}</Badge>
              </CardContent>
            </Card>
          ))}
          {(!templates || templates.length === 0) && (
            <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><FileSignature className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No templates yet</p></CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="signing">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2"><FileSignature className="h-4 w-4 text-navy" />Digital Signature Service — Swappable Interface</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-navy/5 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Current Provider</span>
                  <Badge className="bg-green-100 text-green-700">Active</Badge>
                </div>
                <div className="text-sm"><span className="text-muted-foreground">Provider:</span> <span className="font-medium">Zoho Sign</span></div>
                <div className="text-sm"><span className="text-muted-foreground">API Status:</span> <span className="font-medium text-green-600">Connected (Mocked)</span></div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1.5 border-t pt-3">
                <p className="font-medium text-foreground">Swappable Service Interface</p>
                <p>The signing service is implemented behind an abstraction layer (<code className="bg-navy/5 px-1 rounded">ISigningService</code>) that supports:</p>
                <div className="grid grid-cols-2 gap-1 mt-2">
                  <span>• <code className="bg-navy/5 px-1 rounded">sendForSigning()</code></span>
                  <span>• <code className="bg-navy/5 px-1 rounded">getSigningStatus()</code></span>
                  <span>• <code className="bg-navy/5 px-1 rounded">downloadSigned()</code></span>
                  <span>• <code className="bg-navy/5 px-1 rounded">cancelSigning()</code></span>
                  <span>• <code className="bg-navy/5 px-1 rounded">listTemplates()</code></span>
                  <span>• <code className="bg-navy/5 px-1 rounded">webhookHandler()</code></span>
                </div>
                <p className="mt-2">To switch providers, implement the <code className="bg-navy/5 px-1 rounded">ISigningService</code> interface for the new provider (e.g., DocuSign, Adobe Sign) and update the service registry.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
