import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, CheckCircle2, Circle } from "lucide-react";

export default function DailyOps() {
  const { data: entries, isLoading } = trpc.dailyOps.checklists.useQuery({});

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-navy">Daily Operations</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Checklists, task logs, and daily property operations</p>
      </div>
      <div className="space-y-2">
        {entries?.map((entry) => (
          <Card key={entry.id} className="border-border/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center">
                  {entry.status === "reviewed" || entry.status === "submitted" ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4 text-amber-600" />}
                </div>
                <div>
                  <p className="font-medium text-sm">Property #{entry.propertyId} — {String(entry.checklistDate)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{entry.submittedAt ? `Submitted ${new Date(entry.submittedAt).toLocaleString()}` : "Not submitted"}</p>
                </div>
              </div>
              <Badge className={entry.status === "reviewed" ? "bg-green-100 text-green-700" : entry.status === "flagged" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}>
                {entry.status}
              </Badge>
            </CardContent>
          </Card>
        ))}
        {!isLoading && (!entries || entries.length === 0) && (
          <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><ClipboardList className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No daily ops entries yet</p></CardContent></Card>
        )}
      </div>
    </div>
  );
}
