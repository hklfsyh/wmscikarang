import { Inter } from "next/font/google";
import { createClient } from "@/utils/supabase/server";
import { Navigation } from "@/components/navigation";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  
  // Ambil user dari Supabase Auth
  const { data: { user } } = await supabase.auth.getUser();

  // Ambil profil lengkap dari tabel public.users
  let profile = null;
  if (user) {
    const { data: profiles, error: rpcError } = await supabase
      .rpc("get_current_user_profile");
    
    if (rpcError || !profiles || profiles.length === 0) {
      // Fallback ke query biasa
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();
      profile = data;
    } else {
      profile = profiles[0];
    }
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        {!profile ? (
          // Jika tidak ada profil (misal di halaman login), tampilkan tanpa navigasi
          <main>{children}</main>
        ) : (
          // Jika sudah login, tampilkan sidebar dengan data profil asli
          <div className="flex min-h-screen max-w-[100vw] overflow-x-hidden bg-slate-50">
            <Navigation userProfile={profile} />
            <main className="flex-1 min-w-0 lg:ml-64 min-h-screen overflow-x-hidden">
              <div className="p-3 sm:p-4 lg:p-6 max-w-full">{children}</div>
            </main>
          </div>
        )}
      </body>
    </html>
  );
}