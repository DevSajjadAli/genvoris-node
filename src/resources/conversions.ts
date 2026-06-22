import type { GenvorisConfig } from '../types.js';
import { request } from '../http.js';

export type ConversionPlatform = 'shopify' | 'woocommerce' | 'custom';

export interface ConversionCreateParams {
  /** Platform order ID. Duplicate order IDs are idempotently deduped per merchant/platform. */
  orderId: string;
  platform: ConversionPlatform;
  /** Order value in integer cents. */
  amountCents: number;
  /** ISO 4217 currency code. Defaults to USD server-side. */
  currency?: string;
  quantity?: number;
  productId?: string;
  productTitle?: string;
  /** Widget session ID for hard attribution. */
  sessionId?: string;
  /** Hashed by the portal before storage. */
  customerEmail?: string;
  /** Soft-attribution lookback window. Default: 1440 minutes. */
  attributionWindowMinutes?: number;
}

export interface ConversionEvent {
  id: string;
  attributedFromTryOn: boolean;
  deduped?: boolean;
}

export class ConversionsResource {
  constructor(private readonly config: GenvorisConfig) {}

  /** Store an order conversion for attribution/lift analytics. */
  create(params: ConversionCreateParams): Promise<ConversionEvent> {
    return request<ConversionEvent>(this.config, '/conversions', {
      method: 'POST',
      body: params,
    });
  }
}
