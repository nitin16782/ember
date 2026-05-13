import { trpc } from "@/lib/trpc";
import { useUploadFile } from "@/hooks/useUploadFile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, CheckCircle2, Circle, Camera, Clock, AlertTriangle, List, LayoutTemplate, Hammer, Upload, Image as ImageIcon, Plus } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

const checklistTemplates = [
  {
    id: 1, name: "Morning Opening Checklist", category: "opening", items: [
      { id: "m1", label: "Unlock all entry points", required: true },
      { id: "m2", label: "Turn on lights and AC in common areas", required: true },
      { id: "m3", label: "Check water supply and pressure", required: true },
      { id: "m4", label: "Inspect fire extinguishers", required: false },
      { id: "m5", label: "Review guest check-in list for the day", required: true },
      { id: "m6", label: "Verify staff attendance", required: true },
      { id: "m7", label: "Check pool/garden area cleanliness", required: false },
    ]
  },
  {
    id: 2, name: "Evening Closing Checklist", category: "closing", items: [
      { id: "e1", label: "Lock all non-essential entry points", required: true },
      { id: "e2", label: "Turn off unnecessary lights and AC", required: true },
      { id: "e3", label: "Verify all guests have checked in", required: true },
      { id: "e4", label: "Set night security mode", required: true },
      { id: "e5", label: "Submit daily expense report", required: false },
    ]
  },
  {
    id: 3, name: "Housekeeping Inspection", category: "housekeeping", items: [
      { id: "h1", label: "All rooms cleaned and inspected", required: true },
      { id: "h2", label: "Linen changed for checkout rooms", required: true },
      { id: "h3", label: "Bathroom amenities restocked", required: true },
      { id: "h4", label: "Mini-bar inventory checked", required: false },
      { id: "h5", label: "Photo evidence uploaded", required: true },
    ]
  },
];

function BreakageReportDialog() {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [attribution, setAttribution] = useState<string>("unattributed");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const createBreakage = trpc.breakages.create.useMutation();
  const updateBreakage = trpc.breakages.update.useMutation();
  const { upload, uploading } = useUploadFile();
  const utils = trpc.useUtils();

  // R2 migration (Prompt 6): the old flow base64-encoded the photo and
  // sent it through the server. Now we:
  //   1. Create the breakage row first (so we have its UUID)
  //   2. Request a signed PUT URL keyed on that breakageId
  //   3. PUT the file directly to R2 from the browser
  //   4. Patch the breakage row with the storage key

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File must be under 5MB"); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!description.trim()) { toast.error("Description is required"); return; }
    const propertyId = "00000000-0000-0000-0000-000000000001";
    setSubmitting(true);
    try {
      const { id: breakageId } = await createBreakage.mutateAsync({
        propertyId,
        description,
        attributionStatus: attribution as any,
        photoUrls: [],
      });

      if (photoFile) {
        const uploaded = await upload(photoFile, "breakage", {
          propertyId,
          breakageId,
          breakageIndex: 1,
        });
        if (uploaded?.key) {
          await updateBreakage.mutateAsync({
            id: breakageId,
            data: { photoUrls: [uploaded.key] },
          });
        }
      }

      toast.success("Breakage report submitted");
      setOpen(false);
      setDescription("");
      setPhotoFile(null);
      setPhotoPreview(null);
      setAttribution("unattributed");
      utils.breakages.list.invalidate();
    } catch {
      toast.error("Failed to submit breakage report");
    } finally {
      setSubmitting(false);
    }
  };

  const busy = submitting || uploading;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-navy text-white hover:bg-navy/90"><Plus className="h-4 w-4 mr-1.5" />Report Breakage</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-display text-navy">Report Breakage</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the breakage..." />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Attribution</label>
            <Select value={attribution} onValueChange={setAttribution}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unattributed">Unattributed</SelectItem>
                <SelectItem value="associate">Associate</SelectItem>
                <SelectItem value="guest">Guest</SelectItem>
                <SelectItem value="accidental">Accidental</SelectItem>
                <SelectItem value="wear">Wear & Tear</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Photo Evidence</label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            {photoPreview ? (
              <div className="relative rounded-lg overflow-hidden border border-border/50">
                <img src={photoPreview} alt="Breakage" className="w-full h-40 object-cover" />
                <Button size="sm" variant="outline" className="absolute top-2 right-2 h-7 text-xs bg-white/80" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}>Remove</Button>
              </div>
            ) : (
              <Button variant="outline" className="w-full h-24 border-dashed" onClick={() => fileRef.current?.click()}>
                <div className="text-center">
                  <Camera className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">Click to upload photo</span>
                </div>
              </Button>
            )}
          </div>
          <Button className="w-full bg-navy text-white hover:bg-navy/90" onClick={handleSubmit} disabled={busy}>
            {busy ? "Uploading..." : "Submit Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function DailyOps() {
  const { data: entries, isLoading } = trpc.dailyOps.checklists.useQuery({});
  const { data: breakages } = trpc.breakages.list.useQuery({});
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [activeTemplate, setActiveTemplate] = useState(checklistTemplates[0]);

  const toggleItem = (itemId: string) => {
    setCheckedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const completedCount = activeTemplate.items.filter(i => checkedItems[i.id]).length;
  const totalCount = activeTemplate.items.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const requiredRemaining = activeTemplate.items.filter(i => i.required && !checkedItems[i.id]).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy">Daily Operations</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Checklists, breakage reports, and daily property operations</p>
        </div>
        <BreakageReportDialog />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Today's Checklists</p><p className="text-2xl font-semibold text-navy mt-1">{entries?.length ?? 0}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Completed</p><p className="text-2xl font-semibold text-green-600 mt-1">{entries?.filter((e: any) => e.status === "reviewed" || e.status === "submitted").length ?? 0}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Flagged</p><p className="text-2xl font-semibold text-red-600 mt-1">{entries?.filter((e: any) => e.status === "flagged").length ?? 0}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Breakages</p><p className="text-2xl font-semibold text-orange-600 mt-1">{breakages?.length ?? 0}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Templates</p><p className="text-2xl font-semibold text-gold mt-1">{checklistTemplates.length}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="bg-cream border border-border/50">
          <TabsTrigger value="active"><ClipboardList className="h-4 w-4 mr-1.5" />Active Checklist</TabsTrigger>
          <TabsTrigger value="breakages"><Hammer className="h-4 w-4 mr-1.5" />Breakages</TabsTrigger>
          <TabsTrigger value="history"><List className="h-4 w-4 mr-1.5" />History</TabsTrigger>
          <TabsTrigger value="templates"><LayoutTemplate className="h-4 w-4 mr-1.5" />Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              {checklistTemplates.map(t => (
                <Card key={t.id} className={`border-border/50 cursor-pointer transition-all ${activeTemplate.id === t.id ? "ring-2 ring-navy/30 bg-navy/5" : "hover:bg-cream/50"}`} onClick={() => setActiveTemplate(t)}>
                  <CardContent className="p-3">
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.items.length} items · {t.items.filter(i => i.required).length} required</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="md:col-span-2">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-navy">{activeTemplate.name}</CardTitle>
                    <Badge className={progressPct === 100 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>{completedCount}/{totalCount}</Badge>
                  </div>
                  <Progress value={progressPct} className="h-2 mt-2" />
                  {requiredRemaining > 0 && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{requiredRemaining} required item{requiredRemaining > 1 ? "s" : ""} remaining</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  {activeTemplate.items.map(item => (
                    <div key={item.id} className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${checkedItems[item.id] ? "bg-green-50/50 border-green-200/50" : "border-border/30 hover:bg-cream/30"}`}>
                      <Checkbox checked={!!checkedItems[item.id]} onCheckedChange={() => toggleItem(item.id)} />
                      <span className={`text-sm flex-1 ${checkedItems[item.id] ? "line-through text-muted-foreground" : ""}`}>{item.label}</span>
                      {item.required && <Badge variant="outline" className="text-[9px] h-4 border-red-200 text-red-500">Required</Badge>}
                    </div>
                  ))}
                  <div className="pt-3 flex gap-2">
                    <Button className="bg-navy text-white hover:bg-navy/90 flex-1" disabled={requiredRemaining > 0} onClick={() => toast.success("Checklist submitted for review")}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />Submit Checklist
                    </Button>
                    <Button variant="outline" onClick={() => toast.info("Flagging feature coming soon")}>
                      <AlertTriangle className="h-4 w-4 mr-2" />Flag Issue
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="breakages" className="space-y-3">
          {breakages?.map((b: any) => (
            <Card key={b.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                    {b.photoUrl ? <ImageIcon className="h-5 w-5 text-orange-600" /> : <Hammer className="h-5 w-5 text-orange-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{b.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">Property #{b.propertyId}</Badge>
                      <Badge className={
                        b.attributionStatus === "associate" ? "bg-red-100 text-red-700" :
                        b.attributionStatus === "guest" ? "bg-blue-100 text-blue-700" :
                        b.attributionStatus === "accidental" ? "bg-yellow-100 text-yellow-700" :
                        b.attributionStatus === "wear" ? "bg-gray-100 text-gray-700" :
                        "bg-orange-100 text-orange-700"
                      }>{b.attributionStatus}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(b.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {b.photoUrls && Array.isArray(b.photoUrls) && (b.photoUrls as string[]).length > 0 && (
                    <img src={(b.photoUrls as string[])[0]} alt="Breakage" className="h-16 w-16 rounded-lg object-cover border border-border/30" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {(!breakages || breakages.length === 0) && (
            <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><Hammer className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No breakage reports yet</p></CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-2">
          {entries?.map((entry: any) => (
            <Card key={entry.id} className="border-border/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center">
                    {entry.status === "reviewed" || entry.status === "submitted" ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4 text-amber-600" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">Property #{entry.propertyId} — {String(entry.checklistDate)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {entry.submittedAt ? `Submitted ${new Date(entry.submittedAt).toLocaleString()}` : "Not submitted"}
                    </p>
                  </div>
                </div>
                <Badge className={entry.status === "reviewed" ? "bg-green-100 text-green-700" : entry.status === "flagged" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}>{entry.status}</Badge>
              </CardContent>
            </Card>
          ))}
          {!isLoading && (!entries || entries.length === 0) && (
            <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><ClipboardList className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No daily ops entries yet</p></CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="templates">
          <div className="space-y-3">
            {checklistTemplates.map(t => (
              <Card key={t.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.category} · {t.items.length} items</p>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toast.info("Template editing coming soon")}>Edit</Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {t.items.map(item => (
                      <Badge key={item.id} variant="outline" className="text-[10px] font-normal">{item.label}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
