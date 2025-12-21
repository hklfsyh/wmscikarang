"use client";

import { Inter } from "next/font/google";
import { usePathname } from "next/navigation";
import { Navigation } from "@/components/navigation";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Don't show sidebar on login page
  if (pathname === "/login") {
    return <div>{children}</div>;
  }

  return (
    <div className="flex min-h-screen max-w-[100vw] overflow-x-hidden bg-linear-to-br from-slate-50 to-slate-100">
      {/* Navigation Sidebar with Digital Clock */}
      <Navigation />

      {/* Main content - full width on mobile, with left margin on desktop */}
      <main className="flex-1 min-w-0 lg:ml-64 min-h-screen overflow-x-hidden">
        <div className="p-3 sm:p-4 lg:p-6 max-w-full">
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
