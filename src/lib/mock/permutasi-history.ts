// Permutasi History Mock Data
// File: src/lib/mock/permutasi-history.ts

export interface PermutasiHistory {
  id: string;
  tanggal: string;
  productCode: string;
  productName: string;
  qtyCarton: number;
  fromLocation: string;
  toLocation: string;
  reason: string;
  movedBy: string;
  createdAt: string;
}

// Helper: Get today's date string
const getTodayString = () => new Date().toISOString().slice(0, 10);
const getTodayISOWithTime = (hour: number, minute: number) => {
  const today = new Date();
  today.setHours(hour, minute, 0, 0);
  return today.toISOString();
};

// Mock Permutasi History Data
export const permutasiHistoryData: PermutasiHistory[] = [
  // --- DATA HARI INI (untuk testing) ---
  {
    id: "PMT-TODAY-001",
    tanggal: getTodayString(),
    productCode: "74553",
    productName: "1500ML AQUA LOCAL 1X12",
    qtyCarton: 70,
    fromLocation: "C-L12-B3-P1",
    toLocation: "B-L5-B4-P2",
    reason: "Relokasi dari In Transit",
    movedBy: "Admin Warehouse",
    createdAt: getTodayISOWithTime(10, 30),
  },
  {
    id: "PMT-TODAY-002",
    tanggal: getTodayString(),
    productCode: "157095",
    productName: "550ML VIT LOCAL 1X24",
    qtyCarton: 24,
    fromLocation: "A-L5-B2-P1",
    toLocation: "B-L22-B7-P1",
    reason: "Koreksi cluster",
    movedBy: "Admin Warehouse",
    createdAt: getTodayISOWithTime(11, 45),
  },
  // --- DATA LAMA ---
  {
    id: "PMT-2025-001",
    tanggal: "2025-12-20",
    productCode: "74561",
    productName: "600ML AQUA LOCAL 1X24",
    qtyCarton: 40,
    fromLocation: "C-L11-B1-P2",
    toLocation: "A-L8-B6-P1",
    reason: "Relokasi dari In Transit",
    movedBy: "Admin Warehouse",
    createdAt: "2025-12-20T09:00:00",
  },
  {
    id: "PMT-2025-002",
    tanggal: "2025-12-19",
    productCode: "145141",
    productName: "500ML MIZONE ACTIV LYCHEE LEMON 1X12",
    qtyCarton: 12,
    fromLocation: "B-L10-B3-P1",
    toLocation: "C-L2-B4-P2",
    reason: "Koreksi cluster",
    movedBy: "Admin Warehouse",
    createdAt: "2025-12-19T14:30:00",
  },
  {
    id: "PMT-2025-003",
    tanggal: "2025-12-18",
    productCode: "74556",
    productName: "330ML AQUA LOCAL 1X24",
    qtyCarton: 56,
    fromLocation: "C-L13-B2-P1",
    toLocation: "B-L9-B5-P3",
    reason: "Relokasi dari In Transit",
    movedBy: "Admin Warehouse",
    createdAt: "2025-12-18T16:15:00",
  },
];
