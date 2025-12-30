"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  // 1. Cari email di public.users berdasarkan username yang diinput
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("email")
    .eq("username", username)
    .single();

  // Jika username tidak ditemukan atau email kosong
  if (userError || !userData?.email) {
    return redirect("/login?error=Username tidak terdaftar");
  }

  // 2. Lakukan login resmi ke Supabase Auth menggunakan email yang ditemukan
  const { error } = await supabase.auth.signInWithPassword({
    email: userData.email,
    password: password,
  });

  if (error) {
    return redirect("/login?error=Password salah");
  }

  // 3. Jika berhasil, kirim ke halaman utama
  // Middleware akan mendeteksi session baru ini melalui Cookies
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // Gunakan redirect dari next/navigation
  redirect("/login");
}
