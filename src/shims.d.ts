// Minimal type shims for Node.js built-ins used internally.
// These are only needed for DTS generation — the runtime always has these.

declare module 'node:crypto' {
  function createHmac(
    algorithm: string,
    key: string,
  ): { update(data: string): { digest(encoding: 'hex'): string } };
  function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean;
}
