import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Building2, MapPin, BedDouble, Bath, Ruler, Pencil, UserPlus, Users } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useState } from "react";
import { PropertyEditDialog } from "./properties/PropertyEditDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function PropertyDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const id = params.id ?? "";
  const { data: property, isLoading } = trpc.properties.get.useQuery({ id }, { enabled: !!id });
  const [editing, setEditing] = useState(false);

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /></div>;
  if (!property) return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={() => setLocation("/properties")} className="gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button>
      <p className="text-muted-foreground">Property not found.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setLocation("/properties")} className="gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Back to Properties
        </Button>
        <Button onClick={() => setEditing(true)} className="bg-navy hover:bg-navy/90 gap-2">
          <Pencil className="h-4 w-4" /> Edit property
        </Button>
      </div>
      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="flex items-start gap-5">
            <div className="h-14 w-14 rounded-xl bg-gold/10 flex items-center justify-center shrink-0">
              <Building2 className="h-6 w-6 text-gold" />
            </div>
            <div className="flex-1">
              <h2 className="font-display text-xl font-semibold text-navy">{property.name}</h2>
              <p className="text-sm text-muted-foreground capitalize mt-0.5">{property.type?.replace("_", " ")}</p>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                {property.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{property.city}{property.state ? `, ${property.state}` : ""}</span>}
                {property.bedroomCount && <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{property.bedroomCount} bed</span>}
                {property.bathroomCount && <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{property.bathroomCount} bath</span>}
                {property.sqFt && <span className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5" />{property.sqFt} sq ft</span>}
              </div>
              <Badge className={`mt-3 ${property.status === "live" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                {property.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <PropertyEditDialog
        open={editing}
        onOpenChange={setEditing}
        property={property as any}
      />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="ops">Operations</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-border/50">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Details</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div><span className="text-muted-foreground">Address:</span> <span className="ml-2">{property.address || "—"}</span></div>
                <div><span className="text-muted-foreground">Pincode:</span> <span className="ml-2">{property.pincode || "—"}</span></div>
                <div><span className="text-muted-foreground">GPS:</span> <span className="ml-2">{property.gpsLat && property.gpsLng ? `${property.gpsLat}, ${property.gpsLng}` : "Not set"}</span></div>
                <div><span className="text-muted-foreground">Geofence Radius:</span> <span className="ml-2">{property.geofenceRadiusM ? `${property.geofenceRadiusM}m` : "—"}</span></div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Configuration</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div><span className="text-muted-foreground">Created:</span> <span className="ml-2">{property.createdAt ? new Date(property.createdAt).toLocaleDateString() : "—"}</span></div>
                <div><span className="text-muted-foreground">Onboarded:</span> <span className="ml-2">{property.onboardedAt ? new Date(property.onboardedAt).toLocaleDateString() : "Not yet"}</span></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="staff">
          <StaffTab propertyId={id} propertyName={property.name} />
        </TabsContent>
        <TabsContent value="financials">
          <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><p className="text-sm text-muted-foreground">Financial overview coming soon</p></CardContent></Card>
        </TabsContent>
        <TabsContent value="ops">
          <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><p className="text-sm text-muted-foreground">Operations checklists and logs coming soon</p></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "housekeeping", label: "Housekeeping" },
  { value: "kitchen", label: "Kitchen" },
  { value: "f_and_b", label: "F&B" },
  { value: "maintenance", label: "Maintenance" },
  { value: "security", label: "Security" },
  { value: "supervisor", label: "Supervisor" },
  { value: "manager", label: "Manager" },
  { value: "other", label: "Other" },
];

const SHIFT_OPTIONS: { value: "morning" | "evening" | "full_day" | "night" | "24x7"; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "evening", label: "Evening" },
  { value: "full_day", label: "Full day" },
  { value: "night", label: "Night" },
  { value: "24x7", label: "24×7" },
];

function StaffTab({ propertyId, propertyName }: { propertyId: string; propertyName: string }) {
  const [open, setOpen] = useState(false);
  const { data: rows, isLoading } = trpc.assignments.list.useQuery({ propertyId, status: "active" });
  // server-side listPeople defaults to limit=50; raise it so personId → person
  // resolution on the property staff tab covers the full active workforce.
  const { data: peopleRows } = trpc.people.list.useQuery({ limit: 500 });

  const personById = useMemo(() => {
    const m = new Map<string, { fullName: string; designation?: string | null; primaryPhone?: string | null; employeeCode?: string | null }>();
    (peopleRows ?? []).forEach((p) => m.set(p.id, p));
    return m;
  }, [peopleRows]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {isLoading ? "Loading…" : `${rows?.length ?? 0} active assignment${(rows?.length ?? 0) === 1 ? "" : "s"}`}
        </div>
        <Button onClick={() => setOpen(true)} className="bg-navy hover:bg-navy/90 gap-2" size="sm">
          <UserPlus className="h-4 w-4" /> Assign staff
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : rows && rows.length > 0 ? (
        <div className="space-y-2">
          {rows.map((a) => {
            const person = personById.get(a.personId);
            return (
              <Card key={a.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-navy/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-navy">
                          {person?.fullName?.charAt(0).toUpperCase() ?? "?"}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{person?.fullName ?? "Unknown person"}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {person?.employeeCode && (
                            <span className="text-xs font-mono text-muted-foreground">{person.employeeCode}</span>
                          )}
                          <span className="text-xs text-muted-foreground capitalize">{a.roleCode?.replace(/_/g, " ")}</span>
                          {a.shift && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                              {a.shift.replace("_", " ")}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">
                      From {a.startDate ? String(a.startDate) : "—"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-border/50 border-dashed">
          <CardContent className="p-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No staff assigned yet</p>
            <p className="text-xs text-muted-foreground mt-1">Use "Assign staff" to attach an associate to this property.</p>
          </CardContent>
        </Card>
      )}

      <AssignStaffDialog
        open={open}
        onOpenChange={setOpen}
        propertyId={propertyId}
        propertyName={propertyName}
        people={peopleRows ?? []}
      />
    </div>
  );
}

function AssignStaffDialog({
  open, onOpenChange, propertyId, propertyName, people,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  propertyId: string;
  propertyName: string;
  people: { id: string; fullName: string; employeeCode?: string | null; staffType?: string | null }[];
}) {
  const utils = trpc.useUtils();
  const create = trpc.assignments.create.useMutation({
    onSuccess: () => {
      utils.assignments.list.invalidate({ propertyId, status: "active" });
      toast.success("Staff assigned");
      onOpenChange(false);
      setPersonId("");
      setRoleCode("housekeeping");
      setShift("full_day");
    },
    onError: (err) => toast.error(err.message ?? "Could not assign staff"),
  });

  const [personId, setPersonId] = useState("");
  const [roleCode, setRoleCode] = useState("housekeeping");
  const [shift, setShift] = useState<typeof SHIFT_OPTIONS[number]["value"]>("full_day");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));

  const valid = personId && roleCode && startDate;

  function submit() {
    if (!valid) return;
    create.mutate({ personId, propertyId, roleCode, shift, startDate });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign staff to {propertyName}</DialogTitle>
          <DialogDescription>Link an associate to this property with a role and shift.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Associate</Label>
            <Select value={personId} onValueChange={setPersonId}>
              <SelectTrigger><SelectValue placeholder="Pick a person" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {people.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">No people yet — add one under Associates first.</div>
                ) : people.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.fullName}{p.employeeCode ? ` · ${p.employeeCode}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Role</Label>
              <Select value={roleCode} onValueChange={setRoleCode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Shift</Label>
              <Select value={shift} onValueChange={(v) => setShift(v as typeof shift)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SHIFT_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="startDate">Start date</Label>
            <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!valid || create.isPending} className="bg-navy hover:bg-navy/90">
            {create.isPending ? "Assigning…" : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
