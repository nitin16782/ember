import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, TrendingUp, MessageSquare, ThumbsUp, AlertTriangle, Plus, Eye } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const outcomeConfig: Record<string, { label: string; color: string }> = {
  increment: { label: "Increment", color: "bg-green-100 text-green-700" },
  promotion: { label: "Promotion", color: "bg-blue-100 text-blue-700" },
  pip: { label: "PIP", color: "bg-red-100 text-red-700" },
  exit: { label: "Exit", color: "bg-red-100 text-red-700" },
  no_change: { label: "No Change", color: "bg-gray-100 text-gray-600" },
};

export default function Performance() {
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const { data: reviews } = trpc.performance.reviews.useQuery({});
  const { data: feedbackList } = trpc.performance.feedback.useQuery({});
  const utils = trpc.useUtils();

  const [reviewForm, setReviewForm] = useState({ personId: "", periodStart: "", periodEnd: "", outcome: "no_change" });
  const createReview = trpc.performance.createReview.useMutation({
    onSuccess: () => { utils.performance.reviews.invalidate(); setReviewDialogOpen(false); setReviewForm({ personId: "", periodStart: "", periodEnd: "", outcome: "no_change" }); toast.success("Review created"); },
    onError: (e) => toast.error(e.message),
  });

  const [fbForm, setFbForm] = useState({ personId: "", type: "appreciation", description: "", severity: "low" });
  const createFeedback = trpc.performance.createFeedback.useMutation({
    onSuccess: () => { utils.performance.feedback.invalidate(); setFeedbackDialogOpen(false); setFbForm({ personId: "", type: "appreciation", description: "", severity: "low" }); toast.success("Feedback recorded"); },
    onError: (e) => toast.error(e.message),
  });

  const reviewCount = reviews?.length ?? 0;
  const appreciationCount = feedbackList?.filter((f: any) => f.type === "appreciation").length ?? 0;
  const complaintCount = feedbackList?.filter((f: any) => f.type === "complaint").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy">Performance & Feedback</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Review cycles, continuous feedback, and growth tracking</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-gold text-gold hover:bg-gold/5"><MessageSquare className="h-4 w-4 mr-2" />Add Feedback</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display text-navy">Record Feedback</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2"><Label>Person ID *</Label><Input type="number" value={fbForm.personId} onChange={(e) => setFbForm({ ...fbForm, personId: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select value={fbForm.type} onValueChange={(v) => setFbForm({ ...fbForm, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="appreciation">Appreciation</SelectItem>
                      <SelectItem value="complaint">Complaint</SelectItem>
                      <SelectItem value="observation">Observation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Description *</Label><Textarea value={fbForm.description} onChange={(e) => setFbForm({ ...fbForm, description: e.target.value })} rows={3} /></div>
                <div className="space-y-2">
                  <Label>Severity</Label>
                  <Select value={fbForm.severity} onValueChange={(v) => setFbForm({ ...fbForm, severity: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => createFeedback.mutate({ personId: fbForm.personId, type: fbForm.type as any, description: fbForm.description, severity: fbForm.severity as any })}
                  disabled={!fbForm.personId || !fbForm.description || createFeedback.isPending}
                  className="w-full bg-navy text-white hover:bg-navy/90"
                >{createFeedback.isPending ? "Saving..." : "Record Feedback"}</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-navy text-white hover:bg-navy/90"><Plus className="h-4 w-4 mr-2" />New Review</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display text-navy">Create Performance Review</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2"><Label>Person ID *</Label><Input type="number" value={reviewForm.personId} onChange={(e) => setReviewForm({ ...reviewForm, personId: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Period Start *</Label><Input type="date" value={reviewForm.periodStart} onChange={(e) => setReviewForm({ ...reviewForm, periodStart: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Period End *</Label><Input type="date" value={reviewForm.periodEnd} onChange={(e) => setReviewForm({ ...reviewForm, periodEnd: e.target.value })} /></div>
                </div>
                <div className="space-y-2">
                  <Label>Outcome</Label>
                  <Select value={reviewForm.outcome} onValueChange={(v) => setReviewForm({ ...reviewForm, outcome: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="increment">Increment</SelectItem>
                      <SelectItem value="promotion">Promotion</SelectItem>
                      <SelectItem value="pip">PIP</SelectItem>
                      <SelectItem value="exit">Exit</SelectItem>
                      <SelectItem value="no_change">No Change</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => createReview.mutate({ personId: reviewForm.personId, reviewPeriodStart: reviewForm.periodStart, reviewPeriodEnd: reviewForm.periodEnd, outcome: reviewForm.outcome as any })}
                  disabled={!reviewForm.personId || !reviewForm.periodStart || !reviewForm.periodEnd || createReview.isPending}
                  className="w-full bg-navy text-white hover:bg-navy/90"
                >{createReview.isPending ? "Creating..." : "Create Review"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/50"><CardContent className="p-4 text-center"><p className="text-2xl font-semibold text-navy">{reviewCount}</p><p className="text-xs text-muted-foreground mt-1">Reviews This Cycle</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><p className="text-2xl font-semibold text-green-600">{appreciationCount}</p><p className="text-xs text-muted-foreground mt-1">Appreciations</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><p className="text-2xl font-semibold text-red-600">{complaintCount}</p><p className="text-xs text-muted-foreground mt-1">Complaints</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><p className="text-2xl font-semibold text-blue-600">{(feedbackList?.length ?? 0) - appreciationCount - complaintCount}</p><p className="text-xs text-muted-foreground mt-1">Observations</p></CardContent></Card>
      </div>

      <Tabs defaultValue="reviews" className="space-y-4">
        <TabsList className="bg-cream border border-border/50">
          <TabsTrigger value="reviews"><Star className="h-4 w-4 mr-1.5" />Review Cycles</TabsTrigger>
          <TabsTrigger value="feedback"><MessageSquare className="h-4 w-4 mr-1.5" />Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="reviews" className="space-y-2">
          {reviews?.map((r: any) => {
            const oc = outcomeConfig[r.outcome] || outcomeConfig.no_change;
            return (
              <Card key={r.id} className="border-border/50 hover:shadow-sm transition-shadow cursor-pointer" onClick={() => toast.info(`Opening review #${r.id}`)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-gold/10 flex items-center justify-center"><TrendingUp className="h-4 w-4 text-gold" /></div>
                    <div>
                      <p className="font-medium text-sm">Person #{r.personId}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.reviewPeriodStart} to {r.reviewPeriodEnd} · Reviewer #{r.reviewerId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={oc.color}>{oc.label}</Badge>
                    <Badge variant="outline" className="text-xs">{r.status?.replace("_", " ") || "draft"}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {(!reviews || reviews.length === 0) && (
            <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><Star className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No performance reviews yet</p></CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="feedback" className="space-y-2">
          {feedbackList?.map((f: any) => (
            <Card key={f.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${f.type === "appreciation" ? "bg-green-50" : f.type === "complaint" ? "bg-red-50" : "bg-blue-50"}`}>
                      {f.type === "appreciation" ? <ThumbsUp className="h-4 w-4 text-green-600" /> : f.type === "complaint" ? <AlertTriangle className="h-4 w-4 text-red-600" /> : <Eye className="h-4 w-4 text-blue-600" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">Person #{f.personId}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{f.source || "Internal"} · {String(f.createdAt).slice(0, 10)}</p>
                    </div>
                  </div>
                  <Badge className={f.type === "appreciation" ? "bg-green-100 text-green-700" : f.type === "complaint" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}>
                    {f.type}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground ml-12 italic">"{f.description}"</p>
              </CardContent>
            </Card>
          ))}
          {(!feedbackList || feedbackList.length === 0) && (
            <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><MessageSquare className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No feedback recorded yet</p></CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
