import { test } from "node:test";
import assert from "node:assert/strict";
import { demoApiEndpoint } from "../apps/mobile/src/api-endpoint";

test("runtime demo configuration accepts an HTTPS tunnel origin", () => {
  assert.equal(demoApiEndpoint("https://fresh-demo.trycloudflare.com/"), "https://fresh-demo.trycloudflare.com");
});
test("runtime demo configuration rejects credentials, arbitrary hosts and paths", () => {
  for (const value of [undefined, "http://fresh.trycloudflare.com", "https://example.com", "https://trycloudflare.com.attacker.example", "https://user:secret@fresh.trycloudflare.com", "https://fresh.trycloudflare.com/private", "https://fresh.trycloudflare.com?token=x", "https://fresh.trycloudflare.com:8443"]) {
    assert.throws(() => demoApiEndpoint(value));
  }
});
