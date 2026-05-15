import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, Calendar, Users, AlertTriangle, History, Camera, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";

const eventTypeColors: Record<string, string> = {
  check_in: "bg-green-100 text-green-700",
  break_start: "bg-yellow-100 text-yellow-700",
  break_end: "bg-blue-100 text-blue-700",
  check_out: "bg-red-100 text-red-700",
};

function deriveDailyView(events: any[]) {
  const byPersonDate = new Map<string, any>();
  for (const evt of events) {
    const date = evt.occurredAt ? new Date(evt.occurredAt).toLocaleDateString() : "unknown";
    const key = `${evt.personId}_${date}`;
    if (!byPersonDate.has(key)) {
      byPersonDate.set(key, { personId: evt.personId, date, checkIn: null, checkOut: null, breakMinutes: 0, totalHours: 0, withinGeofence: true, markMode: "self", events: [] });
    }
    const record = byPersonDate.get(key)!;
    record.events.push(evt);
    if (evt.eventType === "check_in" && !record.checkIn) record.checkIn = evt.occurredAt;
    if (evt.eventType === "check_out") record.checkOut = evt.occurredAt;
    if (evt.withinGeofence === false) record.withinGeofence = false;
    if (evt.markMode === "supervisor_marked") record.markMode = "supervisor";
  }
  for (const [, record] of Array.from(byPersonDate)) {
    if (record.checkIn && record.checkOut) {
      const diff = new Date(record.checkOut).getTime() - new Date(record.checkIn).getTime();
      record.totalHours = Math.round((diff / 3600000) * 10) / 10;
    }
    const breakStarts = record.events.filter((e: any) => e.eventType === "break_start").sort((a: any, b: any) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
    const breakEnds = record.events.filter((e: any) => e.eventType === "break_end").sort((a: any, b: any) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
    let breakMs = 0;
    for (let i = 0; i < Math.min(breakStarts.length, breakEnds.length); i++) {
      breakMs += new Date(breakEnds[i].occurredAt).getTime() - new Date(breakStarts[i].occurredAt).getTime();
    }
    record.breakMinutes = Math.round(breakMs / 60000);
  }
  return Array.from(byPersonDate.values()).sort((a, b) => b.date.localeCompare(a.date));
}

const mockAuditTrail = [
  { id: 1, personId: 12, field: "check_in", oldValue: "09:15 AM", newValue: "09:00 AM", reason: "System clock sync issue", editedBy: "Ops Lead - Rahul", editedAt: "2026-05-12 14:30", status: "approved" },
  { id: 2, personId: 8, field: "check_out", oldValue: "18:00 PM", newValue: "19:30 PM", reason: "Overtime not recorded due to app crash", editedBy: "Supervisor - Priya", editedAt: "2026-05-11 10:15", status: "pending" },
  { id: 3, personId: 22, field: "withinGeofence", oldValue: "false", newValue: "true", reason: "GPS drift at property boundary", editedBy: "Area Manager - Amit", editedAt: "2026-05-10 16:45", status: "approved" },
];

export default function Attendance() {
  const queryInput = useMemo(() => ({ limit: 200 }), []);
  const { data: events, isLoading } = trpc.attendance.list.useQuery(queryInput);
  // Resolve personId → fullName so the table doesn't surface raw UUIDs.
  // 500 matches the convention used by Onboarding / PropertyDetail.
  const { data: peopleRows } = trpc.people.list.useQuery({ limit: 500 });
  const personNameById = useMemo(() => {
    const m = new Map<string, string>();
    (peopleRows ?? []).forEach((p: any) => m.set(p.id, p.fullName));
    return m;
  }, [peopleRows]);
  const displayName = (personId: string) =>
    personNameById.get(personId) ?? `Person ${personId.slice(0, 8)}`;
  const [selectedDate] = useState(() => new Date().toLocaleDateString());

  const dailyRecords = useMemo(() => events ? deriveDailyView(events) : [], [events]);
  const todayRecords = dailyRecords.filter(r => r.date === selectedDate);
  const totalPresent = todayRecords.filter(r => r.checkIn).length;
  const avgHours = todayRecords.length > 0 ? (todayRecords.reduce((s, r) => s + r.totalHours, 0) / todayRecords.length).toFixed(1) : "0";
  const geoViolations = todayRecords.filter(r => !r.withinGeofence).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-navy">Attendance</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Shift tracking with GPS + selfie verification and supervisor override</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Present Today</p><p className="text-2xl font-semibold text-navy mt-1">{totalPresent}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avg Hours</p><p className="text-2xl font-semibold text-navy mt-1">{avgHours}h</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Geo Violations</p><p className="text-2xl font-semibold text-navy mt-1">{geoViolations}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Events</p><p className="text-2xl font-semibold text-navy mt-1">{events?.length || 0}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList className="bg-cream border border-border/50">
          <TabsTrigger value="daily"><Calendar className="h-4 w-4 mr-1.5" />Daily View</TabsTrigger>
          <TabsTrigger value="events"><Clock className="h-4 w-4 mr-1.5" />Raw Events</TabsTrigger>
          <TabsTrigger value="audit"><History className="h-4 w-4 mr-1.5" />Edit Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          {dailyRecords.length > 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow className="bg-cream/50">
                    <TableHead className="text-xs">Person</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Check In</TableHead>
                    <TableHead className="text-xs">Check Out</TableHead>
                    <TableHead className="text-xs">Break</TableHead>
                    <TableHead className="text-xs">Total</TableHead>
                    <TableHead className="text-xs">Geofence</TableHead>
                    <TableHead className="text-xs">Mode</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {dailyRecords.map((r, i) => (
                      <TableRow key={i} className="text-sm">
                        <TableCell className="font-medium">{displayName(r.personId)}</TableCell>
                        <TableCell>{r.date}</TableCell>
                        <TableCell>{r.checkIn ? new Date(r.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}</TableCell>
                        <TableCell>{r.checkOut ? new Date(r.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}</TableCell>
                        <TableCell>{r.breakMinutes}m</TableCell>
                        <TableCell className="font-medium">{r.totalHours}h</TableCell>
                        <TableCell>{r.withinGeofence ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-red-500" />}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{r.markMode}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No daily attendance records</p></CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="events" className="space-y-2">
          {events?.map((evt: any) => (
            <Card key={evt.id} className="border-border/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-navy/5 flex items-center justify-center"><Clock className="h-4 w-4 text-navy" /></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className={eventTypeColors[evt.eventType] || ""}>{evt.eventType.replace("_", " ")}</Badge>
                      <span className="text-xs text-muted-foreground">{evt.markMode?.replace("_", " ")}</span>
                      {evt.selfieUrl && <Camera className="h-3 w-3 text-muted-foreground" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{displayName(evt.personId)} · {evt.occurredAt ? new Date(evt.occurredAt).toLocaleString() : "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {evt.withinGeofence !== null && (
                    <Badge variant="outline" className={evt.withinGeofence ? "text-green-600" : "text-red-600"}>
                      <MapPin className="h-3 w-3 mr-1" />{evt.withinGeofence ? "In zone" : "Out"}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {!isLoading && (!events || events.length === 0) && (
            <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><Clock className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No shift events recorded yet</p></CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="audit" className="space-y-2">
          <Card className="border-border/50 bg-navy/5">
            <CardContent className="p-4 text-xs text-muted-foreground">
              <p className="font-medium text-foreground text-sm mb-1">Edit Audit Trail</p>
              <p>Every attendance edit is tracked with before/after values, reason code, editor identity, and approval status. Supervisor overrides require a documented reason.</p>
            </CardContent>
          </Card>
          {mockAuditTrail.map((entry) => (
            <Card key={entry.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">Person #{entry.personId}</Badge>
                      <span className="text-xs font-medium">{entry.field}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-xs">
                      <span className="line-through text-red-500">{entry.oldValue}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-green-600 font-medium">{entry.newValue}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Reason: {entry.reason}</p>
                    <p className="text-xs text-muted-foreground">By: {entry.editedBy} · {entry.editedAt}</p>
                  </div>
                  <Badge className={entry.status === "approved" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>
                    {entry.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
