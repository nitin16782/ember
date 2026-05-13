import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, IndianRupee, MapPin, ShieldAlert, TrendingDown, Users, Package, ClipboardCheck } from "lucide-react";

function AnomalyCard({ title, icon: Icon, items, color }: { title: string; icon: any; items: { label: string; value: number; severity: "low" | "medium" | "high" }[]; color: string }) {
  const severityColors = {
    low: "bg-yellow-100 text-yellow-700",
    medium: "bg-orange-100 text-orange-700",
    high: "bg-red-100 text-red-700",
  };
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-display flex items-center gap-2 text-navy">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${color}`}><Icon className="h-4 w-4" /></div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
            <span className="text-xs text-muted-foreground">{item.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{item.value}</span>
              {item.value > 0 && <Badge className={`text-[10px] px-1.5 py-0 ${severityColors[item.severity]}`}>{item.severity}</Badge>}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function Anomalies() {
  const { data, isLoading } = trpc.anomalies.dashboard.useQuery();

  const totalAnomalies = data
    ? (data.attendanceAnomalies.noCheckIn3Days + data.attendanceAnomalies.lateCheckIns + data.attendanceAnomalies.missedCheckOuts +
       data.financialAnomalies.overdueInvoices + data.financialAnomalies.unusualExpenses + data.financialAnomalies.pendingReconciliation +
       data.operationalAnomalies.coverageGaps + data.operationalAnomalies.overdueChecklists + data.operationalAnomalies.lowInventory)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-navy">Anomaly Detection</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Cross-module anomaly monitoring and early warning system</p>
      </div>

      {/* Summary Banner */}
      <Card className={`border-border/50 ${totalAnomalies > 0 ? "bg-red-50/50 border-red-200/50" : "bg-green-50/50 border-green-200/50"}`}>
        <CardContent className="p-4 flex items-center gap-4">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${totalAnomalies > 0 ? "bg-red-100" : "bg-green-100"}`}>
            <ShieldAlert className={`h-6 w-6 ${totalAnomalies > 0 ? "text-red-600" : "text-green-600"}`} />
          </div>
          <div>
            <p className="font-display font-semibold text-navy">{totalAnomalies > 0 ? `${totalAnomalies} Active Anomalies Detected` : "All Systems Normal"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalAnomalies > 0 ? "Review and resolve the flagged items below" : "No anomalies detected across attendance, finance, and operations"}
            </p>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Card key={i} className="border-border/50 h-48 animate-pulse bg-muted/20" />)}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AnomalyCard
            title="Attendance Anomalies"
            icon={Clock}
            color="bg-blue-50 text-blue-600"
            items={[
              { label: "No check-in for 3+ days", value: data.attendanceAnomalies.noCheckIn3Days, severity: "high" },
              { label: "Late check-ins (this week)", value: data.attendanceAnomalies.lateCheckIns, severity: "medium" },
              { label: "Missed check-outs", value: data.attendanceAnomalies.missedCheckOuts, severity: "medium" },
            ]}
          />
          <AnomalyCard
            title="Financial Anomalies"
            icon={IndianRupee}
            color="bg-gold/10 text-gold"
            items={[
              { label: "Overdue invoices", value: data.financialAnomalies.overdueInvoices, severity: "high" },
              { label: "Unusual expense amounts", value: data.financialAnomalies.unusualExpenses, severity: "medium" },
              { label: "Pending reconciliation", value: data.financialAnomalies.pendingReconciliation, severity: "low" },
            ]}
          />
          <AnomalyCard
            title="Operational Anomalies"
            icon={MapPin}
            color="bg-navy/10 text-navy"
            items={[
              { label: "Coverage gaps", value: data.operationalAnomalies.coverageGaps, severity: "high" },
              { label: "Overdue checklists", value: data.operationalAnomalies.overdueChecklists, severity: "medium" },
              { label: "Low inventory items", value: data.operationalAnomalies.lowInventory, severity: "low" },
            ]}
          />
        </div>
      ) : null}

      {/* Scheduled Jobs Info */}
      <Card className="border-border/50 bg-navy/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3"><AlertTriangle className="h-4 w-4 text-gold" /><span className="text-sm font-medium text-navy">Automated Detection Jobs</span></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-lg p-3 border border-border/30">
              <div className="flex items-center gap-2 mb-1"><Users className="h-3.5 w-3.5 text-navy" /><span className="text-xs font-medium">Absconding Detection</span></div>
              <p className="text-[10px] text-muted-foreground">Flags associates with no attendance for 3+ consecutive days. Runs daily at 6:00 AM.</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-border/30">
              <div className="flex items-center gap-2 mb-1"><TrendingDown className="h-3.5 w-3.5 text-navy" /><span className="text-xs font-medium">ID Card Expiry</span></div>
              <p className="text-[10px] text-muted-foreground">Auto-revokes expired ID cards and flags upcoming expirations. Runs daily at midnight.</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-border/30">
              <div className="flex items-center gap-2 mb-1"><Package className="h-3.5 w-3.5 text-navy" /><span className="text-xs font-medium">Referral Milestones</span></div>
              <p className="text-[10px] text-muted-foreground">Checks 30-day and 90-day retention milestones for referral bounty eligibility. Runs daily.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
