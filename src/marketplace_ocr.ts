import { z } from "zod";
import { callInfrai } from "./infrai_client.js";

export const SellerAsset = z.object({ sellerId: z.string().min(1), orderId: z.string().min(1), pdf: z.string().min(1) });
export type SellerAsset = z.infer<typeof SellerAsset>;

export type BuyerUpdate = { orderId: string; sellerId: string; text: string; state: "ready_for_handoff" };

export async function scanSellerDocument(input: unknown): Promise<BuyerUpdate> {
  const asset = SellerAsset.parse(input);
  const result = await callInfrai<{ text?: string }>("/v1/pdf/ocr", { pdf: asset.pdf, lang: "eng", quality: "balanced" });
  const text = result.text?.trim();
  if (!text) throw new Error("OCR returned no searchable text");
  return { orderId: asset.orderId, sellerId: asset.sellerId, text, state: "ready_for_handoff" };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const pdf = process.env.SELLER_PDF;
  if (!pdf) throw new Error("SELLER_PDF is required");
  const update = await scanSellerDocument({ sellerId: "seller-demo", orderId: "order-demo", pdf });
  console.log(JSON.stringify(update, null, 2));
}
