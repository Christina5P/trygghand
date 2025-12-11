// src/api/gdprDeleteUser.ts
/**
 * GDPR User Deletion API
 * 
 * Denna funktion raderar en användare helt enligt GDPR:
 * 1. Anropar SQL-funktionen delete_user_data() för att radera all appdata
 * 2. Raderar användaren från auth.users (kräver service role key)
 * 3. Loggar borttagningen för compliance
 * 
 * SÄKERHET: Denna funktion MÅSTE köras server-side med SERVICE_ROLE_KEY
 * Den exponeras aldrig till frontend!
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for GDPR deletion");
}

// Admin client med service role key (server-side only!)
const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceRoleKey!);

export interface GDPRDeleteRequest {
  userId: string;
  adminId: string; // Admin som gör borttagningen
  reason?: string;
  adminToken?: string; // Valfritt: för extra säkerhet
}

export interface GDPRDeleteResponse {
  success: boolean;
  error?: string;
  message?: string;
  deletedAt?: string;
  userEmail?: string;
}

/**
 * Huvudfunktion: Radera användare helt (GDPR-compliant)
 * 
 * Steg:
 * 1. Verifiera att anroparen är admin
 * 2. Hämta användarens email för loggning
 * 3. Anropa SQL-funktionen delete_user_data() för app-data
 * 4. Radera från auth.users
 * 5. Logga borttagningen
 */
export async function deleteUserGDPR(
  request: GDPRDeleteRequest
): Promise<GDPRDeleteResponse> {
  const { userId, adminId, reason = "GDPR deletion request" } = request;

  try {
    // 1) Verifiera att admin är behörig
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from("customers")
      .select("is_admin")
      .eq("id", adminId)
      .single();

    if (adminError || !adminUser?.is_admin) {
      return {
        success: false,
        error: "Unauthorized: Only admins can delete users",
      };
    }

    // 2) Hämta användarens email för loggning
    const { data: authUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (getUserError || !authUser) {
      return {
        success: false,
        error: `User not found: ${getUserError?.message}`,
      };
    }

    const userEmail = authUser.user?.email || "unknown";

    // 3) Anropa SQL-funktionen för att radera all app-data
    const { error: deleteDataError } = await supabaseAdmin.rpc(
      "delete_user_data",
      { user_uuid: userId }
    );

    if (deleteDataError) {
      console.error("Error deleting user data:", deleteDataError);
      return {
        success: false,
        error: `Failed to delete user data: ${deleteDataError.message}`,
      };
    }

    // 4) Radera från auth.users (permanent!)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error("Error deleting auth user:", deleteAuthError);
      return {
        success: false,
        error: `Failed to delete auth user: ${deleteAuthError.message}`,
      };
    }

    // 5) Logga borttagningen (för compliance/granskning)
    try {
      await supabaseAdmin.from("deleted_users_log").insert({
        user_id: userId,
        email: userEmail,
        deleted_by: adminId,
        reason: reason,
        deleted_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.warn("Failed to log deletion (non-critical):", logError);
      // Vi fortsätter även om loggning misslyckas
    }

    return {
      success: true,
      message: `User ${userEmail} and all related data deleted successfully`,
      userEmail: userEmail,
      deletedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error("GDPR deletion error:", error);
    return {
      success: false,
      error: error.message || "Unknown error during deletion",
    };
  }
}

/**
 * Hämta logg över raderade användare (admin only)
 */
export async function getDeletedUsersLog() {
  try {
    const { data, error } = await supabaseAdmin
      .from("deleted_users_log")
      .select("*")
      .order("deleted_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error("Error fetching deletion log:", error);
    return [];
  }
}
