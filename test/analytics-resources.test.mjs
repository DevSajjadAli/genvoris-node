import assert from 'node:assert/strict';
import { test } from 'node:test';
import Genvoris from '../dist/index.mjs';

test('events resource posts a single widget event', async () => {
  const calls = [];
  const gv = new Genvoris({
    apiKey: 'gvk_test_key',
    baseUrl: 'https://genvoris.test/api/v1',
    fetch: async (url, init) => {
      calls.push({ url, init });
      return Response.json({ accepted: 1 }, { status: 202 });
    },
  });

  const result = await gv.events.track({
    sessionId: 'session_12345678',
    eventType: 'WIDGET_OPENED',
  });

  assert.deepEqual(result, { accepted: 1 });
  assert.equal(calls[0].url, 'https://genvoris.test/api/v1/events');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer gvk_test_key');
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    sessionId: 'session_12345678',
    eventType: 'WIDGET_OPENED',
  });
});

test('events resource posts a widget event batch', async () => {
  const calls = [];
  const gv = new Genvoris({
    apiKey: 'gvk_test_key',
    baseUrl: 'https://genvoris.test/api/v1',
    fetch: async (url, init) => {
      calls.push({ url, init });
      return Response.json({ accepted: 2 }, { status: 202 });
    },
  });

  await gv.events.trackBatch([
    { sessionId: 'session_12345678', eventType: 'PHOTO_UPLOADED' },
    { sessionId: 'session_12345678', eventType: 'TRYON_GENERATED' },
  ]);

  assert.deepEqual(JSON.parse(calls[0].init.body), {
    events: [
      { sessionId: 'session_12345678', eventType: 'PHOTO_UPLOADED' },
      { sessionId: 'session_12345678', eventType: 'TRYON_GENERATED' },
    ],
  });
});

test('conversions and returns resources post portal analytics schemas', async () => {
  const calls = [];
  const gv = new Genvoris({
    apiKey: 'gvk_test_key',
    baseUrl: 'https://genvoris.test/api/v1',
    fetch: async (url, init) => {
      calls.push({ url, init });
      if (String(url).endsWith('/conversions')) {
        return Response.json({ id: 'conv_1', attributedFromTryOn: true }, { status: 201 });
      }
      return Response.json({ id: 'ret_1', conversionEventId: 'conv_1' }, { status: 201 });
    },
  });

  const conversion = await gv.conversions.create({
    orderId: 'order_1',
    platform: 'custom',
    amountCents: 12900,
    currency: 'USD',
    quantity: 1,
    productId: 'sku_1',
    sessionId: 'session_12345678',
  });
  const refund = await gv.returns.create({
    orderId: 'order_1',
    platform: 'custom',
    refundedAmountCents: 12900,
    currency: 'USD',
  });

  assert.deepEqual(conversion, { id: 'conv_1', attributedFromTryOn: true });
  assert.deepEqual(refund, { id: 'ret_1', conversionEventId: 'conv_1' });
  assert.equal(calls[0].url, 'https://genvoris.test/api/v1/conversions');
  assert.equal(calls[1].url, 'https://genvoris.test/api/v1/returns');
});
