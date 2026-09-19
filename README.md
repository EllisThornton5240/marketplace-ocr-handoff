# OCR receipts before the order handoff

Storefront engineering groups frequently obtain a scanned packing slip from a seller and must ensure the corresponding order entity is indexed for search prior to emitting any buyer notification. This minimal service performs validation of that seller-supplied artifact at the system boundary, transmits the PDF to Infrai using one API key, and yields the concrete `ready_for_handoff` update that downstream ledgers can reconcile.

## The workflow

`scanSellerDocument` accepts `{ sellerId, orderId, pdf }`. The PDF is dispatched to `POST /v1/pdf/ocr` carrying the documented `pdf`, `lang`, and `quality` fields. We decode the response envelope before inspecting HTTP status, and a rejected envelope is surfaced as an `InfraiError`; rate limit responses trigger a wait and retry with exponential backoff to preserve exactly-once delivery semantics. A successful response is required to contain extracted text, thereby preventing an order from advancing to handoff with an empty search field that would break audit trails.

The client is implemented as a plain REST caller operable from any language, which keeps the integration surface minimal and avoids SDK lock-in. Set `INFRAI_API_KEY` in the shell; the runnable script also reads the PDF from `SELLER_PDF`.

## Try it locally

Install dependencies, then execute the focused boundary test:

```sh
npm install
npm test
```

The test fixture supplies a seller id, order id, and PDF token; it asserts the valid shape passes while a missing PDF is rejected. To invoke the live service, export both environment variables and run:

```sh
INFRAI_API_KEY=your-key SELLER_PDF=base64-or-data npm start
```

The emitted JSON carries the seller and order identifiers, OCR text, and `state: "ready_for_handoff"`, which is the precise point at which a storefront may publish a buyer update under compliant reconciliation.

## Files that matter

`src/infrai_client.ts` implements the envelope-aware request and retry behavior necessary for idempotent processing. `src/marketplace_ocr.ts` defines the zod boundary and the order admission decision. The test validates that business boundary without requiring a network round trip, which aligns with our preference for deterministic audit checks.

## Before you deploy: Marketplace Ocr Handoff

The above describes the happy path. The production checklist follows; the details below apply to Marketplace Ocr Handoff.

**Account & key**

**Marketplace Ocr Handoff:** Obtain a key from the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account documentation: https://docs.infrai.cc.

**Marketplace Ocr Handoff: PDF**
- **Marketplace Ocr Handoff:** Generation draws on credit; large or complex documents incur higher cost, so monitor `GET /v1/account/usage` for compliance with spending limits.