/**
 * ═══════════════════════════════════════════════════════════════════════
 * Full & Final (F&F) Settlement Calculation Engine
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Calculates the final settlement amount for exiting employees,
 * considering salary, leave encashment, deductions, and recovery.
 *
 * Components:
 *   + Pending salary (pro-rated for partial month)
 *   + Leave encashment (unused leave balance × daily rate)
 *   + Bonus / gratuity (if applicable)
 *   - Salary advance recovery
 *   - Breakage deductions
 *   - Notice period shortfall
 *   - Tax deductions
 */

export interface FnFInput {
  /** Monthly salary (gross) */
  monthlySalary: number;
  /** Daily rate override (for associates) — if not provided, calculated from monthlySalary */
  dailyRate?: number;
  /** Last working day */
  lastWorkingDay: string;
  /** Date salary was last paid through */
  salaryPaidThrough: string;
  /** Unused leave balance (in days) */
  unusedLeaveDays: number;
  /** Whether leave is encashable per policy */
  leaveEncashable: boolean;
  /** Notice period required (days) */
  noticePeriodDays: number;
  /** Notice period actually served (days) */
  noticePeriodServed: number;
  /** Outstanding salary advance to recover */
  salaryAdvanceOutstanding: number;
  /** Breakage deductions pending */
  breakageDeductions: number;
  /** Bonus amount (if any) */
  bonusAmount: number;
  /** Gratuity amount (if eligible — typically 5+ years) */
  gratuityAmount: number;
  /** Any other deductions */
  otherDeductions: number;
  /** Any other earnings */
  otherEarnings: number;
}

export interface FnFBreakdown {
  /** Earnings */
  pendingSalary: number;
  leaveEncashment: number;
  bonus: number;
  gratuity: number;
  otherEarnings: number;
  totalEarnings: number;

  /** Deductions */
  noticePeriodRecovery: number;
  salaryAdvanceRecovery: number;
  breakageDeductions: number;
  otherDeductions: number;
  totalDeductions: number;

  /** Net settlement */
  netSettlement: number;

  /** Calculation metadata */
  pendingSalaryDays: number;
  dailyRate: number;
  noticePeriodShortfall: number;
}

/**
 * Calculate the full and final settlement amount.
 */
export function calculateFnF(input: FnFInput): FnFBreakdown {
  const dailyRate = input.dailyRate || input.monthlySalary / 30;

  // Pending salary calculation
  const lastWorkingDate = new Date(input.lastWorkingDay);
  const salaryPaidDate = new Date(input.salaryPaidThrough);
  const pendingSalaryDays = Math.max(
    0,
    Math.ceil((lastWorkingDate.getTime() - salaryPaidDate.getTime()) / (1000 * 60 * 60 * 24))
  );
  const pendingSalary = Math.round(pendingSalaryDays * dailyRate * 100) / 100;

  // Leave encashment
  const leaveEncashment = input.leaveEncashable
    ? Math.round(input.unusedLeaveDays * dailyRate * 100) / 100
    : 0;

  // Notice period recovery
  const noticePeriodShortfall = Math.max(0, input.noticePeriodDays - input.noticePeriodServed);
  const noticePeriodRecovery = Math.round(noticePeriodShortfall * dailyRate * 100) / 100;

  // Totals
  const totalEarnings =
    pendingSalary +
    leaveEncashment +
    input.bonusAmount +
    input.gratuityAmount +
    input.otherEarnings;

  const totalDeductions =
    noticePeriodRecovery +
    input.salaryAdvanceOutstanding +
    input.breakageDeductions +
    input.otherDeductions;

  const netSettlement = Math.round((totalEarnings - totalDeductions) * 100) / 100;

  return {
    pendingSalary,
    leaveEncashment,
    bonus: input.bonusAmount,
    gratuity: input.gratuityAmount,
    otherEarnings: input.otherEarnings,
    totalEarnings: Math.round(totalEarnings * 100) / 100,
    noticePeriodRecovery,
    salaryAdvanceRecovery: input.salaryAdvanceOutstanding,
    breakageDeductions: input.breakageDeductions,
    otherDeductions: input.otherDeductions,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    netSettlement,
    pendingSalaryDays,
    dailyRate: Math.round(dailyRate * 100) / 100,
    noticePeriodShortfall,
  };
}
