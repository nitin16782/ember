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
import { Switch } from "@/components/ui/switch";
import { Plus, UserX, LogOut, AlertOctagon, FileCheck, Clock, Calculator, IndianRupee } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  initiated: { label: "Initiated", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700", icon: FileCheck },
  completed: { label: "Completed", color: "bg-green-100 text-green-700", icon: LogOut },
  reversed: { label: "Reversed", color: "bg-gray-100 text-gray-600", icon: AlertOctagon },
};

const exitTypeLabels: Record<string, string> = {
  resignation: "Resignation", termination: "Termination", absconding: "Absconding",
  contract_end: "Contract End", mutual: "Mutual Separation",
};

function FnFCalculator() {
  const [form, setForm] = useState({
    monthlySalary: 15000, dailyRate: 500, lastWorkingDay: "", salaryPaidThrough: "",
    unusedLeaveDays: 0, leaveEncashable: true, noticePeriodDays: 30, noticePeriodServed: 30,
    salaryAdvanceOutstanding: 0, breakageDeductions: 0, bonusAmount: 0, gratuityAmount: 0,
    otherDeductions: 0, otherEarnings: 0,
  });
  const [result, setResult] = useState<any>(null);
  const calculate = trpc.settlement.calculate.useMutation({
    onSuccess: (data) => setResult(data),
    onError: (e) => toast.error(e.message),
  });

  const handleCalculate = () => {
    if (!form.lastWorkingDay || !form.salaryPaidThrough) {
      toast.error("Please fill in Last Working Day and Salary Paid Through dates");
      return;
    }
    calculate.mutate(form);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label className="text-xs">Monthly Salary (₹)</Label><Input type="number" value={form.monthlySalary} onChange={(e) => setForm({ ...form, monthlySalary: Number(e.target.value) })} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Daily Rate (₹)</Label><Input type="number" value={form.dailyRate} onChange={(e) => setForm({ ...form, dailyRate: Number(e.target.value) })} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Last Working Day *</Label><Input type="date" value={form.lastWorkingDay} onChange={(e) => setForm({ ...form, lastWorkingDay: e.target.value })} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Salary Paid Through *</Label><Input type="date" value={form.salaryPaidThrough} onChange={(e) => setForm({ ...form, salaryPaidThrough: e.target.value })} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Unused Leave Days</Label><Input type="number" value={form.unusedLeaveDays} onChange={(e) => setForm({ ...form, unusedLeaveDays: Number(e.target.value) })} /></div>
        <div className="flex items-center gap-2 pt-5"><Switch checked={form.leaveEncashable} onCheckedChange={(v) => setForm({ ...form, leaveEncashable: v })} /><Label className="text-xs">Leave Encashable</Label></div>
        <div className="space-y-1.5"><Label className="text-xs">Notice Period (days)</Label><Input type="number" value={form.noticePeriodDays} onChange={(e) => setForm({ ...form, noticePeriodDays: Number(e.target.value) })} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Notice Served (days)</Label><Input type="number" value={form.noticePeriodServed} onChange={(e) => setForm({ ...form, noticePeriodServed: Number(e.target.value) })} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Salary Advance Outstanding (₹)</Label><Input type="number" value={form.salaryAdvanceOutstanding} onChange={(e) => setForm({ ...form, salaryAdvanceOutstanding: Number(e.target.value) })} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Breakage Deductions (₹)</Label><Input type="number" value={form.breakageDeductions} onChange={(e) => setForm({ ...form, breakageDeductions: Number(e.target.value) })} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Bonus (₹)</Label><Input type="number" value={form.bonusAmount} onChange={(e) => setForm({ ...form, bonusAmount: Number(e.target.value) })} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Gratuity (₹)</Label><Input type="number" value={form.gratuityAmount} onChange={(e) => setForm({ ...form, gratuityAmount: Number(e.target.value) })} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Other Deductions (₹)</Label><Input type="number" value={form.otherDeductions} onChange={(e) => setForm({ ...form, otherDeductions: Number(e.target.value) })} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Other Earnings (₹)</Label><Input type="number" value={form.otherEarnings} onChange={(e) => setForm({ ...form, otherEarnings: Number(e.target.value) })} /></div>
      </div>
      <Button onClick={handleCalculate} disabled={calculate.isPending} className="w-full bg-navy text-white hover:bg-navy/90">
        <Calculator className="h-4 w-4 mr-2" />{calculate.isPending ? "Calculating..." : "Calculate F&F Settlement"}
      </Button>

      {result && (
        <Card className="border-gold/30 bg-cream/50">
          <CardContent className="p-4 space-y-3">
            <h4 className="font-display font-semibold text-navy text-sm flex items-center gap-2"><IndianRupee className="h-4 w-4" />Settlement Breakdown</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-muted-foreground">Pending Salary ({result.pendingSalaryDays} days × ₹{result.dailyRate})</span>
              <span className="text-right font-medium text-green-700">+ ₹{result.pendingSalary.toLocaleString()}</span>
              <span className="text-muted-foreground">Leave Encashment</span>
              <span className="text-right font-medium text-green-700">+ ₹{result.leaveEncashment.toLocaleString()}</span>
              {result.bonus > 0 && <><span className="text-muted-foreground">Bonus</span><span className="text-right font-medium text-green-700">+ ₹{result.bonus.toLocaleString()}</span></>}
              {result.gratuity > 0 && <><span className="text-muted-foreground">Gratuity</span><span className="text-right font-medium text-green-700">+ ₹{result.gratuity.toLocaleString()}</span></>}
              {result.otherEarnings > 0 && <><span className="text-muted-foreground">Other Earnings</span><span className="text-right font-medium text-green-700">+ ₹{result.otherEarnings.toLocaleString()}</span></>}
              <span className="font-medium text-navy border-t border-border/50 pt-1 mt-1">Total Earnings</span>
              <span className="text-right font-semibold text-green-700 border-t border-border/50 pt-1 mt-1">₹{result.totalEarnings.toLocaleString()}</span>

              {result.noticePeriodRecovery > 0 && <><span className="text-muted-foreground">Notice Period Recovery ({result.noticePeriodShortfall} days)</span><span className="text-right font-medium text-red-600">- ₹{result.noticePeriodRecovery.toLocaleString()}</span></>}
              {result.salaryAdvanceRecovery > 0 && <><span className="text-muted-foreground">Salary Advance Recovery</span><span className="text-right font-medium text-red-600">- ₹{result.salaryAdvanceRecovery.toLocaleString()}</span></>}
              {result.breakageDeductions > 0 && <><span className="text-muted-foreground">Breakage Deductions</span><span className="text-right font-medium text-red-600">- ₹{result.breakageDeductions.toLocaleString()}</span></>}
              {result.otherDeductions > 0 && <><span className="text-muted-foreground">Other Deductions</span><span className="text-right font-medium text-red-600">- ₹{result.otherDeductions.toLocaleString()}</span></>}
              <span className="font-medium text-navy border-t border-border/50 pt-1 mt-1">Total Deductions</span>
              <span className="text-right font-semibold text-red-600 border-t border-border/50 pt-1 mt-1">₹{result.totalDeductions.toLocaleString()}</span>
            </div>
            <div className="border-t-2 border-navy/20 pt-2 flex justify-between items-center">
              <span className="font-display font-semibold text-navy">Net Settlement</span>
              <span className={`text-lg font-bold ${result.netSettlement >= 0 ? "text-green-700" : "text-red-600"}`}>₹{result.netSettlement.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function Exits() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: exits, isLoading } = trpc.exits.list.useQuery({});
  const [form, setForm] = useState({ personId: "", exitType: "resignation", reason: "", lastWorkingDay: "" });
  const utils = trpc.useUtils();
  const createExit = trpc.exits.create.useMutation({
    onSuccess: () => { utils.exits.list.invalidate(); setDialogOpen(false); setForm({ personId: "", exitType: "resignation", reason: "", lastWorkingDay: "" }); toast.success("Exit initiated"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy">Exit Management</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Full & final settlement, exit workflows, and absconding detection</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-navy text-white hover:bg-navy/90"><Plus className="h-4 w-4 mr-2" />Initiate Exit</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display text-navy">Initiate Exit</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2"><Label>Person ID *</Label><Input type="number" value={form.personId} onChange={(e) => setForm({ ...form, personId: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Exit Type *</Label>
                <Select value={form.exitType} onValueChange={(v) => setForm({ ...form, exitType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resignation">Resignation</SelectItem>
                    <SelectItem value="termination">Termination</SelectItem>
                    <SelectItem value="absconding">Absconding</SelectItem>
                    <SelectItem value="contract_end">Contract End</SelectItem>
                    <SelectItem value="mutual">Mutual Separation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Last Working Day</Label><Input type="date" value={form.lastWorkingDay} onChange={(e) => setForm({ ...form, lastWorkingDay: e.target.value })} /></div>
              <div className="space-y-2"><Label>Reason</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Reason for exit..." rows={3} /></div>
              <Button onClick={() => createExit.mutate({ personId: Number(form.personId), exitType: form.exitType as any, lastWorkingDay: form.lastWorkingDay || undefined, reason: form.reason || undefined })} disabled={!form.personId || createExit.isPending} className="w-full bg-navy text-white hover:bg-navy/90">{createExit.isPending ? "Processing..." : "Initiate Exit Process"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="records" className="w-full">
        <TabsList className="bg-cream/50 border border-border/50">
          <TabsTrigger value="records" className="data-[state=active]:bg-navy data-[state=active]:text-white">Exit Records</TabsTrigger>
          <TabsTrigger value="calculator" className="data-[state=active]:bg-navy data-[state=active]:text-white">F&F Calculator</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-3 mt-4">
          <Card className="border-border/50 bg-navy/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2"><FileCheck className="h-4 w-4 text-navy" /><span className="text-sm font-medium text-navy">Full & Final Settlement Process</span></div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><span className="h-5 w-5 rounded-full bg-navy/10 flex items-center justify-center text-[10px] font-medium text-navy">1</span>Exit Initiated</div>
                <div className="flex items-center gap-1.5"><span className="h-5 w-5 rounded-full bg-navy/10 flex items-center justify-center text-[10px] font-medium text-navy">2</span>Checklist Completed</div>
                <div className="flex items-center gap-1.5"><span className="h-5 w-5 rounded-full bg-navy/10 flex items-center justify-center text-[10px] font-medium text-navy">3</span>F&F Calculated</div>
                <div className="flex items-center gap-1.5"><span className="h-5 w-5 rounded-full bg-navy/10 flex items-center justify-center text-[10px] font-medium text-navy">4</span>Settlement Processed</div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {exits?.map((exit: any) => {
              const config = statusConfig[exit.status] || statusConfig.initiated;
              const Icon = config.icon;
              return (
                <Card key={exit.id} className="border-border/50 hover:shadow-sm transition-shadow cursor-pointer" onClick={() => toast.info(`Opening exit record #${exit.id}`)}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${exit.exitType === "absconding" ? "bg-red-50" : "bg-navy/5"}`}>
                        {exit.exitType === "absconding" ? <AlertOctagon className="h-4 w-4 text-red-600" /> : <UserX className="h-4 w-4 text-navy" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm">Person #{exit.personId} — {exitTypeLabels[exit.exitType] || exit.exitType}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">LWD: {exit.lastWorkingDay ? String(exit.lastWorkingDay) : "TBD"}{exit.ffAmount ? ` · F&F: ₹${Number(exit.ffAmount).toLocaleString()}` : ""}</p>
                        {exit.reason && <p className="text-xs text-muted-foreground mt-0.5 italic">"{exit.reason}"</p>}
                      </div>
                    </div>
                    <Badge className={config.color}><Icon className="h-3 w-3 mr-1" />{config.label}</Badge>
                  </CardContent>
                </Card>
              );
            })}
            {!isLoading && (!exits || exits.length === 0) && (
              <Card className="border-border/50 border-dashed"><CardContent className="p-12 text-center"><UserX className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No exit records yet</p></CardContent></Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="calculator" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4"><Calculator className="h-5 w-5 text-navy" /><h3 className="font-display font-semibold text-navy">Full & Final Settlement Calculator</h3></div>
              <FnFCalculator />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
