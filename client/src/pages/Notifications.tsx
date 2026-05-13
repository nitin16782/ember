import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, MessageSquare, Mail, Smartphone, CheckCircle2, Circle, Settings } from "lucide-react";
import { toast } from "sonner";

const channelConfig: Record<string, { label: string; icon: any; color: string }> = {
  in_app: { label: "In-App", icon: Bell, color: "bg-blue-100 text-blue-700" },
  email: { label: "Email", icon: Mail, color: "bg-purple-100 text-purple-700" },
  whatsapp: { label: "WhatsApp", icon: MessageSquare, color: "bg-green-100 text-green-700" },
  sms: { label: "SMS", icon: Smartphone, color: "bg-orange-100 text-orange-700" },
};

const mockIntegrations = [
  { name: "Interakt WhatsApp", status: "mocked", description: "Invoice issued, payment received, OTP, leave decisions — mocked during dev with documented interface" },
  { name: "Resend / SES Email", status: "mocked", description: "Transactional emails for notifications, contracts, and payslips" },
  { name: "In-App Notifications", status: "active", description: "Real-time in-app notification bell with read/unread tracking" },
];

export default function Notifications() {
  const { data: notifications, isLoading } = trpc.notifications.list.useQuery({ limit: 20 });
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => toast.success("Marked as read"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-navy">Notifications</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Multi-channel notification management — WhatsApp, Email, SMS, In-App</p>
      </div>

      <Tabs defaultValue="inbox" className="space-y-4">
        <TabsList className="bg-cream border border-border/50">
          <TabsTrigger value="inbox"><Bell className="h-4 w-4 mr-1.5" />Inbox</TabsTrigger>
          <TabsTrigger value="channels"><Settings className="h-4 w-4 mr-1.5" />Channels & Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-2">
          {notifications?.map((n: any) => {
            const ch = channelConfig[n.channel] || channelConfig.in_app;
            const ChannelIcon = ch.icon;
            const isRead = !!n.readAt;
            return (
              <Card key={n.id} className={`border-border/50 hover:shadow-sm transition-shadow cursor-pointer ${!isRead ? "bg-navy/[0.02]" : ""}`}
                onClick={() => { if (!isRead) markRead.mutate({ id: n.id }); }}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-9 w-9 rounded-lg bg-navy/5 flex items-center justify-center">
                        <ChannelIcon className="h-4 w-4 text-navy" />
                      </div>
                      {!isRead && <Circle className="h-2.5 w-2.5 fill-blue-500 text-blue-500 absolute -top-0.5 -right-0.5" />}
                    </div>
                    <div>
                      <p className={`text-sm ${!isRead ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                      {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.body}</p>}
                      <p className="text-xs text-muted-foreground mt-0.5">{n.eventType}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={ch.color}>{ch.label}</Badge>
                    {isRead && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {!isLoading && (!notifications || notifications.length === 0) && (
            <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><Bell className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No notifications yet</p></CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="channels" className="space-y-3">
          {mockIntegrations.map((integration, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-navy/5 flex items-center justify-center">
                    {integration.name.includes("WhatsApp") ? <MessageSquare className="h-4 w-4 text-green-600" /> :
                     integration.name.includes("Email") ? <Mail className="h-4 w-4 text-purple-600" /> :
                     <Bell className="h-4 w-4 text-navy" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{integration.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{integration.description}</p>
                  </div>
                </div>
                <Badge className={integration.status === "active" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>
                  {integration.status === "active" ? "Active" : "Mocked"}
                </Badge>
              </CardContent>
            </Card>
          ))}

          <Card className="border-border/50 bg-navy/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-navy">Documented Interfaces</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-xs text-muted-foreground space-y-1">
              <p><code className="bg-white/50 px-1 rounded">INotificationChannel</code> — sendNotification(recipient, template, data)</p>
              <p><code className="bg-white/50 px-1 rounded">IWhatsAppProvider</code> — sendTemplate(phone, templateId, params) via Interakt</p>
              <p><code className="bg-white/50 px-1 rounded">IEmailProvider</code> — sendEmail(to, subject, html) via Resend/SES</p>
              <p className="mt-2 text-foreground font-medium">All providers are mocked during development with full interface documentation for production integration.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
