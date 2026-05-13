import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, Users, BarChart3, Plus, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const roleAssignments = [
  { role: "Associate — Housekeeping", modules: ["Property Hygiene Standards", "Chemical Safety", "Guest Interaction"], assigned: 18, completed: 12 },
  { role: "Associate — Security", modules: ["Emergency Response", "Access Control", "Fire Safety"], assigned: 8, completed: 6 },
  { role: "Associate — Maintenance", modules: ["Electrical Safety", "Plumbing Basics", "HVAC Maintenance"], assigned: 5, completed: 3 },
  { role: "Operations Lead", modules: ["Leadership Fundamentals", "Conflict Resolution", "Reporting & Analytics"], assigned: 3, completed: 2 },
  { role: "Area Manager", modules: ["P&L Management", "Team Building", "SLA Compliance"], assigned: 2, completed: 1 },
];

const completionData = [
  { personId: 1, name: "Rahul Sharma", role: "Housekeeping", totalModules: 3, completed: 3, inProgress: 0, overdue: 0, lastActivity: "2026-05-10" },
  { personId: 2, name: "Priya Patel", role: "Security", totalModules: 3, completed: 2, inProgress: 1, overdue: 0, lastActivity: "2026-05-12" },
  { personId: 3, name: "Amit Kumar", role: "Maintenance", totalModules: 3, completed: 1, inProgress: 1, overdue: 1, lastActivity: "2026-04-28" },
  { personId: 4, name: "Sunita Devi", role: "Housekeeping", totalModules: 3, completed: 2, inProgress: 1, overdue: 0, lastActivity: "2026-05-11" },
  { personId: 5, name: "Vikram Singh", role: "Ops Lead", totalModules: 3, completed: 3, inProgress: 0, overdue: 0, lastActivity: "2026-05-09" },
];

export default function Training() {
  const { data: modules, isLoading } = trpc.training.modules.useQuery({});
  const totalModules = modules?.length || 0;
  const activeModules = modules?.filter((m: any) => m.active).length || 0;
  const mandatoryModules = modules?.filter((m: any) => m.mandatory).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy">Training & L&D</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Learning modules, role-based assignments, and completion tracking</p>
        </div>
        <Button className="bg-navy text-white hover:bg-navy/90" onClick={() => toast.info("Module creation form coming soon")}><Plus className="h-4 w-4 mr-2" />Add Module</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Modules</p><p className="text-2xl font-semibold text-navy mt-1">{totalModules}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active</p><p className="text-2xl font-semibold text-green-600 mt-1">{activeModules}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mandatory</p><p className="text-2xl font-semibold text-red-600 mt-1">{mandatoryModules}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avg Completion</p><p className="text-2xl font-semibold text-navy mt-1">72%</p></CardContent></Card>
      </div>

      <Tabs defaultValue="modules" className="space-y-4">
        <TabsList className="bg-cream border border-border/50">
          <TabsTrigger value="modules"><BookOpen className="h-4 w-4 mr-1.5" />Modules</TabsTrigger>
          <TabsTrigger value="assignments"><Users className="h-4 w-4 mr-1.5" />Role Assignments</TabsTrigger>
          <TabsTrigger value="tracking"><BarChart3 className="h-4 w-4 mr-1.5" />Completion Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="space-y-2">
          {modules?.map((m: any) => (
            <Card key={m.id} className="border-border/50 hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center"><BookOpen className="h-4 w-4 text-indigo-600" /></div>
                  <div>
                    <p className="font-medium text-sm">{m.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.completionType} · {m.active ? "Active" : "Inactive"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {m.mandatory && <Badge className="bg-red-100 text-red-700">Mandatory</Badge>}
                  <Badge variant="outline" className={m.active ? "text-green-600" : "text-gray-400"}>{m.active ? "Active" : "Inactive"}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {!isLoading && (!modules || modules.length === 0) && (
            <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><GraduationCap className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No training modules yet</p></CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="assignments" className="space-y-3">
          {roleAssignments.map((ra, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-sm">{ra.role}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{ra.modules.join(" · ")}</p>
                  </div>
                  <Badge variant="outline" className="text-xs"><Users className="h-3 w-3 mr-1" />{ra.assigned} assigned</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={(ra.completed / ra.assigned) * 100} className="flex-1 h-2" />
                  <span className="text-xs font-medium text-muted-foreground">{ra.completed}/{ra.assigned}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="tracking">
          <Card className="border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-cream/50">
                  <TableHead className="text-xs">Associate</TableHead>
                  <TableHead className="text-xs">Role</TableHead>
                  <TableHead className="text-xs text-center">Completed</TableHead>
                  <TableHead className="text-xs text-center">In Progress</TableHead>
                  <TableHead className="text-xs text-center">Overdue</TableHead>
                  <TableHead className="text-xs text-center">Progress</TableHead>
                  <TableHead className="text-xs">Last Activity</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {completionData.map(c => (
                    <TableRow key={c.personId} className="text-sm">
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{c.role}</Badge></TableCell>
                      <TableCell className="text-center"><span className="flex items-center justify-center gap-1 text-green-600"><CheckCircle2 className="h-3.5 w-3.5" />{c.completed}</span></TableCell>
                      <TableCell className="text-center"><span className="flex items-center justify-center gap-1 text-blue-600"><Clock className="h-3.5 w-3.5" />{c.inProgress}</span></TableCell>
                      <TableCell className="text-center">{c.overdue > 0 ? <span className="flex items-center justify-center gap-1 text-red-600"><AlertTriangle className="h-3.5 w-3.5" />{c.overdue}</span> : <span className="text-muted-foreground">0</span>}</TableCell>
                      <TableCell className="text-center"><Progress value={(c.completed / c.totalModules) * 100} className="w-16 h-2 mx-auto" /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.lastActivity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
