import { supabase } from "@/lib/supabase";

export async function createKeyReceipt(
  keyCount: number,
  customerId: string | null,
  description?: string
) {
  const { data, error } = await supabase.rpc("admin_create_key_receipt", {
    p_key_count: keyCount,
    p_customer_id: customerId,
    p_description: description ?? null,
  });

  if (error) throw error;
  return data;
}

export async function uploadKeyReceiptSignature(receiptId: string, blob: Blob) {
  const path = `key-receipts/${receiptId}/signature.png`;

  const { error } = await supabase.storage.from("key-receipts").upload(path, blob, {
    upsert: true,
    contentType: "image/png",
  });

  if (error) throw error;
}

export async function getKeyReceiptSignatureUrl(receiptId: string) {
  const { data, error } = await supabase.storage
    .from("key-receipts")
    .download(`key-receipts/${receiptId}/signature.png`);

  if (error) throw error;

  return URL.createObjectURL(data);
}
