import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, TrendingUp, MessageSquare, ThumbsUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const mockReviews = [
  { id: 1, personName: "Rajesh Kumar", reviewer: "Ops Lead", period: "Jan-Mar 2026", outcome: "increment" as const, status: "completed" },
  { id: 2, personName: "Priya Sharma", reviewer: "Ops Lead", period: "Jan-Mar 2026", outcome: "promotion" as const, status: "completed" },
  { id: 3, personName: "Amit Patel", reviewer: "Area Manager", period: "Jan-Mar 2026", outcome: "pip" as const, status: "pending_signoff" },
  { id: 4, personName: "Sunita Devi", reviewer: "Ops Lead", period: "Jan-Mar 2026", outcome: "no_change" as const, status: "in_progress" },
];

const mockFeedback = [
  { id: 1, personName: "Rajesh Kumar", type: "appreciation" as const, from: "Owner - Villa Serenity", content: "Excellent housekeeping standards, always punctual", date: "2026-05-10" },
  { id: 2, personName: "Priya Sharma", type: "appreciation" as const, from: "Guest", content: "Very helpful and friendly staff", date: "2026-05-08" },
  { id: 3, personName: "Amit Patel", type: "complaint" as const, from: "Owner - Sunset Retreat", content: "Missed cleaning schedule twice this week", date: "2026-05-07" },
  { id: 4, personName: "Vikram Singh", type: "appreciation" as const, from: "Area Manager", content: "Handled emergency maintenance efficiently", date: "2026-05-05" },
];

const outcomeConfig: Record<string, { label: string; color: string }> = {
  increment: { label: "Increment", color: "bg-green-100 text-green-700" },
  promotion: { label: "Promotion", color: "bg-blue-100 text-blue-700" },
  pip: { label: "PIP", color: "bg-red-100 text-red-700" },
  exit: { label: "Exit", color: "bg-red-100 text-red-700" },
  no_change: { label: "No Change", color: "bg-gray-100 text-gray-600" },
};

export default function Performance() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-navy">Performance & Feedback</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Review cycles, continuous feedback, and growth tracking</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/50"><CardContent className="p-4 text-center"><p className="text-2xl font-semibold text-navy">{mockReviews.length}</p><p className="text-xs text-muted-foreground mt-1">Reviews This Cycle</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><p className="text-2xl font-semibold text-green-600">{mockReviews.filter(r => r.status === "completed").length}</p><p className="text-xs text-muted-foreground mt-1">Completed</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><p className="text-2xl font-semibold text-blue-600">{mockFeedback.filter(f => f.type === "appreciation").length}</p><p className="text-xs text-muted-foreground mt-1">Appreciations</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><p className="text-2xl font-semibold text-red-600">{mockFeedback.filter(f => f.type === "complaint").length}</p><p className="text-xs text-muted-foreground mt-1">Complaints</p></CardContent></Card>
      </div>

      <Tabs defaultValue="reviews" className="space-y-4">
        <TabsList className="bg-cream border border-border/50">
          <TabsTrigger value="reviews"><Star className="h-4 w-4 mr-1.5" />Review Cycles</TabsTrigger>
          <TabsTrigger value="feedback"><MessageSquare className="h-4 w-4 mr-1.5" />Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="reviews" className="space-y-2">
          {mockReviews.map((r) => {
            const oc = outcomeConfig[r.outcome] || outcomeConfig.no_change;
            return (
              <Card key={r.id} className="border-border/50 hover:shadow-sm transition-shadow cursor-pointer" onClick={() => toast.info(`Opening review for ${r.personName}`)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-gold/10 flex items-center justify-center"><TrendingUp className="h-4 w-4 text-gold" /></div>
                    <div>
                      <p className="font-medium text-sm">{r.personName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.period} · Reviewer: {r.reviewer}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={oc.color}>{oc.label}</Badge>
                    <Badge variant="outline" className="text-xs">{r.status.replace("_", " ")}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="feedback" className="space-y-2">
          {mockFeedback.map((f) => (
            <Card key={f.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${f.type === "appreciation" ? "bg-green-50" : "bg-red-50"}`}>
                      {f.type === "appreciation" ? <ThumbsUp className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-red-600" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{f.personName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">From: {f.from} · {f.date}</p>
                    </div>
                  </div>
                  <Badge className={f.type === "appreciation" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                    {f.type}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground ml-12 italic">"{f.content}"</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
