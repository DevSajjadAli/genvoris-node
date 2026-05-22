import type { GenvorisConfig } from './types.js';
import { CustomersResource } from './resources/customers.js';
import { PlansResource } from './resources/plans.js';
import { SessionsResource } from './resources/sessions.js';
import { WebhooksResource } from './resources/webhooks.js';

// Re-export error classes for named imports
export {
  GenvorisAPIError,
  GenvorisAuthError,
  GenvorisRateLimitError,
  GenvorisValidationError,
} from './errors.js';

// Re-export WebhooksResource for static `verify` usage
export { WebhooksResource } from './resources/webhooks.js';

// Re-export all public types
export type { GenvorisConfig } from './types.js';
export type {
  CustomerCreateParams,
  CustomerUpdateParams,
  CustomerListParams,
  Customer,
  CustomerList,
  CustomerUsage,
  CustomerSession,
  CustomerSessionList,
} from './resources/customers.js';
export type {
  PlanCreateParams,
  PlanUpdateParams,
  PlanListParams,
  Plan,
  PlanList,
} from './resources/plans.js';
export type { SessionMintParams, MintedSession } from './resources/sessions.js';
export type {
  WebhookCreateParams,
  WebhookVerifyOptions,
  WebhookEndpoint,
  WebhookEndpointList,
  GenvorisEvent,
} from './resources/webhooks.js';

/**
 * Official Genvoris Node.js SDK client.
 *
 * @example
 * ```ts
 * import Genvoris from '@genvoris/node';
 *
 * const gv = new Genvoris({ apiKey: process.env.GENVORIS_API_KEY! });
 *
 * const session = await gv.sessions.mint({ customerId: 'ec_abc' });
 * ```
 */
export default class Genvoris {
  readonly customers: CustomersResource;
  readonly plans: PlansResource;
  readonly sessions: SessionsResource;
  readonly webhooks: WebhooksResource;

  constructor(config: GenvorisConfig) {
    if (!config?.apiKey) {
      throw new Error('Genvoris: apiKey is required');
    }
    this.customers = new CustomersResource(config);
    this.plans = new PlansResource(config);
    this.sessions = new SessionsResource(config);
    this.webhooks = new WebhooksResource(config);
  }
}
