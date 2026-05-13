import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, QrCode, Plus, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

const mockCards = [
  { id: 1, personName: "Rajesh Kumar", cardNumber: "EMB-2026-0012", designation: "Housekeeping Executive", property: "Villa Serenity", validFrom: "2026-01-01", validUntil: "2026-12-31", status: "active" as const },
  { id: 2, personName: "Priya Sharma", cardNumber: "EMB-2026-0015", designation: "Front Desk Associate", property: "Sunset Retreat", validFrom: "2026-01-01", validUntil: "2026-12-31", status: "active" as const },
  { id: 3, personName: "Amit Patel", cardNumber: "EMB-2025-0008", designation: "Maintenance Technician", property: "Ocean View", validFrom: "2025-01-01", validUntil: "2025-12-31", status: "expired" as const },
  { id: 4, personName: "Sunita Devi", cardNumber: "EMB-2026-0020", designation: "Cook", property: "Mountain Lodge", validFrom: "2026-05-01", validUntil: "2027-04-30", status: "active" as const },
];

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  active: { label: "Active", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  expired: { label: "Expired", color: "bg-red-100 text-red-700", icon: XCircle },
  suspended: { label: "Suspended", color: "bg-yellow-100 text-yellow-700", icon: Clock },
};

export default function IdCards() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy">Digital ID Cards</h2>
          <p className="text-sm text-muted-foreground mt-0.5">QR-coded identity cards with expiry management</p>
        </div>
        <Button className="bg-navy text-white hover:bg-navy/90" onClick={() => toast.info("ID card generation coming soon")}><Plus className="h-4 w-4 mr-2" />Generate Card</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border/50"><CardContent className="p-4 text-center"><p className="text-2xl font-semibold text-green-600">{mockCards.filter(c => c.status === "active").length}</p><p className="text-xs text-muted-foreground mt-1">Active Cards</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><p className="text-2xl font-semibold text-red-600">{mockCards.filter(c => c.status === "expired").length}</p><p className="text-xs text-muted-foreground mt-1">Expired</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><p className="text-2xl font-semibold text-navy">{mockCards.length}</p><p className="text-xs text-muted-foreground mt-1">Total Issued</p></CardContent></Card>
      </div>

      <div className="space-y-2">
        {mockCards.map((card) => {
          const config = statusConfig[card.status] || statusConfig.active;
          const Icon = config.icon;
          return (
            <Card key={card.id} className="border-border/50 hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-navy flex items-center justify-center">
                      <QrCode className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{card.personName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{card.cardNumber} · {card.designation}</p>
                      <p className="text-xs text-muted-foreground">{card.property} · Valid: {card.validFrom} to {card.validUntil}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={config.color}><Icon className="h-3 w-3 mr-1" />{config.label}</Badge>
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => toast.info(`QR verification for ${card.cardNumber}`)}>
                      <CreditCard className="h-3 w-3 mr-1" />View Card
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
