export interface GenvorisConfig {
  /** Your store API key — starts with `gvk_live_` */
  apiKey: string;
  /** Override the base URL. Default: `https://genvoris.org/api/v1` */
  baseUrl?: string;
  /** Request timeout in milliseconds. Default: 30 000 */
  timeoutMs?: number;
  /** Maximum number of retries on 429/502/503/504. Default: 3 */
  maxRetries?: number;
  /** Additional headers to send on every request */
  defaultHeaders?: Record<string, string>;
  /** Custom fetch implementation. Default: `globalThis.fetch` */
  fetch?: typeof globalThis.fetch;
}
