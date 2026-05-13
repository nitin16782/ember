import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Building2, MapPin, BedDouble, ChevronRight } from "lucide-react";
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

export default function Properties() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

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
      toast.success("Property added successfully");
    },
    onError: (err) => toast.error(err.message),
  });

  const [form, setForm] = useState({
    name: "",
    type: "villa" as const,
    address: "",
    city: "",
    state: "",
    pincode: "",
    bedroomCount: 0,
    bathroomCount: 0,
  });

  const handleCreate = () => {
    if (!form.name) { toast.error("Property name is required"); return; }
    createMutation.mutate({
      name: form.name,
      type: form.type,
      address: form.address || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      pincode: form.pincode || undefined,
      bedroomCount: form.bedroomCount || undefined,
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
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-navy text-white hover:bg-navy/90">
              <Plus className="h-4 w-4 mr-2" /> Add Property
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display text-navy">Add New Property</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Property Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Villa Serenity" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
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
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="State" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full address" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Bedrooms</Label>
                  <Input type="number" value={form.bedroomCount} onChange={(e) => setForm({ ...form, bedroomCount: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Bathrooms</Label>
                  <Input type="number" value={form.bathroomCount} onChange={(e) => setForm({ ...form, bathroomCount: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Pincode</Label>
                  <Input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
                </div>
              </div>
              <Button onClick={handleCreate} className="w-full bg-navy text-white hover:bg-navy/90" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding..." : "Add Property"}
              </Button>
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
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border/50"><CardContent className="p-5"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : properties && properties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((prop) => (
            <Card
              key={prop.id}
              className="border-border/50 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setLocation(`/properties/${prop.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-lg bg-gold/10 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-gold" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{prop.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{prop.type?.replace("_", " ")}</p>
                    </div>
                  </div>
                  <Badge className={`text-[10px] ${statusColors[prop.status] || ""}`}>
                    {prop.status}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  {prop.city && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{prop.city}{prop.state ? `, ${prop.state}` : ""}</span>
                    </div>
                  )}
                  {(prop.bedroomCount || prop.bathroomCount) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <BedDouble className="h-3 w-3" />
                      <span>{prop.bedroomCount || 0} bed · {prop.bathroomCount || 0} bath</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-border/50 border-dashed">
          <CardContent className="p-12 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No properties found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
