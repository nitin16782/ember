// Ensure `globalThis.crypto` (Web Crypto API) is present before any module
// that expects it loads. jose@6 is the immediate consumer — its Web-Crypto-
// only build accesses `crypto.subtle` / `crypto.getRandomValues` as free
// globals. Node 19+ sets `globalThis.crypto` automatically; Node 18 (which
// Railway / Nixpacks may resolve to in some setups) does not.
//
// MUST be the first side-effect import in the server entry so its body
// runs ahead of any module that captures `crypto` at init time.
import { webcrypto } from "node:crypto";

const g = globalThis as unknown as { crypto?: unknown };
if (!g.crypto) {
  g.crypto = webcrypto;
}
