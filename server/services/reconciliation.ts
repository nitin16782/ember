/**
 * ═══════════════════════════════════════════════════════════════════════
 * Omni Expense Reconciliation — Swappable Service Interface
 * ═══════════════════════════════════════════════════════════════════════
 *
 * This module defines the interface for expense reconciliation with
 * the Omni financial management system. The current implementation
 * uses a mock adapter for development.
 *
 * To integrate with production Omni:
 * 1. Implement IReconciliationService with real API calls
 * 2. Update the service registry at the bottom of this file
 * 3. Set OMNI_API_KEY and OMNI_BASE_URL environment variables
 */

export interface ReconciliationEntry {
  expenseId: number;
  amount: number;
  category: string;
  propertyId: number;
  date: string;
  description: string;
  receiptUrl?: string;
  vendorName?: string;
}

export interface ReconciliationResult {
  entryId: string;
  status: "matched" | "unmatched" | "partial" | "duplicate" | "error";
  matchedTransactionId?: string;
  matchConfidence?: number;
  discrepancyAmount?: number;
  notes?: string;
}

export interface ReconciliationBatch {
  batchId: string;
  status: "pending" | "processing" | "completed" | "failed";
  totalEntries: number;
  matched: number;
  unmatched: number;
  createdAt: Date;
  completedAt?: Date;
}

export interface IReconciliationService {
  /** Submit a batch of expenses for reconciliation */
  submitBatch(entries: ReconciliationEntry[]): Promise<ReconciliationBatch>;
  /** Check the status of a reconciliation batch */
  getBatchStatus(batchId: string): Promise<ReconciliationBatch>;
  /** Get individual reconciliation results for a batch */
  getBatchResults(batchId: string): Promise<ReconciliationResult[]>;
  /** Manually mark an entry as reconciled */
  manualReconcile(entryId: string, transactionId: string, notes: string): Promise<ReconciliationResult>;
  /** Get unreconciled entries for a date range */
  getUnreconciled(from: Date, to: Date): Promise<ReconciliationEntry[]>;
  /** Export reconciliation report */
  exportReport(batchId: string, format: "csv" | "xlsx"): Promise<{ url: string }>;
}

/**
 * Mock Omni adapter for development.
 * Replace with real implementation for production.
 */
export class MockOmniReconciliation implements IReconciliationService {
  async submitBatch(entries: ReconciliationEntry[]): Promise<ReconciliationBatch> {
    console.log("[MockOmni] Submitting batch:", entries.length, "entries");
    return {
      batchId: `batch_${Date.now()}`,
      status: "completed",
      totalEntries: entries.length,
      matched: Math.floor(entries.length * 0.85),
      unmatched: Math.ceil(entries.length * 0.15),
      createdAt: new Date(),
      completedAt: new Date(),
    };
  }

  async getBatchStatus(batchId: string): Promise<ReconciliationBatch> {
    console.log("[MockOmni] Checking batch:", batchId);
    return {
      batchId,
      status: "completed",
      totalEntries: 0,
      matched: 0,
      unmatched: 0,
      createdAt: new Date(),
      completedAt: new Date(),
    };
  }

  async getBatchResults(batchId: string): Promise<ReconciliationResult[]> {
    console.log("[MockOmni] Getting results for:", batchId);
    return [];
  }

  async manualReconcile(entryId: string, transactionId: string, notes: string): Promise<ReconciliationResult> {
    console.log("[MockOmni] Manual reconcile:", entryId, transactionId);
    return {
      entryId,
      status: "matched",
      matchedTransactionId: transactionId,
      matchConfidence: 1.0,
      notes,
    };
  }

  async getUnreconciled(from: Date, to: Date): Promise<ReconciliationEntry[]> {
    console.log("[MockOmni] Getting unreconciled:", from, to);
    return [];
  }

  async exportReport(batchId: string, format: "csv" | "xlsx"): Promise<{ url: string }> {
    console.log("[MockOmni] Exporting report:", batchId, format);
    return { url: `/mock-reports/${batchId}.${format}` };
  }
}

// Service registry — swap this to use real Omni in production
export const reconciliationService: IReconciliationService = new MockOmniReconciliation();
