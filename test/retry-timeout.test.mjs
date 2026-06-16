// Phase 6: regression tests for the HTTP transport hardening —
//   * a fresh AbortController (and therefore a fresh signal + timeout)
//     is created on every retry attempt, so a slow first attempt can't
//     poison a later retry with an already-fired abort;
//   * retry backoff uses *decorated* jitter — delay scales with
//     Math.random() around the exponential target, not full jitter;
//   * the per-request timeout actually aborts the in-flight fetch;
//   * webhook verification rejects a stale (replayed) timestamp.
//
// These run against the built bundle (`dist/index.mjs`) just like the
// existing webhook test, so `npm test` (which builds first via pretest)
// exercises the real shipped code path.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

import Genvoris, { WebhooksResource } from '../dist/index.mjs';

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const OK_SESSION = {
  token: 't',
  token_type: 'Bearer',
  expires_in: 900,
  expires_at: '',
  customer: {},
};

test('request creates a fresh AbortController (signal) per retry attempt', async () => {
  const signals = [];
  let calls = 0;
  const fetchMock = async (_url, init) => {
    signals.push(init.signal);
    calls += 1;
    // First two attempts are retryable (503); the third succeeds.
    if (calls < 3) return jsonResponse(503, { error: 'unavailable' });
    return jsonResponse(200, OK_SESSION);
  };

  const gv = new Genvoris({
    apiKey: 'gvk_live_test',
    fetch: fetchMock,
    maxRetries: 3,
    timeoutMs: 5_000,
  });

  // Pin Math.random low so the two backoff sleeps stay short.
  const origRandom = Math.random;
  Math.random = () => 0;
  try {
    await gv.sessions.mint({ customerId: 'ec_1' });
  } finally {
    Math.random = origRandom;
  }

  assert.equal(signals.length, 3, 'should have made three attempts');
  // Each attempt must carry a distinct AbortSignal instance.
  assert.notEqual(signals[0], signals[1]);
  assert.notEqual(signals[1], signals[2]);
  // The successful run cleared every timer, so no signal should be aborted.
  for (const s of signals) assert.equal(s.aborted, false);
});

test('retry backoff applies decorated jitter (delay scales with Math.random)', async () => {
  async function measureDelay(randomValue) {
    const times = [];
    const fetchMock = async () => {
      times.push(Date.now());
      return jsonResponse(503, { error: 'unavailable' });
    };
    const gv = new Genvoris({
      apiKey: 'gvk_live_test',
      fetch: fetchMock,
      maxRetries: 1,
      timeoutMs: 5_000,
    });
    const origRandom = Math.random;
    Math.random = () => randomValue;
    try {
      // Exhausts the single retry then throws — we only care about timing.
      await gv.sessions.mint({ customerId: 'ec_1' }).catch(() => {});
    } finally {
      Math.random = origRandom;
    }
    assert.equal(times.length, 2, 'expected one retry (two fetch calls)');
    return times[1] - times[0];
  }

  // attempt 0 target = 2^0 * 250 = 250ms; factor = 0.7 + random*0.6
  const low = await measureDelay(0); // ~175ms
  const high = await measureDelay(1); // ~325ms

  assert.ok(low >= 140 && low <= 270, `low-jitter delay ${low}ms out of range`);
  assert.ok(high >= 280 && high <= 440, `high-jitter delay ${high}ms out of range`);
  assert.ok(high > low, 'a higher Math.random must yield a longer backoff');
});

test('request aborts the in-flight fetch when the timeout elapses', async () => {
  const fetchMock = (_url, init) =>
    new Promise((_resolve, reject) => {
      // Never settles on its own; only the abort signal ends it.
      init.signal.addEventListener('abort', () => {
        const err = new Error('The operation was aborted');
        err.name = 'AbortError';
        reject(err);
      });
    });

  const gv = new Genvoris({
    apiKey: 'gvk_live_test',
    fetch: fetchMock,
    maxRetries: 0,
    timeoutMs: 60,
  });

  const start = Date.now();
  await assert.rejects(() => gv.sessions.mint({ customerId: 'ec_1' }), /abort/i);
  const elapsed = Date.now() - start;
  assert.ok(elapsed < 1_000, `should abort promptly, took ${elapsed}ms`);
});

test('webhook verify rejects a stale timestamp (> tolerance)', () => {
  const SECRET = 'whsec_test_stale';
  const payload = JSON.stringify({ type: 'tryon.completed', id: 'evt_old' });
  const staleTs = Math.floor(Date.now() / 1_000) - 400; // 400s > 300s tolerance
  const hex = createHmac('sha256', SECRET)
    .update(`${staleTs}.${payload}`)
    .digest('hex');
  const header = `t=${staleTs},v1=${hex}`;

  assert.throws(
    () => WebhooksResource.verify({ payload, header, secret: SECRET }),
    /timestamp too old/,
  );
});

test('sessions.revoke() issues a DELETE to the jti endpoint', async () => {
  let captured;
  const fetchMock = async (url, init) => {
    captured = { url, method: init.method };
    return jsonResponse(200, { jti: 'jti_1', revoked: true });
  };

  const gv = new Genvoris({
    apiKey: 'gvk_live_test',
    fetch: fetchMock,
    baseUrl: 'https://genvoris.org/api/v1',
  });

  const out = await gv.sessions.revoke({ customerId: 'ec_1', jti: 'jti_1' });

  assert.equal(captured.method, 'DELETE');
  assert.match(captured.url, /\/customers\/ec_1\/sessions\/jti_1$/);
  assert.equal(out.revoked, true);
});
