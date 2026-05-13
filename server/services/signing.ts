/**
 * ISigningService — Swappable digital signature service interface.
 *
 * Current implementation: ZohoSignMockAdapter (mocked for development)
 * To switch providers (e.g., DocuSign, Adobe Sign):
 *   1. Implement ISigningService for the new provider
 *   2. Update getSigningService() to return the new adapter
 *
 * All methods return Promises to support async API calls.
 */

export interface SigningRequest {
  documentUrl: string;
  signerName: string;
  signerEmail: string;
  signerPhone?: string;
  templateId?: string;
  mergeFields?: Record<string, string>;
  callbackUrl?: string;
}

export interface SigningResponse {
  requestId: string;
  status: "pending" | "sent" | "viewed" | "signed" | "declined" | "expired" | "cancelled";
  signedDocumentUrl?: string;
  signedAt?: Date;
  provider: string;
}

export interface SigningTemplate {
  id: string;
  name: string;
  fields: string[];
  provider: string;
}

export interface ISigningService {
  /** Send a document for digital signature */
  sendForSigning(request: SigningRequest): Promise<SigningResponse>;

  /** Check the current status of a signing request */
  getSigningStatus(requestId: string): Promise<SigningResponse>;

  /** Download the signed document */
  downloadSigned(requestId: string): Promise<{ url: string; expiresAt: Date }>;

  /** Cancel a pending signing request */
  cancelSigning(requestId: string): Promise<{ success: boolean }>;

  /** List available templates from the signing provider */
  listTemplates(): Promise<SigningTemplate[]>;

  /** Handle webhook callbacks from the signing provider */
  webhookHandler(payload: unknown): Promise<{ requestId: string; status: string }>;
}

// ─── Zoho Sign Mock Adapter ─────────────────────────────────────────

class ZohoSignMockAdapter implements ISigningService {
  private mockRequests = new Map<string, SigningResponse>();

  async sendForSigning(request: SigningRequest): Promise<SigningResponse> {
    const requestId = `zoho_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const response: SigningResponse = {
      requestId,
      status: "sent",
      provider: "zoho_sign",
    };
    this.mockRequests.set(requestId, response);
    console.log(`[ZohoSign Mock] Document sent for signing to ${request.signerEmail}`);
    return response;
  }

  async getSigningStatus(requestId: string): Promise<SigningResponse> {
    const existing = this.mockRequests.get(requestId);
    if (!existing) {
      return { requestId, status: "pending", provider: "zoho_sign" };
    }
    return existing;
  }

  async downloadSigned(requestId: string): Promise<{ url: string; expiresAt: Date }> {
    console.log(`[ZohoSign Mock] Downloading signed document for request ${requestId}`);
    return {
      url: `https://mock.zoho.com/signed/${requestId}.pdf`,
      expiresAt: new Date(Date.now() + 3600_000),
    };
  }

  async cancelSigning(requestId: string): Promise<{ success: boolean }> {
    const existing = this.mockRequests.get(requestId);
    if (existing) {
      existing.status = "cancelled";
      this.mockRequests.set(requestId, existing);
    }
    console.log(`[ZohoSign Mock] Signing request ${requestId} cancelled`);
    return { success: true };
  }

  async listTemplates(): Promise<SigningTemplate[]> {
    return [
      { id: "tmpl_offer", name: "Employment Offer Letter", fields: ["employee_name", "designation", "salary", "start_date", "location"], provider: "zoho_sign" },
      { id: "tmpl_nda", name: "Non-Disclosure Agreement", fields: ["party_name", "effective_date", "jurisdiction"], provider: "zoho_sign" },
      { id: "tmpl_contractor", name: "Contractor Agreement", fields: ["contractor_name", "scope", "rate", "duration", "start_date"], provider: "zoho_sign" },
      { id: "tmpl_separation", name: "Separation Agreement", fields: ["employee_name", "last_working_day", "settlement_amount", "reason"], provider: "zoho_sign" },
    ];
  }

  async webhookHandler(payload: unknown): Promise<{ requestId: string; status: string }> {
    const data = payload as { requestId?: string; status?: string };
    const requestId = data.requestId || "unknown";
    const status = data.status || "unknown";
    console.log(`[ZohoSign Mock] Webhook received: ${requestId} -> ${status}`);
    if (data.requestId && this.mockRequests.has(data.requestId)) {
      const existing = this.mockRequests.get(data.requestId)!;
      existing.status = status as SigningResponse["status"];
      if (status === "signed") {
        existing.signedAt = new Date();
        existing.signedDocumentUrl = `https://mock.zoho.com/signed/${requestId}.pdf`;
      }
      this.mockRequests.set(data.requestId, existing);
    }
    return { requestId, status };
  }
}

// ─── Service Registry ───────────────────────────────────────────────

let signingServiceInstance: ISigningService | null = null;

/**
 * Get the active signing service instance.
 * To switch providers, replace ZohoSignMockAdapter with the new adapter.
 */
export function getSigningService(): ISigningService {
  if (!signingServiceInstance) {
    signingServiceInstance = new ZohoSignMockAdapter();
  }
  return signingServiceInstance;
}
