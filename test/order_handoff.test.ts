import test from "node:test";
import assert from "node:assert/strict";
import { SellerAsset } from "../src/marketplace_ocr.js";

test("an order handoff requires a seller, order, and PDF payload", () => {
  const parsed = SellerAsset.safeParse({ sellerId: "s-17", orderId: "o-204", pdf: "base64-pdf" });
  assert.equal(parsed.success, true);
  assert.equal(SellerAsset.safeParse({ sellerId: "s-17", orderId: "o-204" }).success, false);
});
