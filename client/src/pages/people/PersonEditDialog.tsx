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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const STAFF_TYPES = [
  { value: "associate", label: "Associate" },
  { value: "full_time", label: "Full-time" },
  { value: "trainee", label: "Trainee" },
  { value: "stipend", label: "Stipend" },
];

const EMPLOYMENT_TYPES = [
  { value: "", label: "—" },
  { value: "contract", label: "Contract" },
  { value: "permanent", label: "Permanent" },
  { value: "probation", label: "Probation" },
  { value: "trainee", label: "Trainee" },
];

const EMPLOYMENT_STATUSES = [
  { value: "active", label: "Active" },
  { value: "on_leave", label: "On leave" },
  { value: "exited", label: "Exited" },
  { value: "absconding", label: "Absconding" },
];

const GENDERS = [
  { value: "", label: "—" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const SOURCES = [
  { value: "", label: "—" },
  { value: "referral", label: "Referral" },
  { value: "direct", label: "Direct" },
  { value: "agency", label: "Agency" },
  { value: "walk_in", label: "Walk-in" },
  { value: "social_media", label: "Social media" },
];

export interface PersonEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: {
    id: string;
    fullName: string;
    employeeCode?: string | null;
    designation?: string | null;
    primaryPhone: string;
    alternatePhone?: string | null;
    email?: string | null;
    gender?: string | null;
    dob?: string | Date | null;
    currentAddress?: string | null;
    permanentAddress?: string | null;
    staffType: string;
    employmentType?: string | null;
    employmentStatus: string;
    source?: string | null;
    joiningDate?: string | Date | null;
    currentSalary?: string | null;
    dailyRate?: string | null;
  };
  onSaved?: () => void;
}

function dateToYmd(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

export function PersonEditDialog({ open, onOpenChange, person, onSaved }: PersonEditDialogProps) {
  const update = trpc.people.update.useMutation();
  const utils = trpc.useUtils();

  const [fullName, setFullName] = useState(person.fullName);
  const [employeeCode, setEmployeeCode] = useState(person.employeeCode ?? "");
  const [designation, setDesignation] = useState(person.designation ?? "");
  const [primaryPhone, setPrimaryPhone] = useState(person.primaryPhone);
  const [alternatePhone, setAlternatePhone] = useState(person.alternatePhone ?? "");
  const [email, setEmail] = useState(person.email ?? "");
  const [gender, setGender] = useState(person.gender ?? "");
  const [dob, setDob] = useState(dateToYmd(person.dob));
  const [currentAddress, setCurrentAddress] = useState(person.currentAddress ?? "");
  const [permanentAddress, setPermanentAddress] = useState(person.permanentAddress ?? "");
  const [staffType, setStaffType] = useState(person.staffType);
  const [employmentType, setEmploymentType] = useState(person.employmentType ?? "");
  const [employmentStatus, setEmploymentStatus] = useState(person.employmentStatus);
  const [source, setSource] = useState(person.source ?? "");
  const [joiningDate, setJoiningDate] = useState(dateToYmd(person.joiningDate));
  const [currentSalary, setCurrentSalary] = useState(person.currentSalary ?? "");
  const [dailyRate, setDailyRate] = useState(person.dailyRate ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFullName(person.fullName);
    setEmployeeCode(person.employeeCode ?? "");
    setDesignation(person.designation ?? "");
    setPrimaryPhone(person.primaryPhone);
    setAlternatePhone(person.alternatePhone ?? "");
    setEmail(person.email ?? "");
    setGender(person.gender ?? "");
    setDob(dateToYmd(person.dob));
    setCurrentAddress(person.currentAddress ?? "");
    setPermanentAddress(person.permanentAddress ?? "");
    setStaffType(person.staffType);
    setEmploymentType(person.employmentType ?? "");
    setEmploymentStatus(person.employmentStatus);
    setSource(person.source ?? "");
    setJoiningDate(dateToYmd(person.joiningDate));
    setCurrentSalary(person.currentSalary ?? "");
    setDailyRate(person.dailyRate ?? "");
  }, [open, person]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!primaryPhone.trim()) {
      setError("Primary phone is required.");
      return;
    }

    const data: Record<string, unknown> = {
      fullName: fullName.trim(),
      employeeCode: employeeCode.trim() || null,
      designation: designation.trim() || null,
      primaryPhone: primaryPhone.trim(),
      alternatePhone: alternatePhone.trim() || null,
      email: email.trim() || null,
      gender: gender || null,
      dob: dob ? new Date(`${dob}T00:00:00`) : null,
      currentAddress: currentAddress.trim() || null,
      permanentAddress: permanentAddress.trim() || null,
      staffType,
      employmentType: employmentType || null,
      employmentStatus,
      source: source || null,
      joiningDate: joiningDate ? new Date(`${joiningDate}T00:00:00`) : null,
      currentSalary: currentSalary.trim() || null,
      dailyRate: dailyRate.trim() || null,
    };

    try {
      await update.mutateAsync({ id: person.id, data });
      toast.success("Profile updated");
      await utils.people.get.invalidate({ id: person.id });
      await utils.people.list.invalidate();
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? "Could not update profile");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-navy">Edit profile</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Update personal details, employment, and contact info. Changes write to the audit log.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <section className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Identity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={255} />
              </div>
              <div>
                <Label htmlFor="employeeCode">Employee ID</Label>
                <Input
                  id="employeeCode"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
                  placeholder="EMP-0042"
                  maxLength={16}
                  autoCapitalize="characters"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Used for login (employee ID + PIN).</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="designation">Designation</Label>
                <Input id="designation" value={designation} onChange={(e) => setDesignation(e.target.value)} maxLength={150} placeholder="e.g. Driver, Housekeeping" />
              </div>
              <div>
                <Label>Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {GENDERS.filter((g) => g.value).map((g) => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dob">Date of birth</Label>
                <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="primaryPhone">Primary phone</Label>
                <Input id="primaryPhone" type="tel" value={primaryPhone} onChange={(e) => setPrimaryPhone(e.target.value)} required maxLength={20} />
              </div>
              <div>
                <Label htmlFor="alternatePhone">Alternate phone</Label>
                <Input id="alternatePhone" type="tel" value={alternatePhone} onChange={(e) => setAlternatePhone(e.target.value)} maxLength={20} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={320} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="currentAddress">Current address</Label>
                <Textarea id="currentAddress" rows={2} value={currentAddress} onChange={(e) => setCurrentAddress(e.target.value)} maxLength={1000} />
              </div>
              <div>
                <Label htmlFor="permanentAddress">Permanent address</Label>
                <Textarea id="permanentAddress" rows={2} value={permanentAddress} onChange={(e) => setPermanentAddress(e.target.value)} maxLength={1000} />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Employment</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Staff type</Label>
                <Select value={staffType} onValueChange={setStaffType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAFF_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Employment type</Label>
                <Select value={employmentType} onValueChange={setEmploymentType}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_TYPES.filter((t) => t.value).map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={employmentStatus} onValueChange={setEmploymentStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="joiningDate">Joining date</Label>
                <Input id="joiningDate" type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
              </div>
              <div>
                <Label>Source</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {SOURCES.filter((s) => s.value).map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="currentSalary">Monthly salary (₹)</Label>
                <Input id="currentSalary" type="text" inputMode="decimal" value={currentSalary} onChange={(e) => setCurrentSalary(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <Label htmlFor="dailyRate">Daily rate (₹)</Label>
                <Input id="dailyRate" type="text" inputMode="decimal" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} placeholder="0.00" />
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
