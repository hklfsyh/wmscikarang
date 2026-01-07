"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";

interface UserProfile {
  username: string;
  role: string;
  full_name: string;
  warehouse_id?: string | null;
}

export function Navigation({ userProfile }: { userProfile: UserProfile }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  // Menghindari Hydration Mismatch: Jam hanya muncul setelah komponen nempel di browser
  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, []);

  const formatTime = (date: Date) => date.toLocaleTimeString('en-GB', { hour12: false });
  const formatDate = (date: Date) => date.toLocaleDateString('en-GB');

  const menuItems = [
    { label: "Management Warehouse", path: "/warehouse-management", roles: ["developer"] },
    { label: "Management User", path: "/admin-management", roles: ["developer", "admin_cabang"] },
    { label: "Warehouse Layout", path: "/warehouse-layout", roles: ["admin_cabang", "admin_warehouse"] },
    { label: "Stock List", path: "/stock-list", roles: ["admin_cabang", "admin_warehouse"] },
    { label: "Inbound", path: "/inbound", roles: ["admin_cabang", "admin_warehouse"] },
    { label: "Outbound", path: "/outbound", roles: ["admin_cabang", "admin_warehouse"] },
    { label: "NPL (Return)", path: "/npl", roles: ["admin_warehouse"] },
    { label: "Permutasi", path: "/permutasi", roles: ["admin_warehouse"] },
    { label: "Pre-Stock Opname", path: "/stock-opname", roles: ["admin_warehouse"] },
    { label: "Pre-Stock Opname History", path: "/prestock-opname-history", roles: ["admin_cabang"] },
    { label: "Master Data Stock", path: "/stock-list-master", roles: ["admin_cabang"] },
  ];

  const filteredMenuItems = useMemo(() => 
    menuItems.filter((item) => item.roles.includes(userProfile.role)),
    [userProfile.role]
  );

  const handleMobileMenuClose = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const handleMobileMenuToggle = useCallback(() => {
    setMobileMenuOpen(!mobileMenuOpen);
  }, [mobileMenuOpen]);

  const getIcon = (path: string) => {
    switch (path) {
      case '/warehouse-layout':
      case '/warehouse-management':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;
      case '/stock-list':
      case '/prestock-opname-history':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;
      case '/inbound':
      case '/outbound':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>;
      case '/npl':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>;
      case '/permutasi':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>;
      case '/stock-opname':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
      case '/stock-list-master':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>;
      case '/admin-management':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
      default:
        return null;
    }
  };

  // Memoize NavContent untuk menghindari re-render berlebihan
  const NavContent = useMemo(() => (
    <div className="flex flex-col h-full">
      {/* Logo & Jam */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white text-xl">📦</div>
          <div>
            <h1 className="text-lg font-bold text-white">WMS Lite</h1>
            <p className="text-xs text-slate-400 capitalize">{userProfile.role.replace('_', ' ')}</p>
          </div>
        </div>
        <div className="px-3 py-3 bg-slate-800/50 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div className="text-xs text-blue-400 font-medium">{mounted ? formatDate(currentTime) : '--/--/----'}</div>
          </div>
          <div className="text-2xl font-bold text-white text-center tracking-wider font-mono">
            {mounted ? formatTime(currentTime) : '--:--:--'}
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="flex-1 overflow-y-auto py-4">
        {filteredMenuItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            onClick={() => {
              handleMobileMenuClose();
            }}
            className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-semibold transition-all mb-1 ${
              pathname === item.path ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            {getIcon(item.path)}
            {item.label}
          </Link>
        ))}
      </div>

      {/* Profile & Logout */}
      <div className="p-4 border-t border-slate-700 bg-slate-900/50">
        <div className="mb-4 px-2">
          <p className="text-sm font-bold text-white truncate">{userProfile.full_name}</p>
          <p className="text-xs text-slate-400">@{userProfile.username}</p>
        </div>
        <button
          onClick={async () => {
            await logout(); // Memanggil server action
          }}
          className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <span>🚪</span> Logout
        </button>
      </div>
    </div>
  ), [mounted, currentTime, filteredMenuItems, pathname, userProfile.role, userProfile.full_name, userProfile.username, handleMobileMenuClose]);

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:w-64 lg:flex lg:flex-col bg-slate-900 text-white z-50">
        {NavContent}
      </nav>

      {/* Mobile Toggle Button */}
      <button
        onClick={handleMobileMenuToggle}
        className="fixed top-4 left-4 z-[60] lg:hidden p-2.5 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-all active:scale-90"
      >
        {mobileMenuOpen ? <span className="text-xl">✕</span> : <span className="text-xl">☰</span>}
      </button>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => {
            handleMobileMenuClose();
          }}
        />
      )}

      {/* Mobile Sidebar Content */}
      <nav className={`fixed left-0 top-0 h-screen w-72 bg-slate-900 text-white flex flex-col z-50 lg:hidden transition-transform duration-300 ease-in-out ${
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        {NavContent}
      </nav>
    </>
  );
}