import { supabase } from "@/lib/supabase";

type CustomerFileInsert = {
  customerId: string;
  bucket: string;
  path: string;
  fileType?: string | null;
  size?: number | null;
};

export async function insertCustomerFile({
  customerId,
  bucket,
  path,
  fileType = null,
  size = null,
}: CustomerFileInsert): Promise<void> {
  const { error } = await supabase.from("customer_files").insert({
    customer_id: customerId,
    bucket,
    path,
    file_type: fileType,
    size,
  });
  if (error) throw error;
}

export function buildCustomerPath(customerId: string, segments: string[], filename: string): string {
  const cleaned = segments.filter(Boolean).join("/");
  if (!cleaned) return `customers/${customerId}/${filename}`;
  return `customers/${customerId}/${cleaned}/${filename}`;
}
