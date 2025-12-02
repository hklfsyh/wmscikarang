"use client";

import { useState, useEffect } from "react";
import { Inter } from "next/font/google";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Map,
  ArrowDownToLine,
  ArrowUpFromLine,
  List,
  ClipboardCheck,
  Database,
} from "lucide-react";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

type UserRole = "admin_warehouse" | "superadmin";

interface User {
  username: string;
  role: UserRole;
  name: string;
}

const baseMenuItems = [
  { href: "/warehouse-layout", label: "Layout Gudang", icon: Map },
  { href: "/inbound", label: "Inbound", icon: ArrowDownToLine },
  { href: "/outbound", label: "Outbound", icon: ArrowUpFromLine },
  { href: "/stock-list", label: "Stock List", icon: List },
  { href: "/stock-opname", label: "Stock Opname", icon: ClipboardCheck },
];

const superadminMenuItems = [
  ...baseMenuItems,
  { href: "/stock-list-master", label: "Master Data Stock", icon: Database },
];

function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

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

  // Don't show sidebar on login page
  if (pathname === "/login") {
    return <div>{children}</div>;
  }

  // Get menu items based on role
  const menuItems = user?.role === "superadmin" ? superadminMenuItems : baseMenuItems;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-slate-900 text-white p-3 rounded-lg shadow-lg"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {sidebarOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Fixed Position */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40
          w-64 h-screen
          bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700 
          flex flex-col shadow-xl
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="p-6 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Map className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">WMS Cikarang</h1>
              <p className="text-xs text-slate-400">
                {user?.role === "superadmin" ? "Super Admin" : "Admin Warehouse"}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${
                  isActive
                    ? "bg-blue-500 text-white shadow-lg shadow-blue-500/50"
                    : "text-slate-300 hover:bg-slate-700 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700 flex-shrink-0">
          {user && (
            <div className="mb-3 pb-3 border-b border-slate-700">
              <p className="text-sm font-semibold text-white">{user.name}</p>
              <p className="text-xs text-slate-400">
                {user.role === "superadmin" ? "Super Admin" : "Admin Warehouse"}
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-all"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content with left margin for sidebar on desktop */}
      <main className="flex-1 min-h-screen overflow-y-auto lg:ml-64">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 mt-16 lg:mt-0">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <RootLayoutContent>{children}</RootLayoutContent>
      </body>
    </html>
  );
}
