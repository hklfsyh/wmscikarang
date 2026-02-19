import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Cari role user untuk menentukan halaman awal
  let profile = null;
  
  const { data: profiles, error: rpcError } = await supabase
    .rpc("get_current_user_profile");
  
  if (rpcError || !profiles || profiles.length === 0) {
    const { data: fallbackProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    profile = fallbackProfile;
  } else {
    profile = profiles[0];
  }

  // Redirect based on role - IMMEDIATE, no fallback page render
  if (profile?.role === "developer") {
    redirect("/warehouse-management");
  } else if (profile?.role === "admin_cabang") {
    redirect("/stock-list");
  } else if (profile?.role === "admin_warehouse") {
    redirect("/warehouse-layout");
  } else {
    // Unknown role - redirect to login
    redirect("/login");
  }
}