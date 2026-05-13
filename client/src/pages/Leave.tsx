import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CalendarOff, Check, X, Calendar, Settings, BarChart3, Plus } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const leavePolicies = [
  { type: "Casual Leave", code: "CL", annual: 12, accrual: "monthly", carryForward: false, maxCarry: 0, encashable: false, probationEligible: false },
  { type: "Earned Leave", code: "EL", annual: 15, accrual: "monthly", carryForward: true, maxCarry: 30, encashable: true, probationEligible: false },
  { type: "Sick Leave", code: "SL", annual: 10, accrual: "yearly", carryForward: false, maxCarry: 0, encashable: false, probationEligible: true },
  { type: "Compensatory Off", code: "CO", annual: 0, accrual: "earned", carryForward: false, maxCarry: 0, encashable: false, probationEligible: true },
  { type: "Maternity Leave", code: "ML", annual: 182, accrual: "event", carryForward: false, maxCarry: 0, encashable: false, probationEligible: false },
  { type: "Paternity Leave", code: "PL", annual: 15, accrual: "event", carryForward: false, maxCarry: 0, encashable: false, probationEligible: false },
];

const mockBalances = [
  { personId: 1, name: "Rahul Sharma", CL: { total: 12, used: 3, balance: 9 }, EL: { total: 15, used: 5, balance: 10 }, SL: { total: 10, used: 1, balance: 9 } },
  { personId: 2, name: "Priya Patel", CL: { total: 12, used: 7, balance: 5 }, EL: { total: 15, used: 2, balance: 13 }, SL: { total: 10, used: 0, balance: 10 } },
  { personId: 3, name: "Amit Kumar", CL: { total: 12, used: 12, balance: 0 }, EL: { total: 15, used: 10, balance: 5 }, SL: { total: 10, used: 4, balance: 6 } },
];

const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1);
const mockCalendarLeaves: Record<number, { personId: number; type: string }[]> = {
  5: [{ personId: 1, type: "CL" }],
  6: [{ personId: 1, type: "CL" }],
  12: [{ personId: 2, type: "EL" }, { personId: 3, type: "SL" }],
  13: [{ personId: 2, type: "EL" }],
  20: [{ personId: 3, type: "CL" }],
  25: [{ personId: 1, type: "EL" }, { personId: 2, type: "CL" }, { personId: 3, type: "EL" }],
};

export default function Leave() {
  const [statusFilter, setStatusFilter] = useState("all");
  const queryInput = useMemo(() => ({
    status: statusFilter !== "all" ? statusFilter : undefined,
    limit: 50,
  }), [statusFilter]);

  const { data: applications, isLoading } = trpc.leave.list.useQuery(queryInput);
  const utils = trpc.useUtils();

  const approveMutation = trpc.leave.approve.useMutation({
    onSuccess: () => { utils.leave.list.invalidate(); toast.success("Leave approved"); },
    onError: (err: any) => toast.error(err.message),
  });
  const rejectMutation = trpc.leave.reject.useMutation({
    onSuccess: () => { utils.leave.list.invalidate(); toast.success("Leave rejected"); },
    onError: (err: any) => toast.error(err.message),
  });

  const pending = applications?.filter(a => a.status === "pending").length || 0;
  const approved = applications?.filter(a => a.status === "approved").length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-navy">Leave Management</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Policies, balances, approvals, and calendar view</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending</p><p className="text-2xl font-semibold text-yellow-600 mt-1">{pending}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Approved</p><p className="text-2xl font-semibold text-green-600 mt-1">{approved}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Policies</p><p className="text-2xl font-semibold text-navy mt-1">{leavePolicies.length}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Apps</p><p className="text-2xl font-semibold text-navy mt-1">{applications?.length || 0}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="applications" className="space-y-4">
        <TabsList className="bg-cream border border-border/50 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="applications"><CalendarOff className="h-4 w-4 mr-1.5" />Applications</TabsTrigger>
          <TabsTrigger value="calendar"><Calendar className="h-4 w-4 mr-1.5" />Calendar</TabsTrigger>
          <TabsTrigger value="balances"><BarChart3 className="h-4 w-4 mr-1.5" />Balances</TabsTrigger>
          <TabsTrigger value="policies"><Settings className="h-4 w-4 mr-1.5" />Policies</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="space-y-3">
          <div className="flex justify-end">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Filter" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {applications?.map((app: any) => (
            <Card key={app.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-red-50 flex items-center justify-center"><CalendarOff className="h-4 w-4 text-red-600" /></div>
                    <div>
                      <p className="font-medium text-sm">Person #{app.personId} — {app.leaveType}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{String(app.fromDate)} to {String(app.toDate)} · {app.days} day(s)</p>
                      {app.reason && <p className="text-xs text-muted-foreground mt-0.5 italic">"{app.reason}"</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[app.status]}>{app.status}</Badge>
                    {app.status === "pending" && (
                      <div className="flex gap-1 ml-2">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600 hover:bg-green-50" onClick={() => approveMutation.mutate({ id: app.id })}><Check className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600 hover:bg-red-50" onClick={() => rejectMutation.mutate({ id: app.id })}><X className="h-4 w-4" /></Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {!isLoading && (!applications || applications.length === 0) && (
            <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><CalendarOff className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No leave applications</p></CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          <Card className="border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-navy">May 2026 — Leave Calendar</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-7 gap-1 text-center">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                  <div key={d} className="text-[10px] font-medium text-muted-foreground py-1">{d}</div>
                ))}
                {Array.from({ length: 4 }, (_, i) => <div key={`pad-${i}`} />)}
                {calendarDays.map(day => {
                  const leaves = mockCalendarLeaves[day] || [];
                  return (
                    <div key={day} className={`p-1.5 rounded text-xs min-h-[40px] ${leaves.length > 0 ? "bg-red-50 border border-red-200" : "bg-cream/50"}`}>
                      <span className={`font-medium ${leaves.length > 0 ? "text-red-700" : ""}`}>{day}</span>
                      {leaves.length > 0 && <div className="text-[9px] text-red-500 mt-0.5">{leaves.length} off</div>}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balances">
          <Card className="border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-cream/50">
                  <TableHead className="text-xs">Associate</TableHead>
                  <TableHead className="text-xs text-center">CL</TableHead>
                  <TableHead className="text-xs text-center">EL</TableHead>
                  <TableHead className="text-xs text-center">SL</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {mockBalances.map(b => (
                    <TableRow key={b.personId} className="text-sm">
                      <TableCell className="font-medium">{b.name}</TableCell>
                      <TableCell className="text-center"><span className="text-green-600 font-medium">{b.CL.balance}</span><span className="text-muted-foreground text-xs">/{b.CL.total}</span></TableCell>
                      <TableCell className="text-center"><span className="text-green-600 font-medium">{b.EL.balance}</span><span className="text-muted-foreground text-xs">/{b.EL.total}</span></TableCell>
                      <TableCell className="text-center"><span className="text-green-600 font-medium">{b.SL.balance}</span><span className="text-muted-foreground text-xs">/{b.SL.total}</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="space-y-3">
          <Card className="border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-cream/50">
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs text-center">Annual</TableHead>
                  <TableHead className="text-xs text-center">Accrual</TableHead>
                  <TableHead className="text-xs text-center">Carry Fwd</TableHead>
                  <TableHead className="text-xs text-center">Encash</TableHead>
                  <TableHead className="text-xs text-center">Probation</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {leavePolicies.map(p => (
                    <TableRow key={p.code} className="text-sm">
                      <TableCell><span className="font-medium">{p.type}</span> <Badge variant="outline" className="text-[10px] ml-1">{p.code}</Badge></TableCell>
                      <TableCell className="text-center">{p.annual === 0 ? "—" : p.annual}</TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className="text-[10px]">{p.accrual}</Badge></TableCell>
                      <TableCell className="text-center">{p.carryForward ? <Check className="h-4 w-4 text-green-500 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />}</TableCell>
                      <TableCell className="text-center">{p.encashable ? <Check className="h-4 w-4 text-green-500 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />}</TableCell>
                      <TableCell className="text-center">{p.probationEligible ? <Check className="h-4 w-4 text-green-500 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Button variant="outline" className="w-full" onClick={() => toast.info("Policy editor coming soon")}><Plus className="h-4 w-4 mr-2" />Add Leave Policy</Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
