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

export async function uploadKeyReceiptSignature(
  receiptId: string,
  customerId: string,
  blob: Blob,
  receiptCustomerId?: string | null
) {
  const path = buildCustomerPath(customerId, ["key-receipts", receiptId], "signature.png");
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("key receipt storage upload starting", {
    bucket: "key-receipts",
    path,
    receiptId,
    customerId,
    userId: user?.id ?? null,
    receiptCustomerId: receiptCustomerId ?? null,
    sessionUserMatchesReceiptCustomer: user?.id === receiptCustomerId,
  });

  const { error } = await supabase.storage.from("key-receipts").upload(path, blob, {
    upsert: false,
    contentType: "image/png",
  });

  if (error && !/already exists|duplicate|the resource already exists/i.test(error.message ?? "")) {
    console.error("key receipt storage upload failed", {
      bucket: "key-receipts",
      path,
      receiptId,
      customerId,
      userId: user?.id ?? null,
      error,
    });
    throw error;
  }

  console.log("key receipt storage upload succeeded", {
    bucket: "key-receipts",
    path,
    receiptId,
    customerId,
    userId: user?.id ?? null,
    alreadyExisted: Boolean(error),
  });

  console.log("customer_files insert starting", {
    receiptId,
    customerId,
    userId: user?.id ?? null,
  });
  try {
    await insertCustomerFile({
      customerId,
      bucket: "key-receipts",
      path,
      fileType: "image/png",
      size: blob.size,
    });
    console.log("customer_files insert succeeded", {
      receiptId,
      customerId,
      userId: user?.id ?? null,
    });
  } catch (error) {
    console.error("customer_files insert failed", {
      receiptId,
      customerId,
      userId: user?.id ?? null,
      error,
    });
  }
}

export async function getKeyReceiptSignatureUrl(receiptId: string, customerId: string) {
  const { data, error } = await supabase.storage
    .from("key-receipts")
    .download(buildCustomerPath(customerId, ["key-receipts", receiptId], "signature.png"));

  if (error) throw error;

  return URL.createObjectURL(data);
}
