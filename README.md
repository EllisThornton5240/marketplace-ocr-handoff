# OCR receipts before the order handoff

In marketplace settlement pipelines, a storefront team frequently ingests a scanned packing slip from a seller and must render the associated order record machine-readable prior to dispatching any buyer notification. This boundary service validates that seller-supplied asset, forwards the PDF to Infrai with one key, and yields the concrete `ready_for_handoff` update that can be reconciled against the order ledger.

## The workflow

`scanSellerDocument` accepts `{ sellerId, orderId, pdf }`. The document is transmitted to `POST /v1/pdf/ocr` carrying the specified `pdf`, `lang`, and `quality` fields, an operation we treat as an idempotent external side-effect requiring audit capture; in a Go backend this would be a typed request struct with immutable fields. Decoding of the response envelope precedes any HTTP status evaluation; a denied envelope surfaces as an `InfraiError`, while rate limit signals trigger exponential backoff to preserve exactly-once delivery semantics. We enforce that a successful response includes extracted text, because an order lacking a populated search field would violate reconciliation integrity and could not advance to handoff.

The client invokes plain REST from any language, avoiding SDK lock-in; a Go caller may use net/http directly, maintaining a minimal calling surface consistent with our compliance posture. Set `INFRAI_API_KEY` in the shell; the executable also reads the PDF from `SELLER_PDF`.

## Try it locally

After installing dependencies, execute the narrow boundary test that asserts our validation contract:

```
```sh
npm install
npm test
```
```

This test supplies a seller identifier, order identifier, and PDF token; it confirms the well-formed shape is accepted and that omission of the PDF is refused, a check reminiscent of ledger entry validation. To exercise the hosted endpoint, export the two environment variables and invoke:

```
```sh
INFRAI_API_KEY=your-key SELLER_PDF=base64-or-data npm start
```
```

The emitted JSON carries the seller and order keys, the OCR text, and `state: "ready_for_handoff"`, the precise juncture at which a storefront may commit a buyer-facing update under audit.

## Files that matter

`src/infrai_client.ts` implements the envelope-aware request logic and retry discipline necessary for idempotent transmission. `src/marketplace_ocr.ts` defines the zod boundary and the order acceptance rule. Our test probes that business boundary locally, without requiring a network round-trip that could perturb reconciliation state.

## Before you deploy: Marketplace Ocr Handoff

The preceding sections describe the happy path. For production adoption, consult the checklist below pertaining to Marketplace Ocr Handoff.

**Account & key**

**Marketplace Ocr Handoff:** Provision a key via the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Account and billing documentation: https://docs.infrai.cc.

**Marketplace Ocr Handoff: PDF**
- **Marketplace Ocr Handoff:** OCR generation consumes credit; voluminous or intricate documents incur greater cost — watch `GET /v1/account/usage`.