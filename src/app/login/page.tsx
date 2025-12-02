"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Simulasi login (bypass untuk demo)
    setTimeout(() => {
      if (username === "admin" && password === "admin123") {
        // Admin Warehouse
        localStorage.setItem("user", JSON.stringify({ 
          username: "admin", 
          role: "admin_warehouse",
          name: "Admin Warehouse"
        }));
        router.push("/");
      } else if (username === "superadmin" && password === "super123") {
        // Superadmin
        localStorage.setItem("user", JSON.stringify({ 
          username: "superadmin", 
          role: "superadmin",
          name: "Super Admin"
        }));
        router.push("/");
      } else {
        setError("Username atau password salah!");
      }
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-500 via-blue-600 to-blue-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-lg mb-4">
            <span className="text-4xl">📦</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            WMS Cikarang
          </h1>
          <p className="text-blue-100 text-sm sm:text-base">
            Warehouse Management System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">
            Login ke Sistem
          </h2>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-slate-900"
                placeholder="Masukkan username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-slate-900"
                placeholder="Masukkan password"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                <span className="text-red-600 text-sm font-medium">⚠️ {error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Loading..." : "Login"}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center mb-3 font-semibold">
              Demo Credentials:
            </p>
            <div className="space-y-2 text-xs">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="font-semibold text-slate-700 mb-1">Admin Warehouse</p>
                <p className="text-slate-600">Username: <span className="font-mono font-semibold">admin</span></p>
                <p className="text-slate-600">Password: <span className="font-mono font-semibold">admin123</span></p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="font-semibold text-blue-700 mb-1">Superadmin</p>
                <p className="text-blue-600">Username: <span className="font-mono font-semibold">superadmin</span></p>
                <p className="text-blue-600">Password: <span className="font-mono font-semibold">super123</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-blue-100 text-sm mt-6">
          © 2024 WMS Cikarang. All rights reserved.
        </p>
      </div>
    </div>
  );
}
