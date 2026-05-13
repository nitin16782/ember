import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, IndianRupee } from "lucide-react";

export default function Payments() {
  const { data: paymentList, isLoading } = trpc.payments.list.useQuery({});

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-navy">Payments</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Track payment collections against invoices</p>
      </div>
      <div className="space-y-2">
        {paymentList?.map((p) => (
          <Card key={p.id} className="border-border/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center"><DollarSign className="h-4 w-4 text-green-600" /></div>
                <div>
                  <p className="font-medium text-sm flex items-center"><IndianRupee className="h-3.5 w-3.5" />{Number(p.amount).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Invoice #{p.invoiceId} · {p.method || "—"} · {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "—"}</p>
                </div>
              </div>
              {p.bankReference && <Badge variant="outline" className="text-xs">{p.bankReference}</Badge>}
            </CardContent>
          </Card>
        ))}
        {!isLoading && (!paymentList || paymentList.length === 0) && (
          <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><DollarSign className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No payments recorded</p></CardContent></Card>
        )}
      </div>
    </div>
  );
}
