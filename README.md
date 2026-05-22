# @genvoris/node

Official Node.js SDK for the [Genvoris Virtual Try-On API](https://docs.genvoris.org).

## Requirements

Node.js **18** or higher (uses native `fetch`).

## Installation

```bash
npm install @genvoris/node
```

## Quick start

```ts
import Genvoris from '@genvoris/node';

const gv = new Genvoris({ apiKey: process.env.GENVORIS_API_KEY! });

// Create a customer
const customer = await gv.customers.create({
  externalId: 'user_42',
  email: 'shopper@example.com',
  planId: 'pln_xxxxxxxx',
});

// Mint a session token for the widget
const session = await gv.sessions.mint({ customerId: customer.id });
// → pass session.token to your frontend
```

## Resources

### Customers

```ts
await gv.customers.create({ externalId, email?, planId?, metadata? })
await gv.customers.retrieve(id)
await gv.customers.update(id, { email?, planId?, status?, resetPeriod? })
await gv.customers.list({ status?, limit?, cursor? })
await gv.customers.cancel(id)
await gv.customers.usage(id)
await gv.customers.sessions(id)
```

### Plans

```ts
await gv.plans.list({ include_inactive? })
await gv.plans.create({ name, monthlyTryOns, externalPriceId?, active? })
await gv.plans.retrieve(id)
await gv.plans.update(id, { name?, monthlyTryOns?, active? })
await gv.plans.archive(id)
```

### Sessions

```ts
await gv.sessions.mint({ customerId, ttlSeconds? })
```

### Webhooks

```ts
await gv.webhooks.list()
await gv.webhooks.create({ url, secret, events })
await gv.webhooks.test(id)
await gv.webhooks.delete(id)
```

## Webhook verification

```ts
import { WebhooksResource } from '@genvoris/node';

// In your Express / Next.js handler — pass the raw body, not parsed JSON
const event = WebhooksResource.verify({
  payload: req.body,
  header: req.header('x-genvoris-signature') ?? '',
  secret: process.env.GENVORIS_WEBHOOK_SECRET!,
});

console.log(event.type, event.data);
```

The signature format is `t=<unix>,v1=<hex>`. The signed string is `${timestamp}.${rawBody}` using HMAC-SHA256. Verification uses `crypto.timingSafeEqual`.

## Error handling

```ts
import {
  GenvorisAPIError,
  GenvorisAuthError,
  GenvorisRateLimitError,
  GenvorisValidationError,
} from '@genvoris/node';

try {
  await gv.customers.retrieve('cus_missing');
} catch (err) {
  if (err instanceof GenvorisAuthError) {
    // 401 / 403 — bad or revoked key
  } else if (err instanceof GenvorisRateLimitError) {
    console.log(`retry after ${err.retryAfterSeconds}s`);
  } else if (err instanceof GenvorisValidationError) {
    console.error(err.fieldErrors);
  } else if (err instanceof GenvorisAPIError) {
    console.error(err.status, err.code, err.requestId);
  }
}
```

The client automatically retries `429`, `502`, `503`, and `504` responses using exponential backoff with jitter (`min(2^n × 250 ms, 8 000 ms)`), up to `maxRetries` (default: 3).

## Configuration

```ts
const gv = new Genvoris({
  apiKey: 'gvk_live_...',
  baseUrl: 'https://genvoris.org/api/v1', // default
  timeoutMs: 30_000,                       // default 30 s
  maxRetries: 3,                           // default 3
  defaultHeaders: { 'X-My-Header': 'val' },
  fetch: customFetch,                      // bring-your-own fetch
});
```

## License

MIT — see [LICENSE](./LICENSE).
