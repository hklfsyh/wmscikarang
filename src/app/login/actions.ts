"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  // 1. Panggil RPC function untuk lookup email (aman dengan RLS)
  const { data: email, error: userError } = await supabase
    .rpc("get_email_by_username", { p_username: username });

  // Jika username tidak ditemukan atau email kosong
  if (userError || !email) {
    return redirect("/login?error=Username tidak terdaftar");
  }

  // 2. Lakukan login resmi ke Supabase Auth menggunakan email yang ditemukan
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return redirect("/login?error=Password salah");
  }

  // 3. Jika berhasil, kirim ke halaman utama
  // Redirect ke warehouse-layout sebagai default (root page akan redirect based on role)
  redirect("/warehouse-layout");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // Gunakan redirect dari next/navigation
  redirect("/login");
}
