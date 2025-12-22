// NPL History Mock Data
// File: src/lib/mock/npl-history.ts

export interface NplHistory {
  id: string;
  tanggal: string;
  namaPengemudi: string;
  nomorPolisi: string;
  productCode: string;
  productName: string;
  qtyPallet: number;
  qtyCarton: number;
  totalPcs: number;
  location: string;
  status: "completed" | "partial";
  createdAt: string;
}

// Helper: Get today's date string
const getTodayString = () => new Date().toISOString().slice(0, 10);
const getTodayISOWithTime = (hour: number, minute: number) => {
  const today = new Date();
  today.setHours(hour, minute, 0, 0);
  return today.toISOString();
};

// Mock NPL History Data
export const nplHistoryData: NplHistory[] = [
  // --- DATA HARI INI (untuk testing fitur Edit & Batal) ---
  {
    id: "NPL-TODAY-001",
    tanggal: getTodayString(),
    namaPengemudi: "Driver Return 1",
    nomorPolisi: "B 1111 NPL",
    productCode: "74561",
    productName: "600ML AQUA LOCAL 1X24",
    qtyPallet: 0,
    qtyCarton: 5,
    totalPcs: 120,
    location: "A-L9-B1-P1",
    status: "completed",
    createdAt: getTodayISOWithTime(14, 30),
  },
  {
    id: "NPL-TODAY-002",
    tanggal: getTodayString(),
    namaPengemudi: "Driver Return 2",
    nomorPolisi: "B 2222 NPL",
    productCode: "74553",
    productName: "1500ML AQUA LOCAL 1X12",
    qtyPallet: 1,
    qtyCarton: 70,
    totalPcs: 840,
    location: "B-L7-B5-P1",
    status: "completed",
    createdAt: getTodayISOWithTime(15, 45),
  },
  // --- DATA LAMA ---
  {
    id: "NPL-2025-001",
    tanggal: "2025-12-20",
    namaPengemudi: "Andi Wijaya",
    nomorPolisi: "B 3333 NPL",
    productCode: "166126",
    productName: "220ML AQUA CUBE MINI BOTTLE LOCAL 1X24",
    qtyPallet: 0,
    qtyCarton: 10,
    totalPcs: 240,
    location: "A-L3-B2-P1",
    status: "completed",
    createdAt: "2025-12-20T16:00:00",
  },
  {
    id: "NPL-2025-002",
    tanggal: "2025-12-19",
    namaPengemudi: "Budi Hartono",
    nomorPolisi: "B 4444 NPL",
    productCode: "145141",
    productName: "500ML MIZONE ACTIV LYCHEE LEMON 1X12",
    qtyPallet: 0,
    qtyCarton: 8,
    totalPcs: 96,
    location: "C-L4-B3-P2",
    status: "completed",
    createdAt: "2025-12-19T17:30:00",
  },
  {
    id: "NPL-2025-003",
    tanggal: "2025-12-18",
    namaPengemudi: "Candra Kusuma",
    nomorPolisi: "B 5555 NPL",
    productCode: "157095",
    productName: "550ML VIT LOCAL 1X24",
    qtyPallet: 0,
    qtyCarton: 12,
    totalPcs: 288,
    location: "B-L22-B6-P1",
    status: "completed",
    createdAt: "2025-12-18T14:15:00",
  },
];
