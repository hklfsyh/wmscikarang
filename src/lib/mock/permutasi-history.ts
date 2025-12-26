// Permutasi History Mock Data
// File: src/lib/mock/permutasi-history.ts

export interface PermutasiHistory {
  id: string; // UUID
  warehouse_id: string; // UUID
  transaction_code: string;
  stock_id: string; // UUID reference to stock_list.id
  product_id: string; // UUID
  qty_carton: number;
  from_cluster: string;
  from_lorong: number;
  from_baris: number;
  from_level: number;
  to_cluster: string;
  to_lorong: number;
  to_baris: number;
  to_level: number;
  reason: string;
  moved_by: string; // UUID admin_warehouse
  moved_at: string;
  created_at: string;
}

// Helper: Get today's date string
const getTodayISOWithTime = (hour: number, minute: number) => {
  const today = new Date();
  today.setHours(hour, minute, 0, 0);
  return today.toISOString();
};

// Mock Permutasi History Data
export const permutasiHistoryData: PermutasiHistory[] = [
  // --- DATA HARI INI (untuk testing) ---
  {
    id: "pmt-001",
    warehouse_id: "wh-001-cikarang",
    transaction_code: "PMT-20251226-0001",
    stock_id: "stk-001",
    product_id: "prod-ckr-002", // 1500ML AQUA LOCAL 1X12
    qty_carton: 70,
    from_cluster: "C",
    from_lorong: 12,
    from_baris: 3,
    from_level: 1,
    to_cluster: "B",
    to_lorong: 5,
    to_baris: 4,
    to_level: 2,
    reason: "Relokasi dari In Transit",
    moved_by: "usr-003", // Dewi Lestari (admin_warehouse)
    moved_at: getTodayISOWithTime(10, 30),
    created_at: getTodayISOWithTime(10, 30),
  },
  {
    id: "pmt-002",
    warehouse_id: "wh-001-cikarang",
    transaction_code: "PMT-20251226-0002",
    stock_id: "stk-002",
    product_id: "prod-ckr-006", // 550ML VIT LOCAL 1X24
    qty_carton: 24,
    from_cluster: "A",
    from_lorong: 5,
    from_baris: 2,
    from_level: 1,
    to_cluster: "B",
    to_lorong: 22,
    to_baris: 7,
    to_level: 1,
    reason: "Koreksi cluster",
    moved_by: "usr-003",
    moved_at: getTodayISOWithTime(11, 45),
    created_at: getTodayISOWithTime(11, 45),
  },
  // --- DATA LAMA ---
  {
    id: "pmt-003",
    warehouse_id: "wh-001-cikarang",
    transaction_code: "PMT-20251220-0001",
    stock_id: "stk-003",
    product_id: "prod-ckr-001", // 600ML AQUA LOCAL 1X24
    qty_carton: 40,
    from_cluster: "C",
    from_lorong: 11,
    from_baris: 1,
    from_level: 2,
    to_cluster: "A",
    to_lorong: 8,
    to_baris: 6,
    to_level: 1,
    reason: "Relokasi dari In Transit",
    moved_by: "usr-003",
    moved_at: "2025-12-20T09:00:00",
    created_at: "2025-12-20T09:00:00",
  },
  {
    id: "pmt-004",
    warehouse_id: "wh-001-cikarang",
    transaction_code: "PMT-20251219-0001",
    stock_id: "stk-004",
    product_id: "prod-ckr-003", // 500ML MIZONE ACTIV LYCHEE LEMON 1X12
    qty_carton: 12,
    from_cluster: "B",
    from_lorong: 10,
    from_baris: 3,
    from_level: 1,
    to_cluster: "C",
    to_lorong: 2,
    to_baris: 4,
    to_level: 2,
    reason: "Koreksi cluster",
    moved_by: "usr-004", // Budi Santoso (admin_warehouse)
    moved_at: "2025-12-19T14:30:00",
    created_at: "2025-12-19T14:30:00",
  },
  {
    id: "pmt-005",
    warehouse_id: "wh-001-cikarang",
    transaction_code: "PMT-20251218-0001",
    stock_id: "stk-005",
    product_id: "prod-ckr-007", // 330ML AQUA LOCAL 1X24
    qty_carton: 56,
    from_cluster: "C",
    from_lorong: 13,
    from_baris: 2,
    from_level: 1,
    to_cluster: "B",
    to_lorong: 9,
    to_baris: 5,
    to_level: 3,
    reason: "Relokasi dari In Transit",
    moved_by: "usr-003",
    moved_at: "2025-12-18T16:15:00",
    created_at: "2025-12-18T16:15:00",
  },
];
