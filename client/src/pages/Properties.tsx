import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Plus, Search, Building2, MapPin, BedDouble, ChevronRight, Map, Settings, ClipboardList, ArrowRight } from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const statusColors: Record<string, string> = {
  live: "bg-green-100 text-green-700",
  onboarding: "bg-blue-100 text-blue-700",
  paused: "bg-yellow-100 text-yellow-700",
  churned: "bg-gray-100 text-gray-500",
};

const onboardingSteps = [
  { step: 1, title: "Basic Details", desc: "Name, type, address, bedroom/bathroom count" },
  { step: 2, title: "Fee Structure", desc: "Management fee, commission rates, billing cycle" },
  { step: 3, title: "SLA Configuration", desc: "Response times, cleaning standards, maintenance SLAs" },
  { step: 4, title: "Geofence Setup", desc: "GPS coordinates and geofence radius for attendance" },
  { step: 5, title: "Staff Assignment", desc: "Assign initial team and define coverage requirements" },
  { step: 6, title: "Owner Details", desc: "Owner contact, communication preferences, portal access" },
  { step: 7, title: "Go Live", desc: "Final review and activation" },
];

export default function Properties() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);

  const queryInput = useMemo(() => ({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    limit: 50,
  }), [search, statusFilter]);

  const { data: properties, isLoading } = trpc.properties.list.useQuery(queryInput);
  const { data: stats } = trpc.properties.stats.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.properties.create.useMutation({
    onSuccess: () => {
      utils.properties.list.invalidate();
      utils.properties.stats.invalidate();
      setDialogOpen(false);
      setWizardStep(1);
      toast.success("Property added successfully");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const [form, setForm] = useState({
    name: "", type: "villa" as const, address: "", city: "", state: "", pincode: "",
    bedroomCount: 0, bathroomCount: 0,
  });

  const handleCreate = () => {
    if (!form.name) { toast.error("Property name is required"); return; }
    createMutation.mutate({
      name: form.name, type: form.type, address: form.address || undefined,
      city: form.city || undefined, state: form.state || undefined,
      pincode: form.pincode || undefined, bedroomCount: form.bedroomCount || undefined,
      bathroomCount: form.bathroomCount || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy">Properties</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stats ? `${stats.total} total · ${stats.live} live` : "Loading..."}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setWizardStep(1); }}>
          <DialogTrigger asChild>
            <Button className="bg-navy text-white hover:bg-navy/90"><Plus className="h-4 w-4 mr-2" />Onboard Property</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display text-navy">Property Onboarding — Step {wizardStep} of 7</DialogTitle>
            </DialogHeader>
            <Progress value={(wizardStep / 7) * 100} className="h-1.5 mb-2" />
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-cream/50 border border-border/30">
                <div className="h-8 w-8 rounded-full bg-navy text-white flex items-center justify-center text-sm font-semibold">{wizardStep}</div>
                <div>
                  <p className="text-sm font-medium">{onboardingSteps[wizardStep - 1].title}</p>
                  <p className="text-xs text-muted-foreground">{onboardingSteps[wizardStep - 1].desc}</p>
                </div>
              </div>

              {wizardStep === 1 && (
                <>
                  <div className="space-y-2"><Label>Property Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Villa Serenity" /></div>
                  <div className="space-y-2"><Label>Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="villa">Villa</SelectItem>
                        <SelectItem value="second_home">Second Home</SelectItem>
                        <SelectItem value="hotel">Hotel</SelectItem>
                        <SelectItem value="apartment">Apartment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                    <div className="space-y-2"><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2"><Label>Bedrooms</Label><Input type="number" value={form.bedroomCount} onChange={(e) => setForm({ ...form, bedroomCount: Number(e.target.value) })} /></div>
                    <div className="space-y-2"><Label>Bathrooms</Label><Input type="number" value={form.bathroomCount} onChange={(e) => setForm({ ...form, bathroomCount: Number(e.target.value) })} /></div>
                    <div className="space-y-2"><Label>Pincode</Label><Input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} /></div>
                  </div>
                </>
              )}
              {wizardStep === 2 && (
                <div className="space-y-3">
                  <div className="space-y-2"><Label>Management Fee (%)</Label><Input type="number" placeholder="15" /></div>
                  <div className="space-y-2"><Label>Commission Rate (%)</Label><Input type="number" placeholder="10" /></div>
                  <div className="space-y-2"><Label>Billing Cycle</Label>
                    <Select defaultValue="monthly"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem></SelectContent></Select>
                  </div>
                </div>
              )}
              {wizardStep === 3 && (
                <div className="space-y-3">
                  <div className="space-y-2"><Label>Maintenance Response Time (hours)</Label><Input type="number" placeholder="4" /></div>
                  <div className="space-y-2"><Label>Cleaning Standard</Label>
                    <Select defaultValue="premium"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="standard">Standard</SelectItem><SelectItem value="premium">Premium</SelectItem><SelectItem value="luxury">Luxury</SelectItem></SelectContent></Select>
                  </div>
                  <div className="space-y-2"><Label>Emergency Response Time (hours)</Label><Input type="number" placeholder="1" /></div>
                </div>
              )}
              {wizardStep === 4 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>GPS Latitude</Label><Input type="number" step="0.0001" placeholder="18.5204" /></div>
                    <div className="space-y-2"><Label>GPS Longitude</Label><Input type="number" step="0.0001" placeholder="73.8567" /></div>
                  </div>
                  <div className="space-y-2"><Label>Geofence Radius (meters)</Label><Input type="number" placeholder="100" /></div>
                  <div className="p-4 rounded-lg bg-cream/50 border border-border/30 text-center">
                    <Map className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Map preview with geofence circle will appear here</p>
                  </div>
                </div>
              )}
              {wizardStep === 5 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Define the initial staff coverage for this property. You can modify assignments later from the Roster module.</p>
                  {["Housekeeping", "Security", "Maintenance", "Supervisor"].map(role => (
                    <div key={role} className="flex items-center justify-between p-3 rounded bg-cream/50 border border-border/30">
                      <span className="text-sm font-medium">{role}</span>
                      <Input type="number" className="w-16 text-center" placeholder="0" />
                    </div>
                  ))}
                </div>
              )}
              {wizardStep === 6 && (
                <div className="space-y-3">
                  <div className="space-y-2"><Label>Owner Name</Label><Input placeholder="Property owner name" /></div>
                  <div className="space-y-2"><Label>Owner Phone</Label><Input placeholder="+91 XXXXX XXXXX" /></div>
                  <div className="space-y-2"><Label>Owner Email</Label><Input placeholder="owner@example.com" /></div>
                  <div className="space-y-2"><Label>Communication Preference</Label>
                    <Select defaultValue="whatsapp"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="whatsapp">WhatsApp</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="both">Both</SelectItem></SelectContent></Select>
                  </div>
                </div>
              )}
              {wizardStep === 7 && (
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                    <p className="text-sm font-medium text-green-700">Ready to Go Live</p>
                    <p className="text-xs text-green-600 mt-1">Review all details and click "Create & Go Live" to activate this property.</p>
                  </div>
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    {form.name && <p>Property: <span className="font-medium text-foreground">{form.name}</span></p>}
                    {form.city && <p>Location: <span className="font-medium text-foreground">{form.city}, {form.state}</span></p>}
                    <p>Type: <span className="font-medium text-foreground capitalize">{form.type.replace("_", " ")}</span></p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {wizardStep > 1 && <Button variant="outline" onClick={() => setWizardStep(s => s - 1)} className="flex-1">Back</Button>}
                {wizardStep < 7 ? (
                  <Button onClick={() => { if (wizardStep === 1 && !form.name) { toast.error("Name required"); return; } setWizardStep(s => s + 1); }} className="flex-1 bg-navy text-white hover:bg-navy/90">
                    Next <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button onClick={handleCreate} className="flex-1 bg-navy text-white hover:bg-navy/90" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create & Go Live"}
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or city..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="live">Live</SelectItem>
            <SelectItem value="onboarding">Onboarding</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="churned">Churned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (<Card key={i} className="border-border/50"><CardContent className="p-5"><Skeleton className="h-24 w-full" /></CardContent></Card>))}
        </div>
      ) : properties && properties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((prop) => (
            <Card key={prop.id} className="border-border/50 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation(`/properties/${prop.id}`)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-lg bg-gold/10 flex items-center justify-center"><Building2 className="h-4 w-4 text-gold" /></div>
                    <div>
                      <p className="font-medium text-sm">{prop.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{prop.type?.replace("_", " ")}</p>
                    </div>
                  </div>
                  <Badge className={`text-[10px] ${statusColors[prop.status] || ""}`}>{prop.status}</Badge>
                </div>
                <div className="space-y-1.5">
                  {prop.city && (<div className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /><span>{prop.city}{prop.state ? `, ${prop.state}` : ""}</span></div>)}
                  {(prop.bedroomCount || prop.bathroomCount) && (<div className="flex items-center gap-2 text-xs text-muted-foreground"><BedDouble className="h-3 w-3" /><span>{prop.bedroomCount || 0} bed · {prop.bathroomCount || 0} bath</span></div>)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><Building2 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No properties found</p></CardContent></Card>
      )}
    </div>
  );
}
