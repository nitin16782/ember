import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";

const statusColors: Record<string, string> = {
  confirmed: "bg-green-100 text-green-700",
  tentative: "bg-yellow-100 text-yellow-700",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-blue-100 text-blue-700",
};

export default function Bookings() {
  const { data: bookingList, isLoading } = trpc.bookings.list.useQuery({});

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-navy">Bookings</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Property booking calendar and occupancy tracking</p>
      </div>
      <div className="space-y-2">
        {bookingList?.map((b) => (
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
      </div>
    </div>
  );
}
