import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Calendar, Users, AlertTriangle, ArrowRightLeft, List, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  transferred: "bg-blue-100 text-blue-700",
  ended: "bg-gray-100 text-gray-500",
};

const mockCoverageGaps = [
  { property: "Villa Serenity", propertyId: 1, role: "Housekeeping", required: 3, assigned: 2, gap: 1, severity: "medium" },
  { property: "Ocean View Apt", propertyId: 2, role: "Security", required: 2, assigned: 0, gap: 2, severity: "critical" },
  { property: "Mountain Lodge", propertyId: 3, role: "Maintenance", required: 1, assigned: 1, gap: 0, severity: "ok" },
  { property: "City Center Hotel", propertyId: 4, role: "Housekeeping", required: 5, assigned: 4, gap: 1, severity: "low" },
];

const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1);
const mockCalendar: Record<number, { person: string; property: string; shift: string }[]> = {
  1: [{ person: "Rahul", property: "Villa Serenity", shift: "Morning" }],
  5: [{ person: "Priya", property: "Ocean View", shift: "Evening" }],
  10: [{ person: "Amit", property: "Mountain Lodge", shift: "Morning" }, { person: "Sunita", property: "Villa Serenity", shift: "Night" }],
  15: [{ person: "Rahul", property: "City Center", shift: "Morning" }],
  20: [{ person: "Vikram", property: "Villa Serenity", shift: "Morning" }],
};

const mockTransfers = [
  { id: 1, person: "Rahul Sharma", from: "Villa Serenity", to: "City Center Hotel", date: "2026-05-15", reason: "Coverage gap", status: "approved" },
  { id: 2, person: "Priya Patel", from: "Ocean View Apt", to: "Mountain Lodge", date: "2026-05-20", reason: "Skill match", status: "pending" },
];

export default function Roster() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: assignments, isLoading } = trpc.assignments.list.useQuery({});
  const utils = trpc.useUtils();

  const createAssignment = trpc.assignments.create.useMutation({
    onSuccess: () => { utils.assignments.list.invalidate(); setDialogOpen(false); toast.success("Assignment created"); },
    onError: (err: any) => toast.error(err.message),
  });

  const [form, setForm] = useState({ personId: "", propertyId: "", roleCode: "", startDate: "" });
  const totalAssigned = assignments?.filter((a: any) => a.status === "active").length || 0;
  const gaps = mockCoverageGaps.filter(g => g.gap > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy">Assignment Roster</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Coverage management, transfers, and calendar view</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button className="bg-navy text-white hover:bg-navy/90"><Plus className="h-4 w-4 mr-2" />Assign</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display text-navy">New Assignment</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Person ID</Label><Input type="number" value={form.personId} onChange={(e) => setForm({ ...form, personId: e.target.value })} /></div>
                <div className="space-y-2"><Label>Property ID</Label><Input type="number" value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Role Code</Label><Input value={form.roleCode} onChange={(e) => setForm({ ...form, roleCode: e.target.value })} placeholder="e.g. housekeeping" /></div>
              <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
              <Button onClick={() => { if (!form.personId || !form.propertyId) { toast.error("Person and property required"); return; } createAssignment.mutate({ personId: form.personId, propertyId: form.propertyId, roleCode: form.roleCode || "general", startDate: form.startDate || new Date().toISOString().split('T')[0] }); }} className="w-full bg-navy text-white hover:bg-navy/90" disabled={createAssignment.isPending}>
                {createAssignment.isPending ? "Assigning..." : "Create Assignment"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Assignments</p><p className="text-2xl font-semibold text-navy mt-1">{totalAssigned}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Coverage Gaps</p><p className="text-2xl font-semibold text-red-600 mt-1">{gaps}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending Transfers</p><p className="text-2xl font-semibold text-yellow-600 mt-1">{mockTransfers.filter(t => t.status === "pending").length}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Records</p><p className="text-2xl font-semibold text-navy mt-1">{assignments?.length || 0}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList className="bg-cream border border-border/50">
          <TabsTrigger value="list"><List className="h-4 w-4 mr-1.5" />Assignments</TabsTrigger>
          <TabsTrigger value="calendar"><Calendar className="h-4 w-4 mr-1.5" />Calendar</TabsTrigger>
          <TabsTrigger value="gaps"><AlertTriangle className="h-4 w-4 mr-1.5" />Coverage Gaps</TabsTrigger>
          <TabsTrigger value="transfers"><ArrowRightLeft className="h-4 w-4 mr-1.5" />Transfers</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-2">
          {assignments?.map((a: any) => (
            <Card key={a.id} className="border-border/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-navy/5 flex items-center justify-center"><Users className="h-4 w-4 text-navy" /></div>
                  <div>
                    <p className="font-medium text-sm">Person #{a.personId} → Property #{a.propertyId}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.roleCode || "No role"} · From {a.startDate ? String(a.startDate) : "—"}</p>
                  </div>
                </div>
                <Badge className={statusColors[a.status] || "bg-gray-100 text-gray-600"}>{a.status}</Badge>
              </CardContent>
            </Card>
          ))}
          {!isLoading && (!assignments || assignments.length === 0) && (
            <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No assignments yet</p></CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          <Card className="border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-navy">May 2026 — Assignment Calendar</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-7 gap-1 text-center">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (<div key={d} className="text-[10px] font-medium text-muted-foreground py-1">{d}</div>))}
                {Array.from({ length: 4 }, (_, i) => <div key={`pad-${i}`} />)}
                {calendarDays.map(day => {
                  const entries = mockCalendar[day] || [];
                  return (
                    <div key={day} className={`p-1.5 rounded text-xs min-h-[48px] ${entries.length > 0 ? "bg-navy/5 border border-navy/20" : "bg-cream/50"}`}>
                      <span className="font-medium">{day}</span>
                      {entries.map((e, i) => (<div key={i} className="text-[8px] text-navy mt-0.5 truncate">{e.person}</div>))}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gaps">
          <Card className="border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-cream/50">
                  <TableHead className="text-xs">Property</TableHead>
                  <TableHead className="text-xs">Role</TableHead>
                  <TableHead className="text-xs text-center">Required</TableHead>
                  <TableHead className="text-xs text-center">Assigned</TableHead>
                  <TableHead className="text-xs text-center">Gap</TableHead>
                  <TableHead className="text-xs text-center">Severity</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {mockCoverageGaps.map((g, i) => (
                    <TableRow key={i} className="text-sm">
                      <TableCell className="font-medium"><span className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-muted-foreground" />{g.property}</span></TableCell>
                      <TableCell>{g.role}</TableCell>
                      <TableCell className="text-center">{g.required}</TableCell>
                      <TableCell className="text-center">{g.assigned}</TableCell>
                      <TableCell className="text-center font-semibold">{g.gap > 0 ? <span className="text-red-600">{g.gap}</span> : <span className="text-green-600">0</span>}</TableCell>
                      <TableCell className="text-center"><Badge className={g.severity === "critical" ? "bg-red-100 text-red-700" : g.severity === "medium" ? "bg-yellow-100 text-yellow-700" : g.severity === "low" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}>{g.severity}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers" className="space-y-2">
          {mockTransfers.map(t => (
            <Card key={t.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{t.person}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{t.from}</span><ArrowRightLeft className="h-3 w-3" /><span>{t.to}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Date: {t.date} · Reason: {t.reason}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={t.status === "approved" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>{t.status}</Badge>
                    {t.status === "pending" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toast.info("Transfer approval flow coming soon")}>Approve</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
