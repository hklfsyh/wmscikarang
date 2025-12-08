"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type UserRole = "admin_warehouse" | "superadmin";

interface User {
  username: string;
  role: UserRole;
  name: string;
}

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      setUser(JSON.parse(userStr));
    } else if (pathname !== "/login") {
      router.push("/login");
    }
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

  if (!user || pathname === "/login") return null;

  const menuItems = [
    {
      label: "Warehouse Layout",
      path: "/warehouse-layout",
      icon: "🏢",
      roles: ["admin_warehouse", "superadmin"],
    },
    {
      label: "Stock List",
      path: "/stock-list",
      icon: "📋",
      roles: ["admin_warehouse", "superadmin"],
    },
    {
      label: "Inbound",
      path: "/inbound",
      icon: "📥",
      roles: ["admin_warehouse", "superadmin"],
    },
    {
      label: "Outbound",
      path: "/outbound",
      icon: "📤",
      roles: ["admin_warehouse", "superadmin"],
    },
    {
      label: "Stock Opname",
      path: "/stock-opname",
      icon: "📊",
      roles: ["admin_warehouse", "superadmin"],
    },
    {
      label: "Master Data Stock",
      path: "/stock-list-master",
      icon: "🗄️",
      roles: ["superadmin"],
    },
    {
      label: "Cluster Config",
      path: "/cluster-config",
      icon: "⚙️",
      roles: ["superadmin"],
    },
  ];

  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(user.role)
  );

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white text-xl">
              📦
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">WMS Cikarang</h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                {user.role === "superadmin" ? "Super Admin" : "Admin Warehouse"}
              </p>
            </div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-2">
            {filteredMenuItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  pathname === item.path
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500">
                  {user.role === "superadmin" ? "Super Admin" : "Admin Warehouse"}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-100 transition-all"
              >
                Logout
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white">
          <div className="px-4 py-4 space-y-2">
            {filteredMenuItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                  pathname === item.path
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                {item.label}
              </Link>
            ))}
            <div className="pt-4 mt-4 border-t border-slate-200">
              <div className="flex items-center justify-between px-4 py-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                  <p className="text-xs text-slate-500">
                    {user.role === "superadmin" ? "Super Admin" : "Admin Warehouse"}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-100 transition-all"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
