import { supabase } from "@/lib/supabase";
import { buildCustomerPath, insertCustomerFile } from "@/lib/customerFiles";

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

export async function uploadKeyReceiptSignature(receiptId: string, customerId: string, blob: Blob) {
  const path = buildCustomerPath(customerId, ["key-receipts", receiptId], "signature.png");

  const { error } = await supabase.storage.from("key-receipts").upload(path, blob, {
    upsert: true,
    contentType: "image/png",
  });

  if (error) throw error;

  await insertCustomerFile({
    customerId,
    bucket: "key-receipts",
    path,
    fileType: "image/png",
    size: blob.size,
  });
}

export async function getKeyReceiptSignatureUrl(receiptId: string, customerId: string) {
  const { data, error } = await supabase.storage
    .from("key-receipts")
    .download(buildCustomerPath(customerId, ["key-receipts", receiptId], "signature.png"));

  if (error) throw error;

  return URL.createObjectURL(data);
}
