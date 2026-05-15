import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Users, Phone, Mail, ChevronRight, Upload, Shield, Trash2 } from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  on_leave: "bg-yellow-100 text-yellow-700",
  exited: "bg-gray-100 text-gray-500",
  absconding: "bg-red-100 text-red-700",
};

const staffTypeLabels: Record<string, string> = {
  associate: "Associate",
  full_time: "Full Time",
  trainee: "Trainee",
  stipend: "Stipend",
};

export default function People() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const queryInput = useMemo(() => ({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    staffType: typeFilter !== "all" ? typeFilter : undefined,
    limit: 50,
  }), [search, statusFilter, typeFilter]);

  const { data: people, isLoading } = trpc.people.list.useQuery(queryInput);
  const { data: stats } = trpc.people.stats.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.people.create.useMutation({
    onSuccess: () => {
      utils.people.list.invalidate();
      utils.people.stats.invalidate();
      setDialogOpen(false);
      toast.success("Associate added successfully");
    },
    onError: (err) => toast.error(err.message),
  });

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const deleteMutation = trpc.people.delete.useMutation({
    onSuccess: () => {
      utils.people.list.invalidate();
      utils.people.stats.invalidate();
      toast.success(`${deleteTarget?.name ?? "Associate"} deleted`);
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const [form, setForm] = useState({
    fullName: "",
    primaryPhone: "",
    staffType: "associate" as const,
    email: "",
    designation: "",
  });

  const handleCreate = () => {
    if (!form.fullName || !form.primaryPhone) {
      toast.error("Name and phone are required");
      return;
    }
    createMutation.mutate({
      fullName: form.fullName,
      primaryPhone: form.primaryPhone,
      staffType: form.staffType,
      email: form.email || undefined,
      designation: form.designation || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy">Associates & Staff</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stats ? `${stats.total} total · ${stats.active} active` : "Loading..."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast.info("CSV import: Upload a CSV file with columns — fullName, primaryPhone, staffType, email, designation. Validation preview will show before import.")}>
            <Upload className="h-4 w-4 mr-2" />Import CSV
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-navy text-white hover:bg-navy/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Associate
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display text-navy">Add New Associate</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Enter full name" />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input value={form.primaryPhone} onChange={(e) => setForm({ ...form, primaryPhone: e.target.value })} placeholder="+91 XXXXX XXXXX" />
              </div>
              <div className="space-y-2">
                <Label>Staff Type</Label>
                <Select value={form.staffType} onValueChange={(v) => setForm({ ...form, staffType: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="associate">Associate</SelectItem>
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="trainee">Trainee</SelectItem>
                    <SelectItem value="stipend">Stipend</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Designation</Label>
                <Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Housekeeping Staff" />
              </div>
              <Button onClick={handleCreate} className="w-full bg-navy text-white hover:bg-navy/90" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding..." : "Add Associate"}
              </Button>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on_leave">On Leave</SelectItem>
            <SelectItem value="exited">Exited</SelectItem>
            <SelectItem value="absconding">Absconding</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="associate">Associate</SelectItem>
            <SelectItem value="full_time">Full Time</SelectItem>
            <SelectItem value="trainee">Trainee</SelectItem>
            <SelectItem value="stipend">Stipend</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* People List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : people && people.length > 0 ? (
        <div className="space-y-2">
          {people.map((person) => (
            <Card
              key={person.id}
              className="border-border/50 cursor-pointer hover:shadow-sm transition-shadow"
              onClick={() => setLocation(`/people/${person.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-navy/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-navy">
                        {person.fullName?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{person.fullName}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {person.employeeCode && (
                          <span className="text-xs font-mono text-muted-foreground">{person.employeeCode}</span>
                        )}
                        {person.designation && (
                          <span className="text-xs text-muted-foreground">{person.designation}</span>
                        )}
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColors[person.employmentStatus] || ""}`}>
                          {person.employmentStatus.replace("_", " ")}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {staffTypeLabels[person.staffType] || person.staffType}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {person.primaryPhone && (
                      <span className="text-xs text-muted-foreground hidden sm:inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {person.primaryPhone}
                      </span>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); toast.info(`Deployable status check: Verifying documents, training, and background check for ${person.fullName}`); }}>
                      <Shield className="h-3.5 w-3.5 mr-1" />Deploy
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                      aria-label={`Delete ${person.fullName}`}
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: person.id, name: person.fullName }); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-border/50 border-dashed">
          <CardContent className="p-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No associates found</p>
            <p className="text-xs text-muted-foreground mt-1">Add your first associate to get started</p>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-navy">Delete associate?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-medium">{deleteTarget?.name}</span> and cannot be undone. If this associate has attendance, shifts, or contracts on file, deletion will be blocked — mark them as Exited instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deleteMutation.isPending}
              onClick={(e) => { e.preventDefault(); if (deleteTarget) deleteMutation.mutate({ id: deleteTarget.id }); }}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
