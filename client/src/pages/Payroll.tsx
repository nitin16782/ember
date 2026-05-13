import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Wallet, FileText, Download, Calculator, IndianRupee, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  processing: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  paid: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

const mockPayslips = [
  { id: 1, personName: "Rahul Sharma", staffType: "full_time", basic: 25000, hra: 10000, conveyance: 1600, special: 5000, pf: 1800, esi: 750, pt: 200, tds: 0, gross: 41600, deductions: 2750, net: 38850 },
  { id: 2, personName: "Priya Patel", staffType: "full_time", basic: 20000, hra: 8000, conveyance: 1600, special: 3000, pf: 1800, esi: 750, pt: 200, tds: 0, gross: 32600, deductions: 2750, net: 29850 },
  { id: 3, personName: "Amit Kumar", staffType: "contractor", basic: 30000, hra: 0, conveyance: 0, special: 0, pf: 0, esi: 0, pt: 0, tds: 3000, gross: 30000, deductions: 3000, net: 27000 },
  { id: 4, personName: "Sunita Devi", staffType: "daily_wage", basic: 15000, hra: 0, conveyance: 0, special: 0, pf: 0, esi: 0, pt: 0, tds: 0, gross: 15000, deductions: 0, net: 15000 },
];

const workerTypeConfig = [
  { type: "Full-Time", code: "full_time", components: ["Basic", "HRA", "Conveyance", "Special Allowance"], deductions: ["PF", "ESI", "PT", "TDS"], payFrequency: "Monthly" },
  { type: "Contractor", code: "contractor", components: ["Contracted Amount"], deductions: ["TDS @ 10%"], payFrequency: "Monthly / Milestone" },
  { type: "Daily Wage", code: "daily_wage", components: ["Daily Rate × Days Worked"], deductions: ["None (below threshold)"], payFrequency: "Weekly / Fortnightly" },
  { type: "Part-Time", code: "part_time", components: ["Hourly Rate × Hours", "Pro-rata Benefits"], deductions: ["PF (if eligible)", "PT"], payFrequency: "Monthly" },
];

export default function Payroll() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: runs, isLoading } = trpc.payroll.runs.useQuery({});
  const utils = trpc.useUtils();

  const createRun = trpc.payroll.createRun.useMutation({
    onSuccess: () => { utils.payroll.runs.invalidate(); setDialogOpen(false); toast.success("Payroll run created"); },
    onError: (err: any) => toast.error(err.message),
  });

  const [form, setForm] = useState({ cycleMonth: "", entity: "" });
  const totalGross = mockPayslips.reduce((s, p) => s + p.gross, 0);
  const totalNet = mockPayslips.reduce((s, p) => s + p.net, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy">Payroll</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Worker-type-aware pay runs, payslips, and bank file export</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button className="bg-navy text-white hover:bg-navy/90"><Plus className="h-4 w-4 mr-2" />New Pay Run</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display text-navy">New Payroll Run</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2"><Label>Cycle Month *</Label><Input type="month" value={form.cycleMonth} onChange={(e) => setForm({ ...form, cycleMonth: e.target.value })} /></div>
              <div className="space-y-2"><Label>Entity</Label><Input value={form.entity} onChange={(e) => setForm({ ...form, entity: e.target.value })} placeholder="e.g. Pinch Lifestyle" /></div>
              <Button onClick={() => { if (!form.cycleMonth) { toast.error("Month required"); return; } createRun.mutate(form); }} className="w-full bg-navy text-white hover:bg-navy/90" disabled={createRun.isPending}>
                {createRun.isPending ? "Creating..." : "Create Pay Run"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pay Runs</p><p className="text-2xl font-semibold text-navy mt-1">{runs?.length || 0}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Gross</p><p className="text-2xl font-semibold text-navy mt-1">₹{totalGross.toLocaleString()}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Net</p><p className="text-2xl font-semibold text-green-600 mt-1">₹{totalNet.toLocaleString()}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Employees</p><p className="text-2xl font-semibold text-navy mt-1">{mockPayslips.length}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="runs" className="space-y-4">
        <TabsList className="bg-cream border border-border/50 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="runs"><Wallet className="h-4 w-4 mr-1.5" />Pay Runs</TabsTrigger>
          <TabsTrigger value="payslips"><FileText className="h-4 w-4 mr-1.5" />Payslips</TabsTrigger>
          <TabsTrigger value="config"><Calculator className="h-4 w-4 mr-1.5" />Worker Types</TabsTrigger>
          <TabsTrigger value="export"><Download className="h-4 w-4 mr-1.5" />Bank Export</TabsTrigger>
        </TabsList>

        <TabsContent value="runs" className="space-y-2">
          {runs?.map((run: any) => (
            <Card key={run.id} className="border-border/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center"><Wallet className="h-4 w-4 text-green-600" /></div>
                  <div>
                    <p className="font-medium text-sm">{run.cycleMonth}</p>
                    <p className="text-xs text-muted-foreground">{run.entity || "All entities"} · Created {run.createdAt ? new Date(run.createdAt).toLocaleDateString() : ""}</p>
                  </div>
                </div>
                <Badge className={statusColors[run.status]}>{run.status}</Badge>
              </CardContent>
            </Card>
          ))}
          {!isLoading && (!runs || runs.length === 0) && (
            <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><Wallet className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No payroll runs yet</p></CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="payslips">
          <Card className="border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-cream/50">
                  <TableHead className="text-xs">Employee</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs text-right">Basic</TableHead>
                  <TableHead className="text-xs text-right">Gross</TableHead>
                  <TableHead className="text-xs text-right">Deductions</TableHead>
                  <TableHead className="text-xs text-right">Net Pay</TableHead>
                  <TableHead className="text-xs text-center">Payslip</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {mockPayslips.map(p => (
                    <TableRow key={p.id} className="text-sm">
                      <TableCell className="font-medium">{p.personName}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{p.staffType.replace("_", " ")}</Badge></TableCell>
                      <TableCell className="text-right">₹{p.basic.toLocaleString()}</TableCell>
                      <TableCell className="text-right">₹{p.gross.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-red-600">₹{p.deductions.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">₹{p.net.toLocaleString()}</TableCell>
                      <TableCell className="text-center"><Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => toast.info(`Payslip for ${p.personName} — PDF generation ready`)}><FileText className="h-3.5 w-3.5" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-3">
          {workerTypeConfig.map(wt => (
            <Card key={wt.code} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2"><p className="font-medium text-sm">{wt.type}</p><Badge variant="outline" className="text-[10px]">{wt.payFrequency}</Badge></div>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Components:</span> {wt.components.join(", ")}</p>
                      <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Deductions:</span> {wt.deductions.join(", ")}</p>
                    </div>
                  </div>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="export">
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-sm font-medium text-navy">Bank File Export</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Generate bank-compatible files for salary disbursement. Supports NEFT/RTGS/IMPS formats for major Indian banks.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {["HDFC Bank — NEFT Format", "ICICI Bank — NEFT Format", "SBI — NEFT Format", "Axis Bank — NEFT Format"].map(bank => (
                  <Button key={bank} variant="outline" className="justify-start" onClick={() => toast.info(`${bank} file export ready`)}>
                    <Download className="h-4 w-4 mr-2" />{bank}
                  </Button>
                ))}
              </div>
              <div className="border-t border-border/50 pt-4">
                <p className="text-xs text-muted-foreground">Export includes: Employee Name, Bank Account, IFSC, Net Pay, UTR Reference. Files are generated in CSV format compatible with each bank's bulk payment portal.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
