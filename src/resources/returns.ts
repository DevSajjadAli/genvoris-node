import type { GenvorisConfig } from '../types.js';
import { request } from '../http.js';
import type { ConversionPlatform } from './conversions.js';

export interface ReturnCreateParams {
  /** Platform order ID matching a conversion when possible. */
  orderId: string;
  platform: ConversionPlatform;
  /** Refunded amount in integer cents. */
  refundedAmountCents: number;
  /** ISO 4217 currency code. Defaults to USD server-side. */
  currency?: string;
  reason?: string;
}

export interface ReturnEvent {
  id: string;
  conversionEventId: string | null;
}

export class ReturnsResource {
  constructor(private readonly config: GenvorisConfig) {}

  /** Store a return/refund event for conversion and returns-saved analytics. */
  create(params: ReturnCreateParams): Promise<ReturnEvent> {
    return request<ReturnEvent>(this.config, '/returns', {
      method: 'POST',
      body: params,
    });
  }
}
