// src/lib/gdpr.ts
import { supabase } from "@/lib/supabase";

export interface DeleteUserResponse {
  success: boolean;
  error?: string;
  message?: string;
  user_email?: string;
  deleted_at?: string;
}

/**
 * GDPR-compliant user deletion
 * - Raderar användarens auth-konto
 * - Raderar all relaterad data (cases, comments, subscriptions etc)
 * - Loggar borttagningen för compliance
 */
export async function deleteUserGDPR(
  userId: string,
  reason: string = "GDPR deletion request"
): Promise<DeleteUserResponse> {
  try {
    // 1) Kalla SQL-funktionen för att radera data och logga
    const { data: sqlResponse, error: sqlError } = await supabase.rpc(
      "delete_user_gdpr",
      {
        user_id: userId,
        reason: reason,
      }
    );

    if (sqlError || !sqlResponse?.success) {
      throw new Error(sqlResponse?.error || sqlError?.message);
    }

    // 2) Radera auth.users (endast möjligt med service role key från backend)
    // Anropa backend-endpoint istället för att göra det här
    const response = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, reason }),
    });

    if (!response.ok) {
      throw new Error("Failed to delete auth user");
    }

    return {
      success: true,
      message: sqlResponse.message,
      user_email: sqlResponse.user_email,
      deleted_at: sqlResponse.deleted_at,
    };
  } catch (error: any) {
    console.error("GDPR deletion error:", error);
    return {
      success: false,
      error: error.message || "Unknown error during user deletion",
    };
  }
}

/**
 * Hämta logg över raderade användare (admin only)
 */
export async function getDeletedUsersLog() {
  try {
    const { data, error } = await supabase
      .from("deleted_users_log")
      .select("*")
      .order("deleted_at", { ascending: false });

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error("Error fetching deletion log:", error);
    return [];
  }
}
