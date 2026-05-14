import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const PROPERTY_TYPES = [
  { value: "villa", label: "Villa" },
  { value: "second_home", label: "Second home" },
  { value: "hotel", label: "Hotel" },
  { value: "apartment", label: "Apartment" },
];

const PROPERTY_STATUSES = [
  { value: "onboarding", label: "Onboarding" },
  { value: "live", label: "Live" },
  { value: "paused", label: "Paused" },
  { value: "churned", label: "Churned" },
];

export interface PropertyEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: {
    id: string;
    name: string;
    type: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    bedroomCount?: number | null;
    bathroomCount?: number | null;
    sqFt?: number | null;
    gpsLat?: string | null;
    gpsLng?: string | null;
    geofenceRadiusM?: number | null;
    geofenceLenient?: boolean | null;
    minimumDailyWorkMinutes?: number | null;
    onboardedAt?: string | Date | null;
    status: string;
  };
  onSaved?: () => void;
}

function dateToYmd(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

function parseIntOrNull(s: string): number | null {
  if (s.trim() === "") return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

export function PropertyEditDialog({ open, onOpenChange, property, onSaved }: PropertyEditDialogProps) {
  const update = trpc.properties.update.useMutation();
  const utils = trpc.useUtils();

  const [name, setName] = useState(property.name);
  const [type, setType] = useState(property.type);
  const [address, setAddress] = useState(property.address ?? "");
  const [city, setCity] = useState(property.city ?? "");
  const [state, setState] = useState(property.state ?? "");
  const [pincode, setPincode] = useState(property.pincode ?? "");
  const [bedroomCount, setBedroomCount] = useState(property.bedroomCount?.toString() ?? "");
  const [bathroomCount, setBathroomCount] = useState(property.bathroomCount?.toString() ?? "");
  const [sqFt, setSqFt] = useState(property.sqFt?.toString() ?? "");
  const [gpsLat, setGpsLat] = useState(property.gpsLat ?? "");
  const [gpsLng, setGpsLng] = useState(property.gpsLng ?? "");
  const [geofenceRadiusM, setGeofenceRadiusM] = useState((property.geofenceRadiusM ?? 100).toString());
  const [geofenceLenient, setGeofenceLenient] = useState(!!property.geofenceLenient);
  const [minimumDailyWorkMinutes, setMinimumDailyWorkMinutes] = useState((property.minimumDailyWorkMinutes ?? 360).toString());
  const [onboardedAt, setOnboardedAt] = useState(dateToYmd(property.onboardedAt));
  const [status, setStatus] = useState(property.status);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setName(property.name);
    setType(property.type);
    setAddress(property.address ?? "");
    setCity(property.city ?? "");
    setState(property.state ?? "");
    setPincode(property.pincode ?? "");
    setBedroomCount(property.bedroomCount?.toString() ?? "");
    setBathroomCount(property.bathroomCount?.toString() ?? "");
    setSqFt(property.sqFt?.toString() ?? "");
    setGpsLat(property.gpsLat ?? "");
    setGpsLng(property.gpsLng ?? "");
    setGeofenceRadiusM((property.geofenceRadiusM ?? 100).toString());
    setGeofenceLenient(!!property.geofenceLenient);
    setMinimumDailyWorkMinutes((property.minimumDailyWorkMinutes ?? 360).toString());
    setOnboardedAt(dateToYmd(property.onboardedAt));
    setStatus(property.status);
  }, [open, property]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    const latTrimmed = gpsLat.trim();
    const lngTrimmed = gpsLng.trim();
    if ((latTrimmed === "") !== (lngTrimmed === "")) {
      setError("Set both latitude and longitude, or leave both empty.");
      return;
    }
    if (latTrimmed && (Number.isNaN(Number(latTrimmed)) || Math.abs(Number(latTrimmed)) > 90)) {
      setError("Latitude must be a number between -90 and 90.");
      return;
    }
    if (lngTrimmed && (Number.isNaN(Number(lngTrimmed)) || Math.abs(Number(lngTrimmed)) > 180)) {
      setError("Longitude must be a number between -180 and 180.");
      return;
    }

    const data: Record<string, unknown> = {
      name: name.trim(),
      type,
      address: address.trim() || null,
      city: city.trim() || null,
      state: state.trim() || null,
      pincode: pincode.trim() || null,
      bedroomCount: parseIntOrNull(bedroomCount),
      bathroomCount: parseIntOrNull(bathroomCount),
      sqFt: parseIntOrNull(sqFt),
      gpsLat: latTrimmed || null,
      gpsLng: lngTrimmed || null,
      geofenceRadiusM: parseIntOrNull(geofenceRadiusM) ?? 100,
      geofenceLenient,
      minimumDailyWorkMinutes: parseIntOrNull(minimumDailyWorkMinutes) ?? 360,
      onboardedAt: onboardedAt ? new Date(`${onboardedAt}T00:00:00`) : null,
      status,
    };

    try {
      await update.mutateAsync({ id: property.id, data });
      toast.success("Property updated");
      await utils.properties.get.invalidate({ id: property.id });
      await utils.properties.list.invalidate();
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? "Could not update property");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-navy">Edit property</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Update details, GPS, geofence, and lifecycle status. Changes write to the audit log.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <section className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Identity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={255} />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Address</h3>
            <div>
              <Label htmlFor="address">Street address</Label>
              <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} rows={2} maxLength={500} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} maxLength={100} />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input id="state" value={state} onChange={(e) => setState(e.target.value)} maxLength={100} />
              </div>
              <div>
                <Label htmlFor="pincode">Pincode</Label>
                <Input id="pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} maxLength={10} />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Layout</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="bedroomCount">Bedrooms</Label>
                <Input id="bedroomCount" type="number" min={0} value={bedroomCount} onChange={(e) => setBedroomCount(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="bathroomCount">Bathrooms</Label>
                <Input id="bathroomCount" type="number" min={0} value={bathroomCount} onChange={(e) => setBathroomCount(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="sqFt">Sq ft</Label>
                <Input id="sqFt" type="number" min={0} value={sqFt} onChange={(e) => setSqFt(e.target.value)} />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground">GPS & geofence (attendance)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="gpsLat">Latitude</Label>
                <Input id="gpsLat" inputMode="decimal" placeholder="e.g. 28.4595" value={gpsLat} onChange={(e) => setGpsLat(e.target.value)} maxLength={20} />
              </div>
              <div>
                <Label htmlFor="gpsLng">Longitude</Label>
                <Input id="gpsLng" inputMode="decimal" placeholder="e.g. 77.0266" value={gpsLng} onChange={(e) => setGpsLng(e.target.value)} maxLength={20} />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Set both or neither. Used to validate associate check-in locations.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="geofenceRadiusM">Geofence radius (meters)</Label>
                <Input id="geofenceRadiusM" type="number" min={10} value={geofenceRadiusM} onChange={(e) => setGeofenceRadiusM(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="minimumDailyWorkMinutes">Minimum daily work (minutes)</Label>
                <Input id="minimumDailyWorkMinutes" type="number" min={0} value={minimumDailyWorkMinutes} onChange={(e) => setMinimumDailyWorkMinutes(e.target.value)} />
                <p className="text-[11px] text-muted-foreground mt-1">Below this, the day is marked "partial" instead of "present".</p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/50 p-2">
              <div>
                <Label htmlFor="geofenceLenient" className="text-sm">Lenient geofence</Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">If on, outside-fence check-ins are flagged but not blocked.</p>
              </div>
              <Switch id="geofenceLenient" checked={geofenceLenient} onCheckedChange={setGeofenceLenient} />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Lifecycle</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROPERTY_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="onboardedAt">Onboarded on</Label>
                <Input id="onboardedAt" type="date" value={onboardedAt} onChange={(e) => setOnboardedAt(e.target.value)} />
              </div>
            </div>
          </section>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-2 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={update.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={update.isPending} className="bg-navy hover:bg-navy/90">
              {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
