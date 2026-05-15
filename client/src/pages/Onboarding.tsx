import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ClipboardCheck, UserPlus, AlertTriangle, CheckCircle2, Clock, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700", icon: Clock },
  blocked: { label: "Blocked", color: "bg-red-100 text-red-700", icon: AlertTriangle },
  complete: { label: "Complete", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
};

const defaultChecklist = [
  "Personal details verified",
  "ID documents uploaded",
  "Bank account details collected",
  "Emergency contact added",
  "Uniform issued",
  "Training module assigned",
  "Property assignment confirmed",
  "Digital ID card generated",
];

type PickerPerson = { id: string; fullName: string; employeeCode?: string | null; primaryPhone?: string | null; staffType?: string | null };

export default function Onboarding() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: checklists, isLoading } = trpc.onboarding.list.useQuery({});
  const { data: peopleList } = trpc.people.list.useQuery({ limit: 500 });
  const [form, setForm] = useState({ personId: "", templateName: "Standard" });
  const [personSearch, setPersonSearch] = useState("");
  const utils = trpc.useUtils();
  const createChecklist = trpc.onboarding.create.useMutation({
    onSuccess: () => { utils.onboarding.list.invalidate(); setDialogOpen(false); setForm({ personId: "", templateName: "Standard" }); setPersonSearch(""); toast.success("Onboarding checklist created"); },
    onError: (e) => toast.error(e.message),
  });

  const people = (peopleList ?? []) as PickerPerson[];
  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const selectedPerson = form.personId ? peopleById.get(form.personId) : null;
  const filteredPeople = useMemo(() => {
    const q = personSearch.trim().toLowerCase();
    if (!q) return people.slice(0, 20);
    return people
      .filter((p) =>
        p.fullName.toLowerCase().includes(q) ||
        (p.employeeCode ?? "").toLowerCase().includes(q) ||
        (p.primaryPhone ?? "").toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [people, personSearch]);

  const inProgress = checklists?.filter((c: any) => c.status === "in_progress" || c.status === "pending").length ?? 0;
  const blocked = checklists?.filter((c: any) => c.status === "blocked").length ?? 0;
  const completed = checklists?.filter((c: any) => c.status === "complete").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy">Onboarding</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Track new joiner onboarding checklists and blockers</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-navy text-white hover:bg-navy/90"><Plus className="h-4 w-4 mr-2" />New Checklist</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display text-navy">Create Onboarding Checklist</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Associate *</Label>
                {selectedPerson ? (
                  <div className="flex items-center justify-between rounded-md border border-border/50 bg-cream px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-navy truncate">{selectedPerson.fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {selectedPerson.employeeCode ? <span className="font-mono mr-2">{selectedPerson.employeeCode}</span> : null}
                        {selectedPerson.primaryPhone ?? ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => { setForm({ ...form, personId: "" }); setPersonSearch(""); }}
                      aria-label="Clear selection"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        autoFocus
                        placeholder="Search by name, employee ID, or phone"
                        value={personSearch}
                        onChange={(e) => setPersonSearch(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto rounded-md border border-border/50 divide-y divide-border/30">
                      {filteredPeople.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">No associates match.</div>
                      ) : (
                        filteredPeople.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-cream"
                            onClick={() => setForm({ ...form, personId: p.id })}
                          >
                            <p className="text-sm font-medium text-navy">{p.fullName}</p>
                            <p className="text-xs text-muted-foreground">
                              {p.employeeCode ? <span className="font-mono mr-2">{p.employeeCode}</span> : null}
                              {p.primaryPhone ?? ""}
                              {p.staffType ? <span className="ml-2 text-[10px] uppercase">· {p.staffType.replace("_", " ")}</span> : null}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
              <div className="space-y-2"><Label>Template Name</Label><Input value={form.templateName} onChange={(e) => setForm({ ...form, templateName: e.target.value })} /></div>
              <div className="bg-navy/5 rounded-lg p-3 space-y-1">
                <p className="text-xs font-medium text-navy">Checklist Items (8 items)</p>
                {defaultChecklist.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="h-4 w-4 rounded border border-border/50 flex items-center justify-center text-[9px]">{i + 1}</span>{item}
                  </div>
                ))}
              </div>
              <Button
                onClick={() => createChecklist.mutate({
                  personId: form.personId,
                  templateName: form.templateName,
                  items: defaultChecklist.map(item => ({ label: item, done: false })),
                })}
                disabled={!form.personId || createChecklist.isPending}
                className="w-full bg-navy text-white hover:bg-navy/90"
              >{createChecklist.isPending ? "Creating..." : "Create Checklist"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border/50"><CardContent className="p-4 text-center"><p className="text-2xl font-semibold text-blue-600">{inProgress}</p><p className="text-xs text-muted-foreground mt-1">In Progress</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><p className="text-2xl font-semibold text-red-600">{blocked}</p><p className="text-xs text-muted-foreground mt-1">Blocked</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><p className="text-2xl font-semibold text-green-600">{completed}</p><p className="text-xs text-muted-foreground mt-1">Completed</p></CardContent></Card>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-navy" />Standard Checklist Template</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {defaultChecklist.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-5 w-5 rounded-full bg-navy/5 flex items-center justify-center text-[10px] font-medium text-navy">{i + 1}</span>
                {item}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {checklists?.map((entry: any) => {
          const config = statusConfig[entry.status] || statusConfig.pending;
          const Icon = config.icon;
          const items = (entry.items && typeof entry.items === "object" && Array.isArray(entry.items)) ? entry.items : [];
          const doneCount = items.filter((i: any) => i.done).length;
          const totalCount = items.length || 1;
          const pct = Math.round((doneCount / totalCount) * 100);
          return (
            <Card key={entry.id} className="border-border/50 hover:shadow-sm transition-shadow cursor-pointer" onClick={() => toast.info(`Opening onboarding #${entry.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-navy/5 flex items-center justify-center"><UserPlus className="h-4 w-4 text-navy" /></div>
                    <div>
                      <p className="font-medium text-sm">
                        {peopleById.get(entry.personId)?.fullName ?? "Unknown associate"}
                        {peopleById.get(entry.personId)?.employeeCode ? (
                          <span className="ml-2 font-mono text-xs text-muted-foreground">
                            {peopleById.get(entry.personId)!.employeeCode}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{entry.templateName || "Standard"} · Created {String(entry.createdAt).slice(0, 10)}</p>
                    </div>
                  </div>
                  <Badge className={config.color}><Icon className="h-3 w-3 mr-1" />{config.label}</Badge>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{doneCount}/{totalCount} items completed</span>
                    <span className="font-medium">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!isLoading && (!checklists || checklists.length === 0) && (
          <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><UserPlus className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No onboarding checklists yet</p></CardContent></Card>
        )}
      </div>
    </div>
  );
}
