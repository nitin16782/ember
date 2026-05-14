import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, Shield, Building2, Bell, Database, Globe, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { UsersTab } from "./settings/UsersTab";

const rbacPermissions = [
  { module: "People", permissions: ["view_all", "create", "edit", "delete", "approve_leave", "process_payroll"] },
  { module: "Properties", permissions: ["view_all", "create", "edit", "manage_fees", "manage_sla"] },
  { module: "Operations", permissions: ["view_checklists", "create_checklists", "approve_expenses", "manage_vendors"] },
  { module: "Finance", permissions: ["view_invoices", "create_invoices", "record_payments", "approve_expenses", "export_data"] },
  { module: "System", permissions: ["manage_roles", "view_audit_log", "manage_settings", "manage_integrations"] },
];

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-navy">Settings</h2>
        <p className="text-sm text-muted-foreground mt-0.5">System configuration, RBAC, and integration management</p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="bg-cream border border-border/50 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="users"><UsersRound className="h-4 w-4 mr-1.5" />Users</TabsTrigger>
          <TabsTrigger value="rbac"><Shield className="h-4 w-4 mr-1.5" />RBAC</TabsTrigger>
          <TabsTrigger value="general"><SettingsIcon className="h-4 w-4 mr-1.5" />General</TabsTrigger>
          <TabsTrigger value="integrations"><Globe className="h-4 w-4 mr-1.5" />Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UsersTab />
        </TabsContent>

        <TabsContent value="rbac" className="space-y-4">
          <Card className="border-border/50 bg-navy/5">
            <CardContent className="p-4 text-xs text-muted-foreground">
              <p className="font-medium text-foreground text-sm mb-1">Permission Matrix</p>
              <p>These are the per-module permissions each role can hold. Role defaults are defined in the codebase; per-user overrides will be configurable here in a future release.</p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-navy">Permission Matrix</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {rbacPermissions.map((mod) => (
                  <div key={mod.module}>
                    <p className="text-xs font-medium text-foreground mb-1">{mod.module}</p>
                    <div className="flex flex-wrap gap-1">
                      {mod.permissions.map((perm) => (
                        <Badge key={perm} variant="outline" className="text-[10px] font-normal">{perm}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="space-y-3">
          <Card className="border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Building2 className="h-4 w-4 text-navy" />Organization</CardTitle></CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex items-center justify-between"><Label className="text-sm">Company Name</Label><span className="text-sm font-medium">Ember Property Management</span></div>
              <div className="flex items-center justify-between"><Label className="text-sm">Currency</Label><span className="text-sm font-medium">INR (₹)</span></div>
              <div className="flex items-center justify-between"><Label className="text-sm">Timezone</Label><span className="text-sm font-medium">Asia/Kolkata (IST)</span></div>
              <div className="flex items-center justify-between"><Label className="text-sm">Financial Year Start</Label><span className="text-sm font-medium">April</span></div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Bell className="h-4 w-4 text-navy" />Notification Preferences</CardTitle></CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex items-center justify-between"><Label className="text-sm">Email Notifications</Label><Switch defaultChecked /></div>
              <div className="flex items-center justify-between"><Label className="text-sm">WhatsApp Alerts</Label><Switch defaultChecked /></div>
              <div className="flex items-center justify-between"><Label className="text-sm">SMS Notifications</Label><Switch /></div>
              <div className="flex items-center justify-between"><Label className="text-sm">Daily Digest</Label><Switch defaultChecked /></div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Database className="h-4 w-4 text-navy" />Data & Storage</CardTitle></CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex items-center justify-between"><Label className="text-sm">File Storage</Label><span className="text-sm font-medium">Cloudflare R2 (S3-compatible)</span></div>
              <div className="flex items-center justify-between"><Label className="text-sm">Signed URL Expiry</Label><span className="text-sm font-medium">1 hour</span></div>
              <div className="flex items-center justify-between"><Label className="text-sm">Audit Log Retention</Label><span className="text-sm font-medium">365 days</span></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-3">
          {[
            { name: "Zoho Sign", status: "mocked", desc: "Digital signatures — swappable ISigningService interface" },
            { name: "Interakt WhatsApp", status: "mocked", desc: "WhatsApp notifications — IWhatsAppProvider interface" },
            { name: "Resend / SES", status: "mocked", desc: "Transactional email — IEmailProvider interface" },
            { name: "Omni Expense", status: "mocked", desc: "Expense reconciliation — IOmniExpenseProvider interface" },
            { name: "Cloudflare R2", status: "active", desc: "Media storage with signed URLs and structured bucket paths" },
          ].map((int, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{int.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{int.desc}</p>
                </div>
                <Badge className={int.status === "active" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>
                  {int.status === "active" ? "Active" : "Mocked"}
                </Badge>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" className="w-full" onClick={() => toast.info("Integration configuration coming soon")}>
            <SettingsIcon className="h-4 w-4 mr-2" />Configure Integration Credentials
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
