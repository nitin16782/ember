import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ClipboardCheck, UserPlus, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

const mockOnboardingData = [
  { id: 1, personName: "Rajesh Kumar", personId: 12, status: "in_progress" as const, items: { total: 8, done: 5 }, joinDate: "2026-05-10", blockerReason: null },
  { id: 2, personName: "Priya Sharma", personId: 15, status: "blocked" as const, items: { total: 8, done: 3 }, joinDate: "2026-05-08", blockerReason: "Aadhaar verification pending" },
  { id: 3, personName: "Amit Patel", personId: 18, status: "complete" as const, items: { total: 8, done: 8 }, joinDate: "2026-05-01", blockerReason: null },
  { id: 4, personName: "Sunita Devi", personId: 20, status: "in_progress" as const, items: { total: 8, done: 1 }, joinDate: "2026-05-12", blockerReason: null },
];

const statusConfig = {
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700", icon: Clock },
  blocked: { label: "Blocked", color: "bg-red-100 text-red-700", icon: AlertTriangle },
  complete: { label: "Complete", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
};

const checklistTemplate = [
  "Personal details verified",
  "ID documents uploaded",
  "Bank account details collected",
  "Emergency contact added",
  "Uniform issued",
  "Training module assigned",
  "Property assignment confirmed",
  "Digital ID card generated",
];

export default function Onboarding() {
  const inProgress = mockOnboardingData.filter(d => d.status === "in_progress").length;
  const blocked = mockOnboardingData.filter(d => d.status === "blocked").length;
  const completed = mockOnboardingData.filter(d => d.status === "complete").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-navy">Onboarding</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Track new joiner onboarding checklists and blockers</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-semibold text-blue-600">{inProgress}</p>
            <p className="text-xs text-muted-foreground mt-1">In Progress</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-semibold text-red-600">{blocked}</p>
            <p className="text-xs text-muted-foreground mt-1">Blocked</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-semibold text-green-600">{completed}</p>
            <p className="text-xs text-muted-foreground mt-1">Completed</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-navy" />Standard Checklist Template</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {checklistTemplate.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-5 w-5 rounded-full bg-navy/5 flex items-center justify-center text-[10px] font-medium text-navy">{i + 1}</span>
                {item}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {mockOnboardingData.map((entry) => {
          const config = statusConfig[entry.status];
          const Icon = config.icon;
          const pct = Math.round((entry.items.done / entry.items.total) * 100);
          return (
            <Card key={entry.id} className="border-border/50 hover:shadow-sm transition-shadow cursor-pointer" onClick={() => toast.info(`Opening onboarding for ${entry.personName}`)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-navy/5 flex items-center justify-center">
                      <UserPlus className="h-4 w-4 text-navy" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{entry.personName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Joined {entry.joinDate}</p>
                    </div>
                  </div>
                  <Badge className={config.color}><Icon className="h-3 w-3 mr-1" />{config.label}</Badge>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{entry.items.done}/{entry.items.total} items completed</span>
                    <span className="font-medium">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
                {entry.blockerReason && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                    <AlertTriangle className="h-3 w-3" />
                    {entry.blockerReason}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
