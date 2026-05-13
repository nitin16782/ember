/**
 * Notification Provider Interfaces — Swappable multi-channel notification system.
 *
 * Current implementations: All mocked for development.
 * Production: Replace mock adapters with real provider implementations.
 *
 * Providers:
 *   - IWhatsAppProvider: Interakt WhatsApp Business API
 *   - IEmailProvider: Resend / AWS SES
 *   - ISmsProvider: Generic SMS gateway
 *
 * All providers are mocked during development with full interface documentation.
 */

// ─── Common Types ───────────────────────────────────────────────────

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  provider: string;
  error?: string;
}

// ─── WhatsApp Provider (Interakt) ───────────────────────────────────

export interface WhatsAppTemplateMessage {
  phone: string;
  templateId: string;
  params: Record<string, string>;
  language?: string;
}

export interface IWhatsAppProvider {
  /** Send a template-based WhatsApp message via Interakt */
  sendTemplate(message: WhatsAppTemplateMessage): Promise<NotificationResult>;

  /** Check delivery status of a sent message */
  getDeliveryStatus(messageId: string): Promise<{ status: string; deliveredAt?: Date }>;

  /** List available WhatsApp templates */
  listTemplates(): Promise<{ id: string; name: string; category: string }[]>;
}

class InteraktMockAdapter implements IWhatsAppProvider {
  async sendTemplate(message: WhatsAppTemplateMessage): Promise<NotificationResult> {
    console.log(`[Interakt Mock] WhatsApp template ${message.templateId} sent to ${message.phone}`);
    return { success: true, messageId: `wa_${Date.now()}`, provider: "interakt" };
  }

  async getDeliveryStatus(messageId: string) {
    return { status: "delivered", deliveredAt: new Date() };
  }

  async listTemplates() {
    return [
      { id: "invoice_issued", name: "Invoice Issued", category: "transactional" },
      { id: "payment_received", name: "Payment Received", category: "transactional" },
      { id: "otp_verification", name: "OTP Verification", category: "authentication" },
      { id: "leave_approved", name: "Leave Decision", category: "transactional" },
      { id: "salary_credited", name: "Salary Credited", category: "transactional" },
      { id: "shift_reminder", name: "Shift Reminder", category: "utility" },
    ];
  }
}

// ─── Email Provider (Resend / SES) ──────────────────────────────────

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  attachments?: { filename: string; content: Buffer | string }[];
}

export interface IEmailProvider {
  /** Send a transactional email */
  sendEmail(message: EmailMessage): Promise<NotificationResult>;

  /** Send a batch of emails */
  sendBatch(messages: EmailMessage[]): Promise<NotificationResult[]>;
}

class ResendMockAdapter implements IEmailProvider {
  async sendEmail(message: EmailMessage): Promise<NotificationResult> {
    console.log(`[Resend Mock] Email sent to ${message.to}: ${message.subject}`);
    return { success: true, messageId: `email_${Date.now()}`, provider: "resend" };
  }

  async sendBatch(messages: EmailMessage[]): Promise<NotificationResult[]> {
    return messages.map((m) => {
      console.log(`[Resend Mock] Batch email to ${m.to}: ${m.subject}`);
      return { success: true, messageId: `email_${Date.now()}`, provider: "resend" };
    });
  }
}

// ─── Omni Expense Reconciliation ────────────────────────────────────

export interface ExpenseReconciliationEntry {
  transactionId: string;
  amount: number;
  date: string;
  description: string;
  category: string;
  vendor?: string;
}

export interface IOmniExpenseProvider {
  /** Fetch unreconciled transactions from Omni */
  fetchUnreconciled(fromDate: string, toDate: string): Promise<ExpenseReconciliationEntry[]>;

  /** Mark a transaction as reconciled */
  markReconciled(transactionId: string, expenseId: number): Promise<{ success: boolean }>;

  /** Push an expense to Omni for tracking */
  pushExpense(expense: { amount: number; description: string; date: string; category: string }): Promise<{ transactionId: string }>;
}

class OmniMockAdapter implements IOmniExpenseProvider {
  async fetchUnreconciled(fromDate: string, toDate: string): Promise<ExpenseReconciliationEntry[]> {
    console.log(`[Omni Mock] Fetching unreconciled transactions from ${fromDate} to ${toDate}`);
    return [
      { transactionId: "omni_001", amount: 5000, date: "2026-05-10", description: "Plumbing repair", category: "maintenance", vendor: "QuickFix Services" },
      { transactionId: "omni_002", amount: 1200, date: "2026-05-11", description: "Cleaning supplies", category: "supplies" },
    ];
  }

  async markReconciled(transactionId: string, expenseId: number) {
    console.log(`[Omni Mock] Transaction ${transactionId} reconciled with expense #${expenseId}`);
    return { success: true };
  }

  async pushExpense(expense: { amount: number; description: string; date: string; category: string }) {
    console.log(`[Omni Mock] Expense pushed: ${expense.description} - ₹${expense.amount}`);
    return { transactionId: `omni_${Date.now()}` };
  }
}

// ─── Service Registry ───────────────────────────────────────────────

let whatsAppInstance: IWhatsAppProvider | null = null;
let emailInstance: IEmailProvider | null = null;
let omniInstance: IOmniExpenseProvider | null = null;

export function getWhatsAppProvider(): IWhatsAppProvider {
  if (!whatsAppInstance) whatsAppInstance = new InteraktMockAdapter();
  return whatsAppInstance;
}

export function getEmailProvider(): IEmailProvider {
  if (!emailInstance) emailInstance = new ResendMockAdapter();
  return emailInstance;
}

export function getOmniExpenseProvider(): IOmniExpenseProvider {
  if (!omniInstance) omniInstance = new OmniMockAdapter();
  return omniInstance;
}
