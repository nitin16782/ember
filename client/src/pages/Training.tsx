import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, BookOpen } from "lucide-react";

export default function Training() {
  const { data: modules, isLoading } = trpc.training.modules.useQuery({});

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-navy">Training & L&D</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Learning modules and completion tracking</p>
      </div>
      <div className="space-y-2">
        {modules?.map((m) => (
          <Card key={m.id} className="border-border/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center"><BookOpen className="h-4 w-4 text-indigo-600" /></div>
                <div>
                  <p className="font-medium text-sm">{m.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{m.completionType} · {m.active ? "Active" : "Inactive"}</p>
                </div>
              </div>
              {m.mandatory && <Badge className="bg-red-100 text-red-700">Mandatory</Badge>}
            </CardContent>
          </Card>
        ))}
        {!isLoading && (!modules || modules.length === 0) && (
          <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><GraduationCap className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No training modules yet</p></CardContent></Card>
        )}
      </div>
    </div>
  );
}
