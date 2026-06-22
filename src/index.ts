import type { GenvorisConfig } from './types.js';
import { CustomersResource } from './resources/customers.js';
import { PlansResource } from './resources/plans.js';
import { SessionsResource } from './resources/sessions.js';
import { WebhooksResource } from './resources/webhooks.js';
import { EventsResource } from './resources/events.js';
import { ConversionsResource } from './resources/conversions.js';
import { ReturnsResource } from './resources/returns.js';

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
export type {
  WidgetEventType,
  WidgetEventInput,
  EventBatchInput,
  EventsAccepted,
} from './resources/events.js';
export type {
  ConversionPlatform,
  ConversionCreateParams,
  ConversionEvent,
} from './resources/conversions.js';
export type { ReturnCreateParams, ReturnEvent } from './resources/returns.js';

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
  readonly events: EventsResource;
  readonly conversions: ConversionsResource;
  readonly returns: ReturnsResource;

  constructor(config: GenvorisConfig) {
    if (!config?.apiKey) {
      throw new Error('Genvoris: apiKey is required');
    }
    this.customers = new CustomersResource(config);
    this.plans = new PlansResource(config);
    this.sessions = new SessionsResource(config);
    this.webhooks = new WebhooksResource(config);
    this.events = new EventsResource(config);
    this.conversions = new ConversionsResource(config);
    this.returns = new ReturnsResource(config);
  }
}
