import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Building2, MapPin, BedDouble, Bath, Ruler, Pencil } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { PropertyEditDialog } from "./properties/PropertyEditDialog";

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
          <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><p className="text-sm text-muted-foreground">Staff assignments will appear here</p></CardContent></Card>
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
