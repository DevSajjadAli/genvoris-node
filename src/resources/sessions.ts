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

export interface SessionRevokeParams {
  /** Genvoris customer ID or your `externalId`. */
  customerId: string;
  /** The `jti` claim of the session token to revoke. */
  jti: string;
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

export interface RevokedSession {
  jti: string;
  revoked: true;
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

  /**
   * Revoke a previously minted session token by its `jti` claim.
   *
   * Use this on end-customer logout or when a token is suspected
   * compromised. The token is rejected immediately even though its
   * signature and expiry are otherwise still valid. Idempotent.
   */
  revoke({ customerId, jti }: SessionRevokeParams): Promise<RevokedSession> {
    return request<RevokedSession>(
      this.config,
      `/customers/${encodeURIComponent(customerId)}/sessions/${encodeURIComponent(jti)}`,
      { method: 'DELETE' },
    );
  }
}
