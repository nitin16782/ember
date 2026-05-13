import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, FileBarChart, IndianRupee, MessageSquare, ArrowLeft, CalendarDays, TrendingUp, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";

export default function OwnerPortal() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: properties } = trpc.properties.list.useQuery({});
  const { data: invoiceData } = trpc.invoices.list.useQuery({});
  const { data: paymentData } = trpc.payments.list.useQuery({});
  const { data: requestData } = trpc.requests.list.useQuery({});

  const invoices = invoiceData ?? [];
  const payments = paymentData ?? [];
  const requests = requestData ?? [];

  const totalOutstanding = invoices.reduce((sum, inv) => sum + Number(inv.amountOutstanding ?? 0), 0);
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

  return (
    <div className="min-h-screen bg-cream">
      {/* Top Navigation — Owner Pattern */}
      <header className="bg-navy text-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10" onClick={() => setLocation("/")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="h-5 w-px bg-white/20" />
            <h1 className="font-display text-lg font-semibold tracking-tight">Owner Portal</h1>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-white/60">Welcome,</span>
            <span className="font-medium">{user?.name || "Owner"}</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/50 bg-white">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-navy/5 flex items-center justify-center"><Building2 className="h-5 w-5 text-navy" /></div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Properties</p>
                  <p className="text-2xl font-semibold text-navy">{properties?.length ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-white">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-green-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Paid</p>
                  <p className="text-2xl font-semibold text-green-700">₹{totalPaid.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-white">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center"><AlertCircle className="h-5 w-5 text-red-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Outstanding</p>
                  <p className="text-2xl font-semibold text-red-700">₹{totalOutstanding.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-white">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gold/10 flex items-center justify-center"><MessageSquare className="h-5 w-5 text-gold" /></div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Requests</p>
                  <p className="text-2xl font-semibold text-gold">{requests.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Content */}
        <Tabs defaultValue="invoices" className="space-y-4">
          <TabsList className="bg-white border border-border/50">
            <TabsTrigger value="invoices"><FileBarChart className="h-4 w-4 mr-1.5" />Invoices</TabsTrigger>
            <TabsTrigger value="payments"><IndianRupee className="h-4 w-4 mr-1.5" />Payments</TabsTrigger>
            <TabsTrigger value="properties"><Building2 className="h-4 w-4 mr-1.5" />Properties</TabsTrigger>
            <TabsTrigger value="requests"><MessageSquare className="h-4 w-4 mr-1.5" />Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="space-y-2">
            {invoices.length === 0 ? (
              <Card className="border-border/50 border-dashed bg-white"><CardContent className="p-12 text-center"><FileBarChart className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No invoices yet</p></CardContent></Card>
            ) : invoices.map((inv) => (
              <Card key={inv.id} className="border-border/50 bg-white">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center"><FileBarChart className="h-4 w-4 text-blue-600" /></div>
                    <div>
                      <p className="font-medium text-sm">{inv.invoiceNo}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{inv.monthCovered} · ₹{Number(inv.totalAmount).toLocaleString()}</p>
                    </div>
                  </div>
                  <Badge className={inv.status === "paid" ? "bg-green-100 text-green-700" : inv.status === "overdue" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}>
                    {inv.status.replace("_", " ")}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="payments" className="space-y-2">
            {payments.length === 0 ? (
              <Card className="border-border/50 border-dashed bg-white"><CardContent className="p-12 text-center"><IndianRupee className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No payments yet</p></CardContent></Card>
            ) : payments.map((p) => (
              <Card key={p.id} className="border-border/50 bg-white">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center"><IndianRupee className="h-4 w-4 text-green-600" /></div>
                    <div>
                      <p className="font-medium text-sm">₹{Number(p.amount).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Invoice #{p.invoiceId} · {p.method || "—"}</p>
                    </div>
                  </div>
                  <Badge className={p.status === "captured" || p.status === "reconciled" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
                    {p.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="properties" className="space-y-2">
            {(!properties || properties.length === 0) ? (
              <Card className="border-border/50 border-dashed bg-white"><CardContent className="p-12 text-center"><Building2 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No properties linked</p></CardContent></Card>
            ) : properties.map((prop) => (
              <Card key={prop.id} className="border-border/50 bg-white hover:shadow-sm transition-shadow cursor-pointer" onClick={() => setLocation(`/properties/${prop.id}`)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-gold/10 flex items-center justify-center"><Building2 className="h-4 w-4 text-gold" /></div>
                    <div>
                      <p className="font-medium text-sm">{prop.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{prop.city || "—"} · {prop.type?.replace("_", " ")}</p>
                    </div>
                  </div>
                  <Badge className={prop.status === "live" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
                    {prop.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="requests" className="space-y-2">
            {requests.length === 0 ? (
              <Card className="border-border/50 border-dashed bg-white"><CardContent className="p-12 text-center"><MessageSquare className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No requests yet</p></CardContent></Card>
            ) : requests.map((req: any) => (
              <Card key={req.id} className="border-border/50 bg-white">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center"><MessageSquare className="h-4 w-4 text-purple-600" /></div>
                    <div>
                      <p className="font-medium text-sm">{req.subject || "Request"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{req.category || "General"} · {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "—"}</p>
                    </div>
                  </div>
                  <Badge className={req.status === "resolved" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>
                    {req.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
