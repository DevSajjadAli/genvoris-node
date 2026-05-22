import type { GenvorisConfig } from '../types.js';
import { request } from '../http.js';

// ---------------------------------------------------------------------------
// Parameter types
// ---------------------------------------------------------------------------

export interface CustomerCreateParams {
  /** Your stable external identifier. Re-POSTing with the same value upserts. */
  externalId: string;
  email?: string;
  /** Plan to assign. No plan = every try-on returns 402. */
  planId?: string;
  /** Free-form metadata stored with the customer. */
  metadata?: Record<string, unknown>;
}

export interface CustomerUpdateParams {
  email?: string | null;
  /** Pass `null` to detach the plan. */
  planId?: string | null;
  status?: 'ACTIVE' | 'PAUSED' | 'CANCELLED';
  metadata?: Record<string, unknown> | null;
  /** When `true`, resets the period start to now and end to now + 30 days. */
  resetPeriod?: boolean;
}

export interface CustomerListParams {
  status?: 'ACTIVE' | 'PAUSED' | 'CANCELLED';
  /** 1–200. Default: 50. */
  limit?: number;
  /** Pagination cursor from the previous page's `next_cursor`. */
  cursor?: string;
}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface Customer {
  id: string;
  externalId: string;
  email?: string | null;
  planId?: string | null;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown> | null;
}

export interface CustomerList {
  data: Customer[];
  next_cursor?: string | null;
}

export interface CustomerUsage {
  data: {
    customer_id: string;
    external_id: string;
    plan: { id: string; name: string; monthlyTryOns: number } | null;
    status: string;
    period_start: string;
    period_end: string;
    current: {
      used: number;
      limit: number;
      remaining: number;
      ok: boolean;
    };
    history: Array<{
      period_start: string;
      period_end: string;
      used: number;
      limit: number;
    }>;
  };
}

export interface CustomerSession {
  token: string;
  expires_at: string;
}

export interface CustomerSessionList {
  data: CustomerSession[];
}

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------

export class CustomersResource {
  constructor(private readonly config: GenvorisConfig) {}

  /** Create or upsert an end-customer. */
  create(params: CustomerCreateParams): Promise<Customer> {
    return request<Customer>(this.config, '/customers', {
      method: 'POST',
      body: params,
    });
  }

  /** Retrieve a single customer by their Genvoris `id`. */
  retrieve(id: string): Promise<Customer> {
    return request<Customer>(
      this.config,
      `/customers/${encodeURIComponent(id)}`,
    );
  }

  /** Update a customer's email, plan, status, or metadata. */
  update(id: string, params: CustomerUpdateParams): Promise<Customer> {
    return request<Customer>(
      this.config,
      `/customers/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: params },
    );
  }

  /** List customers with optional status filter and cursor pagination. */
  list(params: CustomerListParams = {}): Promise<CustomerList> {
    return request<CustomerList>(this.config, '/customers', {
      query: params as Record<string, string | number | boolean | undefined>,
    });
  }

  /** Soft-cancel a customer. Future try-ons return 402 `cancelled`. */
  cancel(id: string): Promise<void> {
    return request<void>(
      this.config,
      `/customers/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    );
  }

  /** Return the customer's current-period quota state and usage history. */
  usage(id: string): Promise<CustomerUsage> {
    return request<CustomerUsage>(
      this.config,
      `/customers/${encodeURIComponent(id)}/usage`,
    );
  }

  /** List active widget sessions for this customer. */
  sessions(id: string): Promise<CustomerSessionList> {
    return request<CustomerSessionList>(
      this.config,
      `/customers/${encodeURIComponent(id)}/sessions`,
    );
  }
}
