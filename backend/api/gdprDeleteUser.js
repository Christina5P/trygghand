// backend/api/gdprDeleteUser.js
/**
 * GDPR User Deletion API (Backend version)
 * 
 * Denna funktion raderar en användare helt enligt GDPR:
 * 1. Anropar SQL-funktionen delete_user_data() för att radera all appdata
 * 2. Raderar användaren från auth.users (kräver service role key)
 * 3. Loggar borttagningen för compliance
 * 
 * SÄKERHET: Denna funktion MÅSTE köras server-side med SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("VARNING: SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY saknas!");
}

// Admin client med service role key (server-side only!)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * Huvudfunktion: Radera användare helt (GDPR-compliant)
 */
export async function deleteUserGDPR({ userId, adminId, reason = "GDPR deletion request" }) {
  try {
    console.log("🔍 GDPR Delete Request:", { userId, adminId, reason });
    
    // Admin-verifiering är redan gjord på route-nivå (adminPassword check)
    // Vi förlitar oss på att SERVICE_ROLE_KEY bara finns på backend
    
    // 1) Hämta användarens email för loggning (optional - det kan redan vara raderat från auth)
    let userEmail = "unknown";
    const { data: authUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (!getUserError && authUser?.user?.email) {
      userEmail = authUser.user.email;
      console.log("✓ User found in auth:", userEmail);
    } else {
      console.log("⚠️  User not found in auth.users (might already be deleted or never created):", userId);
      // Försök hämta email från customers istället
      const { data: customer } = await supabaseAdmin
        .from("customers")
        .select("email")
        .eq("id", userId)
        .single();
      
      if (customer?.email) {
        userEmail = customer.email;
        console.log("✓ Found email in customers table:", userEmail);
      }
    }

    // 2) Anropa SQL-funktionen för att radera all app-data
    console.log("🗑️ Calling delete_user_data() for:", userId);
    const { data: deleteDataResult, error: deleteDataError } = await supabaseAdmin.rpc(
      "delete_user_data",
      { user_uuid: userId }
    );

    console.log("📊 RPC result:", { deleteDataResult, error: deleteDataError?.message });

    if (deleteDataError) {
      console.error("❌ Error deleting user data:", deleteDataError);
      return {
        success: false,
        error: `Failed to delete user data: ${deleteDataError.message}`,
        details: deleteDataError,
      };
    }

    // 3) Radera från auth.users (permanent!)
    // Men om användaren inte finns där, skippa det - det är ok
    console.log("🔐 Attempting to delete from auth.users:", userId);
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      // Om användaren inte existerar i auth, är det ok - vi fortsätter ändå
      if (deleteAuthError.message.includes("not found") || deleteAuthError.message.includes("User not found")) {
        console.log("⚠️  User not found in auth (might already be deleted), continuing...");
      } else {
        console.error("❌ Unexpected error deleting auth user:", deleteAuthError);
        return {
          success: false,
          error: `Failed to delete auth user: ${deleteAuthError.message}`,
          details: deleteAuthError,
        };
      }
    } else {
      console.log("✓ Auth user deleted successfully");
    }

    // 4) Logga borttagningen (optional, men bra för compliance)
    await supabaseAdmin.from("deleted_users_log").insert({
      user_id: userId,
      user_email: userEmail,
      deleted_by: adminId,
      deletion_reason: reason,
      deleted_at: new Date().toISOString(),
    });

    console.log(`✓ User ${userEmail} (${userId}) deleted successfully by admin ${adminId}`);

    return {
      success: true,
      message: `User ${userEmail} and all associated data deleted successfully`,
      deletedAt: new Date().toISOString(),
      userEmail,
    };
  } catch (error) {
    console.error("Unexpected error in deleteUserGDPR:", error);
    return {
      success: false,
      error: error.message || "Unknown error occurred",
    };
  }
}
