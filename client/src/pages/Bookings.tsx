import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, CalendarDays, List, BarChart3, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  confirmed: "bg-green-100 text-green-700",
  tentative: "bg-yellow-100 text-yellow-700",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-blue-100 text-blue-700",
};

const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1);
const mockOccupancy: Record<number, { property: string; status: "booked" | "available" | "checkout" | "checkin" }[]> = {
  1: [{ property: "Villa Serenity", status: "booked" }],
  2: [{ property: "Villa Serenity", status: "booked" }],
  3: [{ property: "Villa Serenity", status: "checkout" }],
  5: [{ property: "Ocean View", status: "checkin" }],
  6: [{ property: "Ocean View", status: "booked" }],
  7: [{ property: "Ocean View", status: "booked" }],
  10: [{ property: "Mountain Lodge", status: "checkin" }, { property: "Villa Serenity", status: "checkin" }],
  11: [{ property: "Mountain Lodge", status: "booked" }, { property: "Villa Serenity", status: "booked" }],
  15: [{ property: "City Center", status: "booked" }],
  20: [{ property: "Villa Serenity", status: "booked" }, { property: "Ocean View", status: "booked" }],
};

const mockOccupancyStats = [
  { property: "Villa Serenity", occupancy: 72, revenue: 245000, avgNightRate: 8500 },
  { property: "Ocean View Apt", occupancy: 65, revenue: 180000, avgNightRate: 6500 },
  { property: "Mountain Lodge", occupancy: 45, revenue: 120000, avgNightRate: 12000 },
  { property: "City Center Hotel", occupancy: 88, revenue: 520000, avgNightRate: 4500 },
];

export default function Bookings() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: bookingList, isLoading } = trpc.bookings.list.useQuery({});
  const utils = trpc.useUtils();

  const createBooking = trpc.bookings.create.useMutation({
    onSuccess: () => { utils.bookings.list.invalidate(); setDialogOpen(false); toast.success("Booking created"); },
    onError: (err: any) => toast.error(err.message),
  });

  const [form, setForm] = useState({ propertyId: 0, guestName: "", guestPhone: "", dateIn: "", dateOut: "", guestCount: 1, source: "direct" as const });
  const totalBookings = bookingList?.length || 0;
  const confirmed = bookingList?.filter((b: any) => b.status === "confirmed").length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy">Bookings & Occupancy</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Calendar view, occupancy tracking, and booking management</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button className="bg-navy text-white hover:bg-navy/90"><Plus className="h-4 w-4 mr-2" />New Booking</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display text-navy">Create Booking</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2"><Label>Property ID *</Label><Input type="number" value={form.propertyId || ""} onChange={(e) => setForm({ ...form, propertyId: Number(e.target.value) })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Guest Name *</Label><Input value={form.guestName} onChange={(e) => setForm({ ...form, guestName: e.target.value })} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={form.guestPhone} onChange={(e) => setForm({ ...form, guestPhone: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Check-in *</Label><Input type="date" value={form.dateIn} onChange={(e) => setForm({ ...form, dateIn: e.target.value })} /></div>
                <div className="space-y-2"><Label>Check-out *</Label><Input type="date" value={form.dateOut} onChange={(e) => setForm({ ...form, dateOut: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Guests</Label><Input type="number" value={form.guestCount} onChange={(e) => setForm({ ...form, guestCount: Number(e.target.value) })} /></div>
                <div className="space-y-2"><Label>Source</Label>
                  <Select value={form.source} onValueChange={(v: any) => setForm({ ...form, source: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="direct">Direct</SelectItem><SelectItem value="airbnb">Airbnb</SelectItem><SelectItem value="booking_com">Booking.com</SelectItem><SelectItem value="mmt">MakeMyTrip</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={() => { if (!form.propertyId || !form.guestName || !form.dateIn || !form.dateOut) { toast.error("Fill required fields"); return; } createBooking.mutate({ propertyId: form.propertyId, guestName: form.guestName, dateIn: form.dateIn, dateOut: form.dateOut, guestCount: form.guestCount, source: form.source }); }} className="w-full bg-navy text-white hover:bg-navy/90" disabled={createBooking.isPending}>
                {createBooking.isPending ? "Creating..." : "Create Booking"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Bookings</p><p className="text-2xl font-semibold text-navy mt-1">{totalBookings}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Confirmed</p><p className="text-2xl font-semibold text-green-600 mt-1">{confirmed}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avg Occupancy</p><p className="text-2xl font-semibold text-navy mt-1">68%</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Revenue (MTD)</p><p className="text-2xl font-semibold text-gold mt-1">₹10.6L</p></CardContent></Card>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList className="bg-cream border border-border/50">
          <TabsTrigger value="list"><List className="h-4 w-4 mr-1.5" />Bookings</TabsTrigger>
          <TabsTrigger value="calendar"><CalendarDays className="h-4 w-4 mr-1.5" />Calendar</TabsTrigger>
          <TabsTrigger value="occupancy"><BarChart3 className="h-4 w-4 mr-1.5" />Occupancy</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-2">
          {bookingList?.map((b: any) => (
            <Card key={b.id} className="border-border/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center"><CalendarDays className="h-4 w-4 text-blue-600" /></div>
                  <div>
                    <p className="font-medium text-sm">Property #{b.propertyId} — {b.guestName || "Guest"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{String(b.dateIn)} → {String(b.dateOut)} · {b.source || "Direct"} · {b.guestCount ?? 0} guests</p>
                  </div>
                </div>
                <Badge className={statusColors[b.status] || ""}>{b.status}</Badge>
              </CardContent>
            </Card>
          ))}
          {!isLoading && (!bookingList || bookingList.length === 0) && (
            <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><CalendarDays className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No bookings yet</p></CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          <Card className="border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-navy">May 2026 — Booking Calendar</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-7 gap-1 text-center">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (<div key={d} className="text-[10px] font-medium text-muted-foreground py-1">{d}</div>))}
                {Array.from({ length: 4 }, (_, i) => <div key={`pad-${i}`} />)}
                {calendarDays.map(day => {
                  const entries = mockOccupancy[day] || [];
                  const hasBooking = entries.length > 0;
                  const bgClass = hasBooking
                    ? entries.some(e => e.status === "checkin") ? "bg-green-50 border-green-200"
                    : entries.some(e => e.status === "checkout") ? "bg-orange-50 border-orange-200"
                    : "bg-navy/5 border-navy/20"
                    : "bg-cream/30";
                  return (
                    <div key={day} className={`p-1.5 rounded text-xs min-h-[48px] border ${bgClass}`}>
                      <span className="font-medium">{day}</span>
                      {entries.map((e, i) => (
                        <div key={i} className="text-[8px] mt-0.5 truncate">
                          <span className={e.status === "checkin" ? "text-green-600" : e.status === "checkout" ? "text-orange-600" : "text-navy"}>{e.property}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-navy/30" />Booked</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-green-400" />Check-in</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-orange-400" />Check-out</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="occupancy">
          <div className="space-y-3">
            {mockOccupancyStats.map(stat => (
              <Card key={stat.property} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm">{stat.property}</p>
                    <Badge className={stat.occupancy >= 80 ? "bg-green-100 text-green-700" : stat.occupancy >= 60 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}>{stat.occupancy}%</Badge>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-100 mb-2">
                    <div className={`h-full rounded-full ${stat.occupancy >= 80 ? "bg-green-500" : stat.occupancy >= 60 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${stat.occupancy}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Revenue: ₹{(stat.revenue / 100000).toFixed(1)}L</span>
                    <span>Avg Night Rate: ₹{stat.avgNightRate.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
