import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Clock } from "lucide-react";
import { useState, useMemo } from "react";

const actionColors: Record<string, string> = {
  create: "bg-green-100 text-green-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
  approve: "bg-emerald-100 text-emerald-700",
  reject: "bg-orange-100 text-orange-700",
};

export default function AuditLog() {
  const [entityFilter, setEntityFilter] = useState("all");
  const queryInput = useMemo(() => ({
    entityType: entityFilter !== "all" ? entityFilter : undefined,
    limit: 100,
  }), [entityFilter]);

  const { data: logs, isLoading } = trpc.auditLog.list.useQuery(queryInput);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy">Audit Log</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Complete trail of every state-changing action</p>
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Entity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            <SelectItem value="person">Person</SelectItem>
            <SelectItem value="property">Property</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="leave_application">Leave</SelectItem>
            <SelectItem value="invoice">Invoice</SelectItem>
            <SelectItem value="candidate">Candidate</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {logs?.map((log: any) => (
          <Card key={log.id} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-gray-50 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className={actionColors[log.action] || "bg-gray-100 text-gray-600"}>{log.action}</Badge>
                      <span className="text-sm font-medium">{log.entityType} #{log.entityId}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>Actor #{log.actorId}</span>
                      <span>·</span>
                      <span>{log.actorRole}</span>
                      {log.reasonCode && <><span>·</span><span>{log.reasonCode}</span></>}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && (!logs || logs.length === 0) && (
          <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><Shield className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No audit entries yet</p><p className="text-xs text-muted-foreground mt-1">Every state-changing action will be logged here</p></CardContent></Card>
        )}
      </div>
    </div>
  );
}
