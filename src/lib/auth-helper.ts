// src/lib/auth-helper.ts
import { createClient } from "@/utils/supabase/server";

export async function getCurrentUserProfile() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  // Try RPC first
  const { data: profiles, error: rpcError } = await supabase
    .rpc("get_current_user_profile");
  
  if (!rpcError && profiles && profiles.length > 0) {
    return profiles[0];
  }

  // Fallback to direct query if RPC fails
  const { data: fallbackProfile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  return fallbackProfile || null;
}
