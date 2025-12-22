// File: src/app/npl/page.tsx
// NPL - Nota Pengembalian Lapangan (Inbound Secondary)

import { NplForm } from "@/components/npl-form";
import { Navigation } from "@/components/navigation";

export default function NplPage() {
  return (
    <>
      <Navigation />
      <NplForm />
    </>
  );
}
