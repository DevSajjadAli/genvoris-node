import type { GenvorisConfig } from '../types.js';
import { request } from '../http.js';

// ---------------------------------------------------------------------------
// Parameter types
// ---------------------------------------------------------------------------

export interface PlanCreateParams {
  /** Display name. 1–80 characters. */
  name: string;
  /** Monthly try-on quota. 1–1 000 000. */
  monthlyTryOns: number;
  /** Map back to your billing price ID (e.g. Stripe price_xxx). */
  externalPriceId?: string;
  /** Defaults to `true`. */
  active?: boolean;
}

export interface PlanUpdateParams {
  name?: string;
  monthlyTryOns?: number;
  externalPriceId?: string;
  active?: boolean;
}

export interface PlanListParams {
  /** Include soft-disabled plans. Default: `false`. */
  include_inactive?: boolean;
}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface Plan {
  id: string;
  name: string;
  monthlyTryOns: number;
  externalPriceId?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlanList {
  data: Plan[];
}

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------

export class PlansResource {
  constructor(private readonly config: GenvorisConfig) {}

  /** List all plans. Pass `{ include_inactive: true }` to include disabled ones. */
  list(params: PlanListParams = {}): Promise<PlanList> {
    return request<PlanList>(this.config, '/plans', {
      query: params as Record<string, string | number | boolean | undefined>,
    });
  }

  /** Create a new plan. Returns `201 Created`. */
  create(params: PlanCreateParams): Promise<Plan> {
    return request<Plan>(this.config, '/plans', {
      method: 'POST',
      body: params,
    });
  }

  /** Retrieve a single plan. */
  retrieve(id: string): Promise<Plan> {
    return request<Plan>(this.config, `/plans/${encodeURIComponent(id)}`);
  }

  /** Update any plan fields. */
  update(id: string, params: PlanUpdateParams): Promise<Plan> {
    return request<Plan>(this.config, `/plans/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: params,
    });
  }

  /**
   * Soft-disable a plan. Existing customers keep quota until cancelled or
   * reassigned. The plan stops appearing in `list()` unless `include_inactive`
   * is `true`.
   */
  archive(id: string): Promise<void> {
    return request<void>(this.config, `/plans/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }
}
