import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, FileBarChart, IndianRupee, MessageSquare, ArrowLeft, TrendingUp, AlertCircle, CalendarDays, Send, BarChart3 } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

const mockMessages = [
  { id: 1, from: "Ember Ops", date: "May 12, 2026", text: "Monthly report for April has been generated and is available under the Reports tab.", type: "system" },
  { id: 2, from: "You", date: "May 10, 2026", text: "Can you check the AC at Villa Serenity? Guest complained about cooling.", type: "owner" },
  { id: 3, from: "Ember Ops", date: "May 10, 2026", text: "Noted. We've dispatched a technician. ETA 2 hours.", type: "system" },
  { id: 4, from: "Ember Ops", date: "May 8, 2026", text: "Invoice INV-2026-005 has been issued for May. Due date: May 25.", type: "system" },
  { id: 5, from: "You", date: "May 5, 2026", text: "Please share the occupancy report for Q1.", type: "owner" },
];

const mockMonthlyReports = [
  { month: "April 2026", revenue: 285000, expenses: 82000, occupancy: 72, bookings: 8, status: "ready" },
  { month: "March 2026", revenue: 310000, expenses: 95000, occupancy: 78, bookings: 10, status: "ready" },
  { month: "February 2026", revenue: 245000, expenses: 68000, occupancy: 65, bookings: 7, status: "ready" },
  { month: "January 2026", revenue: 320000, expenses: 88000, occupancy: 80, bookings: 12, status: "ready" },
];

const mockUpcomingBookings = [
  { id: 1, property: "Villa Serenity", guest: "Rajesh Mehta", dateIn: "May 18", dateOut: "May 22", guests: 4, source: "Airbnb" },
  { id: 2, property: "Ocean View Apt", guest: "Sarah Johnson", dateIn: "May 20", dateOut: "May 25", guests: 2, source: "Booking.com" },
  { id: 3, property: "Villa Serenity", guest: "Amit Patel", dateIn: "May 28", dateOut: "Jun 2", guests: 6, source: "Direct" },
];

export default function OwnerPortal() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [newMessage, setNewMessage] = useState("");
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/50 bg-white">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-navy/5 flex items-center justify-center"><Building2 className="h-5 w-5 text-navy" /></div>
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Properties</p><p className="text-2xl font-semibold text-navy">{properties?.length ?? 0}</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-white">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-green-600" /></div>
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Paid</p><p className="text-2xl font-semibold text-green-700">₹{totalPaid.toLocaleString()}</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-white">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center"><AlertCircle className="h-5 w-5 text-red-600" /></div>
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Outstanding</p><p className="text-2xl font-semibold text-red-700">₹{totalOutstanding.toLocaleString()}</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-white">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gold/10 flex items-center justify-center"><CalendarDays className="h-5 w-5 text-gold" /></div>
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Upcoming</p><p className="text-2xl font-semibold text-gold">{mockUpcomingBookings.length}</p></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="invoices" className="space-y-4">
          <TabsList className="bg-white border border-border/50 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="invoices"><FileBarChart className="h-4 w-4 mr-1.5" />Invoices</TabsTrigger>
            <TabsTrigger value="payments"><IndianRupee className="h-4 w-4 mr-1.5" />Payments</TabsTrigger>
            <TabsTrigger value="bookings"><CalendarDays className="h-4 w-4 mr-1.5" />Bookings</TabsTrigger>
            <TabsTrigger value="reports"><BarChart3 className="h-4 w-4 mr-1.5" />Reports</TabsTrigger>
            <TabsTrigger value="communication"><MessageSquare className="h-4 w-4 mr-1.5" />Messages</TabsTrigger>
            <TabsTrigger value="properties"><Building2 className="h-4 w-4 mr-1.5" />Properties</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="space-y-2">
            {invoices.length === 0 ? (
              <Card className="border-border/50 border-dashed bg-white"><CardContent className="p-12 text-center"><FileBarChart className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No invoices yet</p></CardContent></Card>
            ) : invoices.map((inv) => (
              <Card key={inv.id} className="border-border/50 bg-white">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center"><FileBarChart className="h-4 w-4 text-blue-600" /></div>
                    <div><p className="font-medium text-sm">{inv.invoiceNo}</p><p className="text-xs text-muted-foreground mt-0.5">{inv.monthCovered} · ₹{Number(inv.totalAmount).toLocaleString()}</p></div>
                  </div>
                  <Badge className={inv.status === "paid" ? "bg-green-100 text-green-700" : inv.status === "overdue" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}>{inv.status.replace("_", " ")}</Badge>
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
                    <div><p className="font-medium text-sm">₹{Number(p.amount).toLocaleString()}</p><p className="text-xs text-muted-foreground mt-0.5">Invoice #{p.invoiceId} · {p.method || "—"}</p></div>
                  </div>
                  <Badge className={p.status === "captured" || p.status === "reconciled" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>{p.status}</Badge>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="bookings">
            <Card className="border-border/50 bg-white">
              <CardHeader><CardTitle className="text-sm font-medium text-navy">Upcoming Bookings</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow className="bg-cream/50">
                    <TableHead className="text-xs">Property</TableHead><TableHead className="text-xs">Guest</TableHead><TableHead className="text-xs">Check-in</TableHead><TableHead className="text-xs">Check-out</TableHead><TableHead className="text-xs text-center">Guests</TableHead><TableHead className="text-xs">Source</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {mockUpcomingBookings.map(b => (
                      <TableRow key={b.id} className="text-sm">
                        <TableCell className="font-medium">{b.property}</TableCell><TableCell>{b.guest}</TableCell><TableCell>{b.dateIn}</TableCell><TableCell>{b.dateOut}</TableCell><TableCell className="text-center">{b.guests}</TableCell><TableCell><Badge variant="outline" className="text-[10px]">{b.source}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card className="border-border/50 bg-white">
              <CardHeader><CardTitle className="text-sm font-medium text-navy">Monthly Property Reports</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow className="bg-cream/50">
                    <TableHead className="text-xs">Month</TableHead><TableHead className="text-xs text-right">Revenue</TableHead><TableHead className="text-xs text-right">Expenses</TableHead><TableHead className="text-xs text-right">Net</TableHead><TableHead className="text-xs text-center">Occupancy</TableHead><TableHead className="text-xs text-center">Action</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {mockMonthlyReports.map(r => (
                      <TableRow key={r.month} className="text-sm">
                        <TableCell className="font-medium">{r.month}</TableCell>
                        <TableCell className="text-right text-green-600">₹{(r.revenue / 1000).toFixed(0)}K</TableCell>
                        <TableCell className="text-right text-red-600">₹{(r.expenses / 1000).toFixed(0)}K</TableCell>
                        <TableCell className="text-right font-semibold">₹{((r.revenue - r.expenses) / 1000).toFixed(0)}K</TableCell>
                        <TableCell className="text-center"><Badge className={r.occupancy >= 75 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>{r.occupancy}%</Badge></TableCell>
                        <TableCell className="text-center"><Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toast.info("PDF report download coming soon")}>Download</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="communication">
            <Card className="border-border/50 bg-white">
              <CardHeader><CardTitle className="text-sm font-medium text-navy">Communication Thread</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {mockMessages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.type === "owner" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] p-3 rounded-lg ${msg.type === "owner" ? "bg-navy text-white" : "bg-cream border border-border/30"}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-medium ${msg.type === "owner" ? "text-white/70" : "text-muted-foreground"}`}>{msg.from}</span>
                          <span className={`text-[10px] ${msg.type === "owner" ? "text-white/50" : "text-muted-foreground/60"}`}>{msg.date}</span>
                        </div>
                        <p className="text-sm">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-2 border-t border-border/30">
                  <Input placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newMessage.trim()) { toast.info("Message sent (communication module coming soon)"); setNewMessage(""); } }} />
                  <Button className="bg-navy text-white hover:bg-navy/90" onClick={() => { if (newMessage.trim()) { toast.info("Message sent (communication module coming soon)"); setNewMessage(""); } }}><Send className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="properties" className="space-y-2">
            {(!properties || properties.length === 0) ? (
              <Card className="border-border/50 border-dashed bg-white"><CardContent className="p-12 text-center"><Building2 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No properties linked</p></CardContent></Card>
            ) : properties.map((prop) => (
              <Card key={prop.id} className="border-border/50 bg-white hover:shadow-sm transition-shadow cursor-pointer" onClick={() => setLocation(`/properties/${prop.id}`)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-gold/10 flex items-center justify-center"><Building2 className="h-4 w-4 text-gold" /></div>
                    <div><p className="font-medium text-sm">{prop.name}</p><p className="text-xs text-muted-foreground mt-0.5">{prop.city || "—"} · {prop.type?.replace("_", " ")}</p></div>
                  </div>
                  <Badge className={prop.status === "live" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>{prop.status}</Badge>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
