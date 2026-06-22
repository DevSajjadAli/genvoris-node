import type { GenvorisConfig } from './types.js';
import {
  GenvorisAPIError,
  GenvorisAuthError,
  GenvorisRateLimitError,
  GenvorisValidationError,
} from './errors.js';

export interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** When set, Content-Type defaults to application/json. Override for
   *  non-JSON payloads (e.g. multipart/form-data for image uploads). */
  contentType?: string;
}

const RETRY_STATUSES = new Set([429, 502, 503, 504]);
const MAX_DELAY_MS = 8_000;
const DEFAULT_BASE_URL = 'https://genvoris.org/api/v1';
const SDK_VERSION = '1.1.0';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function request<T>(
  config: GenvorisConfig,
  path: string,
  opts: RequestOptions = {},
  attempt = 0,
): Promise<T> {
  const { method = 'GET', body, query, contentType } = opts;
  const fetchFn = config.fetch ?? globalThis.fetch;
  const baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');

  let url = `${baseUrl}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) params.set(k, String(v));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  // Create a FRESH AbortController per attempt so a timeout on one
  // retry does not abort the next attempt's request.
  const controller = new AbortController();
  const timerId = setTimeout(
    () => controller.abort(),
    config.timeoutMs ?? 30_000,
  );

  let res: Response;
  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.apiKey}`,
      'User-Agent': `genvoris-node/${SDK_VERSION}`,
      Accept: 'application/json',
      ...config.defaultHeaders,
    };
    // Only set Content-Type when we have a body OR a contentType override.
    // When contentType is explicitly provided (e.g. multipart/form-data),
    // use that; otherwise default to application/json.
    if (body !== undefined || contentType) {
      headers['Content-Type'] = contentType ?? 'application/json';
    }

    res = await fetchFn(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timerId);
    // On network error (including AbortError/timeout), retry if attempts remain.
    if (attempt < (config.maxRetries ?? 3)) {
      const target = Math.pow(2, attempt) * 250;
      const jittered = target * (0.7 + Math.random() * 0.6);
      const delay = Math.min(jittered, MAX_DELAY_MS);
      await sleep(delay);
      return request<T>(config, path, opts, attempt + 1);
    }
    throw err;
  }
  clearTimeout(timerId);

  if (res.ok) {
    if (res.status === 204) return undefined as unknown as T;
    return res.json() as Promise<T>;
  }

  const requestId = res.headers.get('x-request-id') ?? undefined;
  let errBody: Record<string, unknown> = {};
  try {
    errBody = (await res.json()) as Record<string, unknown>;
  } catch {
    // swallow parse errors
  }

  const code = (errBody.error as string) || 'unknown_error';
  const message = (errBody.message as string) || code;

  // Retry transient errors with exponential backoff + decorated jitter.
  // delay = 250ms * 2^attempt * (0.7 + random*0.6) -> ±30% spread around the
  // exponential target so concurrent clients de-correlate their retries
  // instead of all firing in the same [0, base] window (full jitter).
  if (RETRY_STATUSES.has(res.status)) {
    const maxRetries = config.maxRetries ?? 3;
    if (attempt < maxRetries) {
      const target = Math.pow(2, attempt) * 250;
      const jittered = target * (0.7 + Math.random() * 0.6);
      const delay = Math.min(jittered, MAX_DELAY_MS);
      await sleep(delay);
      return request<T>(config, path, opts, attempt + 1);
    }
  }

  const errorBase = { status: res.status, code, message, requestId };

  if (res.status === 401 || res.status === 403) {
    throw new GenvorisAuthError(errorBase);
  }
  if (res.status === 429) {
    const retryAfter = res.headers.get('retry-after');
    throw new GenvorisRateLimitError({
      ...errorBase,
      retryAfterSeconds: retryAfter ? Number(retryAfter) : 60,
    });
  }
  if (res.status === 400 || res.status === 422) {
    throw new GenvorisValidationError({
      ...errorBase,
      fieldErrors:
        (errBody.fieldErrors as Record<string, string[]>) ?? {},
    });
  }

  throw new GenvorisAPIError(errorBase);
}
