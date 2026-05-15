import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Phone, Mail, MapPin, Calendar, Briefcase, CreditCard, ClipboardCheck, FileText, History, CheckCircle2, Clock, AlertTriangle, KeyRound } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useAuth, type Role } from "@/contexts/AuthContext";
import { toast } from "sonner";

function formatField(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (val instanceof Date) return val.toLocaleDateString();
  return String(val);
}

const PIN_ADMIN_ROLES: Role[] = ["super_admin", "central_admin", "ops_lead"];

export default function PersonDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const id = params.id ?? "";
  const { user: currentUser } = useAuth();
  const canSetPin = currentUser ? PIN_ADMIN_ROLES.includes(currentUser.role) : false;
  const { data: person, isLoading } = trpc.people.get.useQuery({ id }, { enabled: !!id });
  const { data: onboardingItems } = trpc.onboarding.list.useQuery({ personId: id }, { enabled: !!id });
  const { data: contracts } = trpc.contracts.list.useQuery({ personId: id }, { enabled: !!id });
  const { data: auditEntries } = trpc.auditLog.list.useQuery({ entityType: "person", entityId: id }, { enabled: !!id });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!person) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setLocation("/people")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Associates
        </Button>
        <p className="text-muted-foreground">Associate not found.</p>
      </div>
    );
  }

  const onboardingChecklist = onboardingItems?.[0];
  const checklistItems = (onboardingChecklist?.items && Array.isArray(onboardingChecklist.items)) ? onboardingChecklist.items as { label: string; done: boolean }[] : [];
  const doneCount = checklistItems.filter(i => i.done).length;
  const totalCount = checklistItems.length || 1;
  const onboardingPct = Math.round((doneCount / totalCount) * 100);

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => setLocation("/people")} className="gap-2 -ml-2">
        <ArrowLeft className="h-4 w-4" /> Back to Associates
      </Button>

      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="flex items-start gap-5">
            <div className="h-16 w-16 rounded-full bg-navy/10 flex items-center justify-center shrink-0">
              <span className="text-xl font-semibold text-navy">
                {person.fullName?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-xl font-semibold text-navy">{person.fullName}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {person.employeeCode ? (
                  <span className="font-mono mr-2">{person.employeeCode}</span>
                ) : null}
                {person.designation || "No designation"}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge className={person.employmentStatus === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
                  {person.employmentStatus?.replace("_", " ")}
                </Badge>
                <Badge variant="outline">{person.staffType?.replace("_", " ")}</Badge>
              </div>
            </div>
            {canSetPin && person.staffType === "associate" && (
              <SetPinButton personId={person.id} personName={person.fullName} />
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-cream border border-border/50 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="onboarding"><ClipboardCheck className="h-3.5 w-3.5 mr-1" />Onboarding</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="h-3.5 w-3.5 mr-1" />Documents</TabsTrigger>
          <TabsTrigger value="salary"><CreditCard className="h-3.5 w-3.5 mr-1" />Salary</TabsTrigger>
          <TabsTrigger value="history"><History className="h-3.5 w-3.5 mr-1" />History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow icon={Phone} label="Phone" value={formatField(person.primaryPhone)} />
                <InfoRow icon={Phone} label="Alt Phone" value={formatField(person.alternatePhone)} />
                <InfoRow icon={Mail} label="Email" value={formatField(person.email)} />
                <InfoRow icon={MapPin} label="Address" value={formatField(person.currentAddress)} />
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Employment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow icon={Calendar} label="Joining Date" value={formatField(person.joiningDate)} />
                <InfoRow icon={Briefcase} label="Staff Type" value={formatField(person.staffType)?.replace("_", " ")} />
                <InfoRow icon={Briefcase} label="Source" value={formatField(person.source)} />
                <InfoRow icon={CreditCard} label="Salary" value={person.currentSalary ? `₹${Number(person.currentSalary).toLocaleString()}` : "—"} />
              </CardContent>
            </Card>
          </div>
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Identity & Banking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div><p className="text-xs text-muted-foreground">Aadhaar</p><p className="text-sm font-medium mt-0.5">{person.aadhaarMasked || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">PAN</p><p className="text-sm font-medium mt-0.5">{person.pan || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Bank Account</p><p className="text-sm font-medium mt-0.5">{person.bankAccount || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">IFSC</p><p className="text-sm font-medium mt-0.5">{person.bankIfsc || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Bank Name</p><p className="text-sm font-medium mt-0.5">{person.bankName || "—"}</p></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="onboarding" className="space-y-4">
          {onboardingChecklist ? (
            <>
              <Card className="border-border/50">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-navy/5 flex items-center justify-center">
                        <ClipboardCheck className="h-4 w-4 text-navy" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Onboarding Checklist</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Created {String(onboardingChecklist.createdAt).slice(0, 10)}</p>
                      </div>
                    </div>
                    <Badge className={
                      onboardingChecklist.status === "complete" ? "bg-green-100 text-green-700" :
                      onboardingChecklist.status === "blocked" ? "bg-red-100 text-red-700" :
                      "bg-blue-100 text-blue-700"
                    }>
                      {onboardingChecklist.status === "complete" ? <CheckCircle2 className="h-3 w-3 mr-1" /> :
                       onboardingChecklist.status === "blocked" ? <AlertTriangle className="h-3 w-3 mr-1" /> :
                       <Clock className="h-3 w-3 mr-1" />}
                      {onboardingChecklist.status?.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{doneCount}/{checklistItems.length} items completed</span>
                      <span className="font-medium">{onboardingPct}%</span>
                    </div>
                    <Progress value={onboardingPct} className="h-1.5" />
                  </div>
                </CardContent>
              </Card>
              <div className="space-y-1.5">
                {checklistItems.map((item, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border border-border/50 ${item.done ? "bg-green-50/50" : "bg-background"}`}>
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${item.done ? "bg-green-100" : "bg-gray-100"}`}>
                      {item.done ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <span className="text-xs text-muted-foreground">{i + 1}</span>}
                    </div>
                    <span className={`text-sm ${item.done ? "text-green-700 line-through" : "text-foreground"}`}>{item.label}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Card className="border-border/50 border-dashed">
              <CardContent className="p-12 text-center">
                <ClipboardCheck className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No onboarding checklist for this associate</p>
                <p className="text-xs text-muted-foreground mt-1">Create one from the Onboarding module</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-2">
          {contracts && contracts.length > 0 ? (
            contracts.map((c: any) => (
              <Card key={c.id} className="border-border/50">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-navy/5 flex items-center justify-center"><FileText className="h-4 w-4 text-navy" /></div>
                    <div>
                      <p className="font-medium text-sm">{c.contractType} Contract</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Start: {c.startDate}{c.endDate ? ` · End: ${c.endDate}` : ""}</p>
                    </div>
                  </div>
                  <Badge className={c.status === "signed" || c.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>{c.status}</Badge>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No contracts or documents for this associate</p></CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="salary">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Current Salary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-navy/5 rounded-lg text-center">
                  <p className="text-2xl font-semibold text-navy">{person.currentSalary ? `₹${Number(person.currentSalary).toLocaleString()}` : "—"}</p>
                  <p className="text-xs text-muted-foreground mt-1">Monthly CTC</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <p className="text-2xl font-semibold text-green-700">{person.staffType === "full_time" ? "Monthly" : "Daily"}</p>
                  <p className="text-xs text-muted-foreground mt-1">Pay Cycle</p>
                </div>
                <div className="p-4 bg-gold/5 rounded-lg text-center">
                  <p className="text-2xl font-semibold text-gold">{person.staffType?.replace("_", " ")}</p>
                  <p className="text-xs text-muted-foreground mt-1">Worker Type</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-2">
          {auditEntries && auditEntries.length > 0 ? (
            auditEntries.map((entry: any) => (
              <Card key={entry.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-navy/5 flex items-center justify-center"><History className="h-3.5 w-3.5 text-navy" /></div>
                      <div>
                        <p className="text-sm font-medium">{entry.action}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">By {entry.actorRole || "system"} · {String(entry.createdAt).slice(0, 19).replace("T", " ")}</p>
                      </div>
                    </div>
                    {entry.reasonCode && <Badge variant="outline" className="text-xs">{entry.reasonCode}</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><History className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No audit history for this associate</p></CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm truncate">{value}</p>
      </div>
    </div>
  );
}

function SetPinButton({ personId, personName }: { personId: string; personName: string }) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const setPinMut = trpc.auth.setAssociatePin.useMutation();

  const valid = /^\d{6}$/.test(pin) && pin === confirm;

  async function submit() {
    setError(null);
    if (!/^\d{6}$/.test(pin)) { setError("PIN must be 6 digits"); return; }
    if (pin !== confirm) { setError("PINs don't match"); return; }
    try {
      await setPinMut.mutateAsync({ personId, pin });
      toast.success(`PIN set for ${personName}. They'll be asked to change it on first sign-in.`);
      setOpen(false);
      setPin(""); setConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set PIN");
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2 shrink-0">
        <KeyRound className="h-4 w-4" /> Set PIN
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set PIN for {personName}</DialogTitle>
            <DialogDescription>
              The associate will be asked to choose a new PIN the first time they sign in.
              Share this PIN with them privately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newPin">Temporary PIN (6 digits)</Label>
              <Input
                id="newPin" type="text" inputMode="numeric" maxLength={6} pattern="\d{6}"
                value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                className="text-center text-2xl tracking-[0.4em] font-['Consolas',monospace]"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="confirmPin">Confirm</Label>
              <Input
                id="confirmPin" type="text" inputMode="numeric" maxLength={6} pattern="\d{6}"
                value={confirm} onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
                className="text-center text-2xl tracking-[0.4em] font-['Consolas',monospace]"
              />
            </div>
            {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!valid || setPinMut.isPending} className="bg-[#1A3A5C] hover:bg-[#15304d]">
              {setPinMut.isPending ? "Saving…" : "Set PIN"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
