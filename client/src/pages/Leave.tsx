import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarOff, Check, X } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
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
    onError: (err) => toast.error(err.message),
  });

  const rejectMutation = trpc.leave.reject.useMutation({
    onSuccess: () => { utils.leave.list.invalidate(); toast.success("Leave rejected"); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy">Leave Management</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Review and manage leave applications</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Filter" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {applications?.map((app) => (
          <Card key={app.id} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-red-50 flex items-center justify-center">
                    <CalendarOff className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Person #{app.personId} — {app.leaveType}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {String(app.fromDate)} to {String(app.toDate)} · {app.days} day(s)
                    </p>
                    {app.reason && <p className="text-xs text-muted-foreground mt-0.5 italic">"{app.reason}"</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={statusColors[app.status]}>{app.status}</Badge>
                  {app.status === "pending" && (
                    <div className="flex gap-1 ml-2">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600 hover:bg-green-50" onClick={() => approveMutation.mutate({ id: app.id })}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600 hover:bg-red-50" onClick={() => rejectMutation.mutate({ id: app.id })}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && (!applications || applications.length === 0) && (
          <Card className="border-border/50 border-dashed">
            <CardContent className="p-12 text-center">
              <CalendarOff className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No leave applications</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
