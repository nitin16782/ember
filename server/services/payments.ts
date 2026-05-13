/**
 * ═══════════════════════════════════════════════════════════════════════
 * Cashfree Payment Gateway — Swappable Service Interface
 * ═══════════════════════════════════════════════════════════════════════
 *
 * This module defines the interface for payment gateway integration.
 * The current implementation uses a mock adapter for development.
 * To switch to production Cashfree, implement IPaymentGateway with
 * real API calls and update the service registry.
 *
 * Cashfree API docs: https://docs.cashfree.com/docs
 */

export interface PaymentOrder {
  orderId: string;
  amount: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  returnUrl: string;
  notifyUrl: string;
  metadata?: Record<string, string>;
}

export interface PaymentOrderResponse {
  orderId: string;
  paymentSessionId: string;
  paymentLink: string;
  status: "ACTIVE" | "PAID" | "EXPIRED" | "CANCELLED";
}

export interface PaymentStatus {
  orderId: string;
  status: "SUCCESS" | "PENDING" | "FAILED" | "CANCELLED" | "VOID";
  transactionId: string;
  amount: number;
  paymentMethod: string;
  settledAt?: Date;
}

export interface IPaymentGateway {
  /** Create a payment order and get a payment link/session */
  createOrder(order: PaymentOrder): Promise<PaymentOrderResponse>;
  /** Check the status of a payment order */
  getOrderStatus(orderId: string): Promise<PaymentStatus>;
  /** Process a refund for a completed payment */
  refund(orderId: string, amount: number, reason: string): Promise<{ refundId: string; status: string }>;
  /** Verify webhook signature from the payment gateway */
  verifyWebhook(payload: string, signature: string): boolean;
  /** Get settlement report for a date range */
  getSettlements(from: Date, to: Date): Promise<{ settlements: Array<{ id: string; amount: number; utr: string; settledAt: Date }> }>;
}

/**
 * Mock Cashfree adapter for development.
 * Replace with real implementation for production.
 */
export class MockCashfreeGateway implements IPaymentGateway {
  async createOrder(order: PaymentOrder): Promise<PaymentOrderResponse> {
    console.log("[MockCashfree] Creating order:", order.orderId);
    return {
      orderId: order.orderId,
      paymentSessionId: `session_${Date.now()}`,
      paymentLink: `https://payments.cashfree.com/mock/${order.orderId}`,
      status: "ACTIVE",
    };
  }

  async getOrderStatus(orderId: string): Promise<PaymentStatus> {
    console.log("[MockCashfree] Checking status:", orderId);
    return {
      orderId,
      status: "SUCCESS",
      transactionId: `txn_${Date.now()}`,
      amount: 0,
      paymentMethod: "upi",
    };
  }

  async refund(orderId: string, amount: number, reason: string): Promise<{ refundId: string; status: string }> {
    console.log("[MockCashfree] Refunding:", orderId, amount, reason);
    return { refundId: `ref_${Date.now()}`, status: "SUCCESS" };
  }

  verifyWebhook(payload: string, signature: string): boolean {
    console.log("[MockCashfree] Verifying webhook");
    return true; // Always valid in mock
  }

  async getSettlements(from: Date, to: Date) {
    console.log("[MockCashfree] Getting settlements:", from, to);
    return { settlements: [] };
  }
}

// Service registry — swap this to use real Cashfree in production
export const paymentGateway: IPaymentGateway = new MockCashfreeGateway();
