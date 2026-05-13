import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, FileSignature, Plus, Clock, CheckCircle2, XCircle, Send } from "lucide-react";
import { toast } from "sonner";

const mockContracts = [
  { id: 1, personName: "Rajesh Kumar", templateCode: "EMP_OFFER", status: "signed" as const, createdAt: "2026-04-15", signedAt: "2026-04-18" },
  { id: 2, personName: "Priya Sharma", templateCode: "EMP_OFFER", status: "sent" as const, createdAt: "2026-05-01", signedAt: null },
  { id: 3, personName: "Amit Patel", templateCode: "NDA", status: "draft" as const, createdAt: "2026-05-10", signedAt: null },
  { id: 4, personName: "Sunita Devi", templateCode: "CONTRACTOR", status: "active" as const, createdAt: "2026-03-20", signedAt: "2026-03-22" },
  { id: 5, personName: "Vikram Singh", templateCode: "EMP_OFFER", status: "expired" as const, createdAt: "2025-12-01", signedAt: "2025-12-05" },
];

const mockTemplates = [
  { id: 1, code: "EMP_OFFER", name: "Employment Offer Letter", version: 3, fields: 12, lastUpdated: "2026-04-01" },
  { id: 2, code: "NDA", name: "Non-Disclosure Agreement", version: 2, fields: 6, lastUpdated: "2026-03-15" },
  { id: 3, code: "CONTRACTOR", name: "Contractor Agreement", version: 1, fields: 15, lastUpdated: "2026-02-20" },
  { id: 4, code: "SEPARATION", name: "Separation Agreement", version: 1, fields: 8, lastUpdated: "2026-01-10" },
];

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-600", icon: Clock },
  sent: { label: "Sent for Signing", color: "bg-blue-100 text-blue-700", icon: Send },
  signed: { label: "Signed", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  active: { label: "Active", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  expired: { label: "Expired", color: "bg-orange-100 text-orange-700", icon: XCircle },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700", icon: XCircle },
};

export default function Contracts() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy">Contracts & Documents</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Template-driven generation with digital signatures</p>
        </div>
        <Button className="bg-navy text-white hover:bg-navy/90" onClick={() => toast.info("Contract generation coming soon")}><Plus className="h-4 w-4 mr-2" />Generate Contract</Button>
      </div>

      <Tabs defaultValue="contracts" className="space-y-4">
        <TabsList className="bg-cream border border-border/50">
          <TabsTrigger value="contracts"><FileText className="h-4 w-4 mr-1.5" />Contracts</TabsTrigger>
          <TabsTrigger value="templates"><FileSignature className="h-4 w-4 mr-1.5" />Templates</TabsTrigger>
          <TabsTrigger value="signing"><FileSignature className="h-4 w-4 mr-1.5" />Signing Service</TabsTrigger>
        </TabsList>

        <TabsContent value="contracts" className="space-y-2">
          {mockContracts.map((c) => {
            const config = statusConfig[c.status] || statusConfig.draft;
            const Icon = config.icon;
            return (
              <Card key={c.id} className="border-border/50 hover:shadow-sm transition-shadow cursor-pointer" onClick={() => toast.info(`Opening contract for ${c.personName}`)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-navy/5 flex items-center justify-center"><FileText className="h-4 w-4 text-navy" /></div>
                    <div>
                      <p className="font-medium text-sm">{c.personName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.templateCode} · Created {c.createdAt}{c.signedAt ? ` · Signed ${c.signedAt}` : ""}</p>
                    </div>
                  </div>
                  <Badge className={config.color}><Icon className="h-3 w-3 mr-1" />{config.label}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="templates" className="space-y-2">
          {mockTemplates.map((t) => (
            <Card key={t.id} className="border-border/50 hover:shadow-sm transition-shadow cursor-pointer" onClick={() => toast.info(`Opening template: ${t.name}`)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-gold/10 flex items-center justify-center"><FileSignature className="h-4 w-4 text-gold" /></div>
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Code: {t.code} · v{t.version} · {t.fields} merge fields · Updated {t.lastUpdated}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">v{t.version}</Badge>
              </CardContent>
            </Card>
          ))}
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
