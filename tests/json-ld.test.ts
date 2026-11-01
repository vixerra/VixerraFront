// node --experimental-strip-types --test tests/*.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { serializeJsonLd } from "../src/lib/json-ld.ts";

test("a prompt cannot close the script tag", () => {
  const out = serializeJsonLd({ text: "</script><script>alert(1)</script>" });
  assert.ok(!out.includes("<"), out);
  assert.ok(!out.includes(">"), out);
});

test("escaped output parses back to the same data", () => {
  const data = { text: "a < b && c > d " + String.fromCharCode(0x2028) + " </script>", n: 1 };
  assert.deepEqual(JSON.parse(serializeJsonLd(data)), data);
});
