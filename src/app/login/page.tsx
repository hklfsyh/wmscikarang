"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Simulasi login (bypass untuk demo)
    setTimeout(() => {
      // Developer
      if (username === "dev_haikal" && password === "dev123") {
        localStorage.setItem("user", JSON.stringify({
          username: "dev_haikal",
          role: "developer",
          name: "Haikal (Developer)",
          warehouseId: null
        }));
        router.push("/warehouse-management");
      } 
      // Admin Cabang Cikarang
      else if (username === "admin_ckr" && password === "admin123") {
        localStorage.setItem("user", JSON.stringify({
          username: "admin_ckr",
          role: "admin_cabang",
          name: "Andi Pratama",
          warehouseId: "wh-001-cikarang"
        }));
        router.push("/");
      }
      // Admin Warehouse Cikarang
      else if (username === "staff_ckr1" && password === "staff123") {
        localStorage.setItem("user", JSON.stringify({
          username: "staff_ckr1",
          role: "admin_warehouse",
          name: "Dewi Lestari",
          warehouseId: "wh-001-cikarang"
        }));
        router.push("/");
      }
      // Admin Cabang Bandung
      else if (username === "admin_bdg" && password === "admin123") {
        localStorage.setItem("user", JSON.stringify({
          username: "admin_bdg",
          role: "admin_cabang",
          name: "Rizki Hakim",
          warehouseId: "wh-002-bandung"
        }));
        router.push("/");
      }
      // Admin Warehouse Bandung
      else if (username === "staff_bdg1" && password === "staff123") {
        localStorage.setItem("user", JSON.stringify({
          username: "staff_bdg1",
          role: "admin_warehouse",
          name: "Siti Nurhaliza",
          warehouseId: "wh-002-bandung"
        }));
        router.push("/");
      }
      // Backward compatibility untuk login lama
      else if (username === "admin" && password === "admin123") {
        localStorage.setItem("user", JSON.stringify({
          username: "admin",
          role: "admin_warehouse",
          name: "Admin Warehouse",
          warehouseId: "wh-001-cikarang"
        }));
        router.push("/");
      } else if (username === "superadmin" && password === "super123") {
        localStorage.setItem("user", JSON.stringify({
          username: "superadmin",
          role: "admin_cabang",
          name: "Admin Cabang",
          warehouseId: "wh-001-cikarang"
        }));
        router.push("/");
      } else {
        setError("Username atau password salah!");
      }
      setLoading(false);
    }, 1000);
  };  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 flex items-center justify-center p-4">
      <div className="w-full max-w-sm sm:max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl shadow-lg mb-3 sm:mb-4">
            <span className="text-3xl sm:text-4xl">📦</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1 sm:mb-2">
            WMS Lite
          </h1>
          <p className="text-blue-100 text-xs sm:text-sm md:text-base">
            Warehouse Management System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-6 md:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 sm:mb-6 text-center">
            Login ke Sistem
          </h2>

          <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-slate-900 text-sm sm:text-base"
                placeholder="Masukkan username"
                required
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-12 rounded-lg border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-slate-900 text-sm sm:text-base"
                  placeholder="Masukkan password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors p-1"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 sm:p-3 flex items-center gap-2">
                <span className="text-red-600 text-xs sm:text-sm font-medium">⚠️ {error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {loading ? "Loading..." : "Login"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-blue-100 text-xs sm:text-sm mt-4 sm:mt-6">
          © 2024 WMS Lite. All rights reserved.
        </p>
      </div>
    </div>
  );
}
