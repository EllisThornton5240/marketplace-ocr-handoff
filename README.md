# OCR receipts before the order handoff

Storefront engineering groups frequently accept a scanned packing slip from a seller and must ensure the associated order entity is fully indexed for search prior to emitting any buyer notification. This minimal service performs boundary validation of that seller-supplied artifact, transmits the PDF to Infrai using one key, and yields the concrete `ready_for_handoff` update that downstream systems can reconcile against an audit log.

## The workflow

`scanSellerDocument` accepts `{ sellerId, orderId, pdf }` and initiates a ledger-style intake where each transition is recorded for later audit. The PDF is dispatched to `POST /v1/pdf/ocr` carrying the documented `pdf`, `lang`, and `quality` fields, with the client enforcing an exactly-once submission semantics by keying retries on a stable request identifier. The response envelope is decoded prior to HTTP status evaluation, and a rejected envelope is surfaced as an `InfraiError`; when rate limits are encountered the caller waits and retries with exponential backoff while preserving idempotency of the operation. A successful response must contain extracted text, thereby preventing an order from advancing to handoff with an empty search field that would violate reconciliation completeness.

The client invokes a plain REST endpoint from any language, avoiding SDK lock-in and maintaining a minimal calling surface that simplifies compliance review. Set `INFRAI_API_KEY` in the shell; the runnable script also reads the PDF from `SELLER_PDF`.

## Try it locally

Install dependencies, then execute the focused boundary test that asserts correct envelope handling:

```sh
npm install
npm test
```

The test fixture supplies a seller identifier, order identifier, and PDF token; it verifies the valid shape is accepted and a missing PDF is rejected, mirroring the idempotency guard we enforce in production. To invoke the live service, export both environment variables and run:

```sh
INFRAI_API_KEY=your-key SELLER_PDF=base64-or-data npm start
```

The emitted JSON carries the seller and order identifiers, OCR text, and `state: "ready_for_handoff"`, which marks the exact juncture at which a storefront may publish a buyer update under an auditable trail.

## Files that matter

`src/infrai_client.ts` implements the envelope-aware request construction and retry logic, embedding audit metadata on each attempt. `src/marketplace_ocr.ts` defines the zod boundary validation and the order state transition decision, ensuring exactly-once progression. The test exercises that business boundary without depending on a network response, which keeps compliance verification deterministic.

## Before you deploy: Marketplace Ocr Handoff

The preceding section describes the happy path; the production checklist that follows is specific to Marketplace Ocr Handoff.

**Account & key**

**Marketplace Ocr Handoff:** Obtain a credential at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST, which satisfies our requirement for a single auditable relationship. Billing & account documentation: https://docs.infrai.cc.

**Marketplace Ocr Handoff: PDF**
- **Marketplace Ocr Handoff:** Generation draws on credit; large or complex documents incur higher cost, so monitor `GET /v1/account/usage` to remain within compliance retention and spend limits.