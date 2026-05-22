import type { GenvorisConfig } from '../types.js';
import { request } from '../http.js';

// ---------------------------------------------------------------------------
// Parameter types
// ---------------------------------------------------------------------------

export interface SessionMintParams {
  /** Genvoris customer ID or your `externalId`. */
  customerId: string;
  /** JWT lifetime in seconds. Default: 900 (15 min). */
  ttlSeconds?: number;
}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface MintedSession {
  token: string;
  token_type: 'Bearer';
  /** Remaining lifetime in seconds at issuance. */
  expires_in: number;
  /** ISO-8601 expiry timestamp. */
  expires_at: string;
  customer: {
    id: string;
    external_id: string;
    plan_name: string | null;
    monthly_try_ons: number | null;
    period_end: string | null;
  };
}

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------

export class SessionsResource {
  constructor(private readonly config: GenvorisConfig) {}

  /**
   * Mint a short-lived widget session token for a customer.
   *
   * The token should be sent to your frontend and passed to the
   * Genvoris widget — never exposed in client-side code directly.
   */
  mint({ customerId, ttlSeconds }: SessionMintParams): Promise<MintedSession> {
    return request<MintedSession>(
      this.config,
      `/customers/${encodeURIComponent(customerId)}/sessions`,
      {
        method: 'POST',
        body: ttlSeconds !== undefined ? { expires_in: ttlSeconds } : undefined,
      },
    );
  }
}
