import { createHmac, timingSafeEqual } from 'node:crypto';
import type { GenvorisConfig } from '../types.js';
import { request } from '../http.js';

// ---------------------------------------------------------------------------
// Parameter types
// ---------------------------------------------------------------------------

export interface WebhookCreateParams {
  /** HTTPS endpoint URL Genvoris will POST events to. */
  url: string;
  /** Signing secret — store this securely; shown only once in the dashboard. */
  secret: string;
  /** Event types to subscribe to, e.g. `['end_customer.created']`. */
  events: string[];
  description?: string;
}

export interface WebhookVerifyOptions {
  /**
   * The raw request body **as received over the wire** — do NOT parse and
   * re-serialise, or the HMAC will mismatch.
   *
   * Pass a `string` or any `ArrayBufferView` (e.g. `Uint8Array`).
   */
  payload: Uint8Array | string;
  /** Value of the `X-Genvoris-Signature` header. */
  header: string;
  /** The endpoint signing secret from your dashboard. */
  secret: string;
  /**
   * Maximum age of the timestamp in seconds before the signature is rejected.
   * Default: 300 (5 minutes).
   */
  toleranceSeconds?: number;
}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  description?: string | null;
  active: boolean;
  createdAt: string;
}

export interface WebhookEndpointList {
  data: WebhookEndpoint[];
}

/** Parsed, verified webhook event envelope. */
export interface GenvorisEvent<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  id: string;
  type: string;
  created: number;
  data: T;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error('genvoris: invalid hex string');
  if (!/^[a-f0-9]+$/i.test(hex)) {
    throw new Error('genvoris: invalid hex string — non-hex characters');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------

export class WebhooksResource {
  constructor(private readonly config: GenvorisConfig) {}

  /** List all webhook endpoints for your store. */
  list(): Promise<WebhookEndpointList> {
    return request<WebhookEndpointList>(this.config, '/webhooks');
  }

  /** Register a new webhook endpoint. */
  create(params: WebhookCreateParams): Promise<WebhookEndpoint> {
    return request<WebhookEndpoint>(this.config, '/webhooks', {
      method: 'POST',
      body: params,
    });
  }

  /** Send a synthetic `webhook.test` ping to the endpoint. */
  test(id: string): Promise<void> {
    return request<void>(
      this.config,
      `/webhooks/${encodeURIComponent(id)}/test`,
      { method: 'POST' },
    );
  }

  /** Delete a webhook endpoint. */
  delete(id: string): Promise<void> {
    return request<void>(
      this.config,
      `/webhooks/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    );
  }

  // -------------------------------------------------------------------------
  // Static helpers
  // -------------------------------------------------------------------------

  /**
   * Verify the `X-Genvoris-Signature` header and return the parsed event.
   *
   * Throws if the signature is invalid, the timestamp is too old, or the
   * header is malformed. Uses `crypto.timingSafeEqual` to prevent
   * timing attacks.
   *
   * @example
   * ```ts
   * import { WebhooksResource } from '@genvoris/node';
   *
   * const event = WebhooksResource.verify({
   *   payload: req.body,  // raw Buffer — do NOT parse JSON first
   *   header: req.header('x-genvoris-signature') ?? '',
   *   secret: process.env.GENVORIS_WEBHOOK_SECRET!,
   * });
   * ```
   */
  static verify<T extends Record<string, unknown> = Record<string, unknown>>({
    payload,
    header,
    secret,
    toleranceSeconds = 300,
  }: WebhookVerifyOptions): GenvorisEvent<T> {
    const raw =
      typeof payload === 'string'
        ? payload
        : new TextDecoder().decode(payload);

    // Parse header: "t=<unix>,v1=<hex>"
    const parts: Record<string, string> = {};
    for (const part of header.split(',')) {
      const eq = part.indexOf('=');
      if (eq !== -1) parts[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
    }
    const { t, v1 } = parts;
    if (!t || !v1) {
      throw new Error('genvoris: invalid signature header — expected t=...,v1=...');
    }

    const ts = parseInt(t, 10);
    if (!Number.isFinite(ts)) {
      throw new Error('genvoris: invalid signature timestamp');
    }

    const age = Math.abs(Date.now() / 1_000 - ts);
    if (age > toleranceSeconds) {
      throw new Error(
        `genvoris: signature timestamp too old (${Math.round(age)}s > ${toleranceSeconds}s tolerance)`,
      );
    }

    const expectedHex = createHmac('sha256', secret)
      .update(`${ts}.${raw}`)
      .digest('hex');

    const a = hexToBytes(expectedHex);
    const b = hexToBytes(v1);

    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new Error('genvoris: signature mismatch');
    }

    return JSON.parse(raw) as GenvorisEvent<T>;
  }
}
