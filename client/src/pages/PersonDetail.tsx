import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Phone, Mail, MapPin, Calendar, Briefcase, CreditCard } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

function formatField(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (val instanceof Date) return val.toLocaleDateString();
  return String(val);
}

export default function PersonDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const id = Number(params.id);
  const { data: person, isLoading } = trpc.people.get.useQuery({ id }, { enabled: !!id });

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
              <p className="text-sm text-muted-foreground mt-0.5">{person.designation || "No designation"}</p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge className={person.employmentStatus === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
                  {person.employmentStatus?.replace("_", " ")}
                </Badge>
                <Badge variant="outline">{person.staffType?.replace("_", " ")}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="salary">Salary</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
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

        <TabsContent value="documents">
          <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><p className="text-sm text-muted-foreground">Document management coming soon</p></CardContent></Card>
        </TabsContent>
        <TabsContent value="salary">
          <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><p className="text-sm text-muted-foreground">Salary history and structure coming soon</p></CardContent></Card>
        </TabsContent>
        <TabsContent value="history">
          <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><p className="text-sm text-muted-foreground">Audit trail and change history coming soon</p></CardContent></Card>
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
