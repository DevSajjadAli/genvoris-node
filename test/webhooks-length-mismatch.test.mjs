// Phase 6: regression test for the byte-length guard in
// WebhooksResource.verify. The constant-time compare (timingSafeEqual)
// throws when its inputs have different lengths, so we MUST short-circuit
// on length mismatch first -- otherwise a caller passing a malformed v1
// signature would see a noisy crypto error instead of our friendly
// "signature mismatch" message, and the call site couldn't tell apart
// "wrong key" from "malformed header".
//
// This test pins that contract: any v1 of the wrong byte length (here,
// one byte short of a SHA-256 hex digest) must throw exactly
// "genvoris: signature mismatch", not a Node crypto error.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

import { WebhooksResource } from '../dist/index.mjs';

const SECRET = 'whsec_test_phase6';
const payload = JSON.stringify({ type: 'tryon.completed', id: 'evt_1' });
const ts = Math.floor(Date.now() / 1_000);

test('verify() throws "signature mismatch" on v1 of wrong byte length', () => {
  // Real signature, then drop one hex pair to make it 31 bytes instead
  // of 32 -- still valid hex, just the wrong length for SHA-256.
  const realHex = createHmac('sha256', SECRET).update(`${ts}.${payload}`).digest('hex');
  const shortHex = realHex.slice(0, -2);
  const header = `t=${ts},v1=${shortHex}`;

  assert.throws(
    () => WebhooksResource.verify({ payload, header, secret: SECRET }),
    /genvoris: signature mismatch/,
  );
});

test('verify() throws "signature mismatch" on v1 of right length but wrong bytes', () => {
  const header = `t=${ts},v1=${'0'.repeat(64)}`;

  assert.throws(
    () => WebhooksResource.verify({ payload, header, secret: SECRET }),
    /genvoris: signature mismatch/,
  );
});

test('verify() accepts a correctly-signed payload', () => {
  const hex = createHmac('sha256', SECRET).update(`${ts}.${payload}`).digest('hex');
  const header = `t=${ts},v1=${hex}`;

  const evt = WebhooksResource.verify({ payload, header, secret: SECRET });
  assert.equal(evt.type, 'tryon.completed');
  assert.equal(evt.id, 'evt_1');
});
