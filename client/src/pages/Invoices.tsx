import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileBarChart, IndianRupee } from "lucide-react";
import { useState, useMemo } from "react";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  issued: "bg-blue-100 text-blue-700",
  partially_paid: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function Invoices() {
  const [statusFilter, setStatusFilter] = useState("all");
  const queryInput = useMemo(() => ({ status: statusFilter !== "all" ? statusFilter : undefined, limit: 50 }), [statusFilter]);
  const { data: invoiceList, isLoading } = trpc.invoices.list.useQuery(queryInput);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy">Invoices</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Owner invoicing and billing management</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Filter" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="issued">Issued</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {invoiceList?.map((inv) => (
          <Card key={inv.id} className="border-border/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center"><FileBarChart className="h-4 w-4 text-blue-600" /></div>
                <div>
                  <p className="font-medium text-sm">{inv.invoiceNo}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{inv.monthCovered} · Due {String(inv.dueDate)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium text-sm flex items-center"><IndianRupee className="h-3.5 w-3.5" />{Number(inv.totalAmount).toLocaleString()}</span>
                <Badge className={statusColors[inv.status]}>{inv.status.replace("_", " ")}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && (!invoiceList || invoiceList.length === 0) && (
          <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><FileBarChart className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No invoices yet</p></CardContent></Card>
        )}
      </div>
    </div>
  );
}
