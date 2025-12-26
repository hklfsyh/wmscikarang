"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { InboundForm } from "@/components/inbound-form";
import { InboundHistoryPage } from "@/components/inbound-history";

export default function InboundPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/login");
      return;
    }

    const user = JSON.parse(userStr);
    setUserRole(user.role);
  }, [router]);

  if (!userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <p className="text-xl font-semibold text-gray-700">Memeriksa akses...</p>
        </div>
      </div>
    );
  }

  // Admin Cabang sees history, Admin Warehouse sees form
  if (userRole === "admin_cabang") {
    return <InboundHistoryPage />;
  }

  return <InboundForm />;
}
