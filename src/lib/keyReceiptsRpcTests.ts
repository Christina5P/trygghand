import { supabase } from "@/lib/supabase";

type RpcError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
} | null;

async function getCurrentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data?.user?.id ?? null;
}

export async function testAdminCreateKeyReceipt(): Promise<void> {
  try {
    const { data, error } = await supabase.rpc("admin_create_key_receipt", {
      p_key_count: 2,
      p_customer_id: null,
      p_description: "Test nyckelkvittens",
    });

    if (error) {
      console.error("admin_create_key_receipt error", error as RpcError);
      return;
    }

    console.log("admin_create_key_receipt ok", data);
  } catch (e) {
    console.error("admin_create_key_receipt exception", e);
  }
}

export async function testAdminGetKeyReceipts(): Promise<void> {
  try {
    const { data, error } = await supabase.rpc("admin_get_key_receipts");

    if (error) {
      console.error("admin_get_key_receipts error", error as RpcError);
      return;
    }

    const list = Array.isArray(data) ? data : [];
    console.log("admin_get_key_receipts count", list.length);
    console.log("admin_get_key_receipts first", list[0] ?? null);
  } catch (e) {
    console.error("admin_get_key_receipts exception", e);
  }
}

export async function testCustomerGetMyKeyReceipts(): Promise<void> {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      console.error("customer_get_my_key_receipts error", { message: "No authenticated user" });
      return;
    }

    const { data, error } = await supabase.rpc("customer_get_my_key_receipts");

    if (error) {
      console.error("customer_get_my_key_receipts error", error as RpcError);
      return;
    }

    const list = Array.isArray(data) ? (data as any[]) : [];
    console.log("customer_get_my_key_receipts count", list.length);
    console.log("customer_get_my_key_receipts first", list[0] ?? null);

    const ids: string[] = list
      .map((r) => (r as any)?.id)
      .filter((v): v is string => typeof v === "string" && v.length > 0);

    if (ids.length === 0) {
      console.log("customer_get_my_key_receipts verify", { ok: true, reason: "no rows" });
      return;
    }

    // Verify: all returned receipts belong to current user.
    // We do this by selecting customer_id for the returned ids; RLS also prevents non-owned rows.
    const { data: rows, error: verifyErr } = await supabase
      .from("key_receipts")
      .select("id, customer_id")
      .in("id", ids);

    if (verifyErr) {
      console.error("customer_get_my_key_receipts verify error", verifyErr as RpcError);
      return;
    }

    const verifyRows = Array.isArray(rows) ? (rows as any[]) : [];
    const allReturned = verifyRows.length === ids.length;
    const allOwn = verifyRows.every((r) => (r as any)?.customer_id === currentUserId);

    console.log("customer_get_my_key_receipts verify", {
      ok: allReturned && allOwn,
      allReturned,
      allOwn,
      count: ids.length,
    });
  } catch (e) {
    console.error("customer_get_my_key_receipts exception", e);
  }
}
