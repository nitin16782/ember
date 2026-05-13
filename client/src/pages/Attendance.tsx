import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, User } from "lucide-react";
import { useMemo } from "react";

const eventTypeColors: Record<string, string> = {
  check_in: "bg-green-100 text-green-700",
  break_start: "bg-yellow-100 text-yellow-700",
  break_end: "bg-blue-100 text-blue-700",
  check_out: "bg-red-100 text-red-700",
};

export default function Attendance() {
  const queryInput = useMemo(() => ({ limit: 100 }), []);
  const { data: events, isLoading } = trpc.attendance.list.useQuery(queryInput);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-navy">Attendance</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Shift events with GPS + selfie verification</p>
      </div>
      <div className="space-y-2">
        {events?.map((evt) => (
          <Card key={evt.id} className="border-border/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-navy/5 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-navy" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className={eventTypeColors[evt.eventType] || ""}>{evt.eventType.replace("_", " ")}</Badge>
                    <span className="text-xs text-muted-foreground">{evt.markMode?.replace("_", " ")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Person #{evt.personId} · {evt.occurredAt ? new Date(evt.occurredAt).toLocaleString() : "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {evt.withinGeofence !== null && (
                  <Badge variant="outline" className={evt.withinGeofence ? "text-green-600" : "text-red-600"}>
                    <MapPin className="h-3 w-3 mr-1" />{evt.withinGeofence ? "In zone" : "Out of zone"}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && (!events || events.length === 0) && (
          <Card className="border-border/50 border-dashed">
            <CardContent className="p-12 text-center">
              <Clock className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No attendance records yet</p>
              <p className="text-xs text-muted-foreground mt-1">Shift events will appear here as staff check in/out</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
