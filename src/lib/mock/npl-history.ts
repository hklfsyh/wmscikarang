// NPL History Mock Data
// File: src/lib/mock/npl-history.ts

export interface NplHistory {
  id: string; // UUID
  warehouse_id: string; // UUID
  transaction_code: string; // NPL-YYYYMMDD-XXXX
  product_id: string; // UUID
  bb_produk: string; // 10 digit: YYMMDDXXXX
  qty_carton: number;
  expired_date: string; // YYYY-MM-DD
  locations: Array<{
    cluster: string;
    lorong: number;
    baris: number;
    level: number;
    qty_carton: number;
    is_receh: boolean;
  }>;
  driver_name: string;
  vehicle_number: string;
  returned_by: string; // UUID
  return_time: string; // ISO timestamp
  notes?: string;
  created_at: string; // ISO timestamp
}

// Helper: Get today's date string
const getTodayISOWithTime = (hour: number, minute: number) => {
  const today = new Date();
  today.setHours(hour, minute, 0, 0);
  return today.toISOString();
};

// Mock NPL History Data
export const nplHistoryData: NplHistory[] = [
  // --- DATA HARI INI (untuk testing fitur Edit & Batal) ---
  {
    id: "npl-001",
    warehouse_id: "wh-001-cikarang",
    transaction_code: "NPL-20251225-0001",
    product_id: "prod-ckr-001", // 600ML AQUA LOCAL 1X24
    bb_produk: "2512300001",
    qty_carton: 5,
    expired_date: "2025-12-30",
    locations: [
      {
        cluster: "A",
        lorong: 9,
        baris: 1,
        level: 1,
        qty_carton: 5,
        is_receh: false,
      },
    ],
    driver_name: "Driver Return 1",
    vehicle_number: "B 1111 NPL",
    returned_by: "usr-003", // Dewi Lestari (admin_warehouse)
    return_time: getTodayISOWithTime(14, 30),
    notes: "Return stock dari lapangan",
    created_at: getTodayISOWithTime(14, 30),
  },
  {
    id: "npl-002",
    warehouse_id: "wh-001-cikarang",
    transaction_code: "NPL-20251225-0002",
    product_id: "prod-ckr-002", // 1500ML AQUA LOCAL 1X12
    bb_produk: "2512250002",
    qty_carton: 70,
    expired_date: "2025-12-25",
    locations: [
      {
        cluster: "B",
        lorong: 7,
        baris: 5,
        level: 1,
        qty_carton: 70,
        is_receh: false,
      },
    ],
    driver_name: "Driver Return 2",
    vehicle_number: "B 2222 NPL",
    returned_by: "usr-003",
    return_time: getTodayISOWithTime(15, 45),
    notes: "Return stock tidak terjual",
    created_at: getTodayISOWithTime(15, 45),
  },
  // --- DATA LAMA ---
  {
    id: "npl-003",
    warehouse_id: "wh-001-cikarang",
    transaction_code: "NPL-20251220-0001",
    product_id: "prod-ckr-003", // 500ML MIZONE ACTIV LYCHEE 1X12
    bb_produk: "2512300003",
    qty_carton: 10,
    expired_date: "2025-12-30",
    locations: [
      {
        cluster: "A",
        lorong: 3,
        baris: 2,
        level: 1,
        qty_carton: 10,
        is_receh: false,
      },
    ],
    driver_name: "Andi Wijaya",
    vehicle_number: "B 3333 NPL",
    returned_by: "usr-003",
    return_time: "2025-12-20T16:00:00",
    notes: "Return stock expired",
    created_at: "2025-12-20T16:00:00",
  },
  {
    id: "npl-004",
    warehouse_id: "wh-001-cikarang",
    transaction_code: "NPL-20251219-0001",
    product_id: "prod-ckr-004", // 19L AQUA GALON
    bb_produk: "2512300004",
    qty_carton: 8,
    expired_date: "2025-12-30",
    locations: [
      {
        cluster: "C",
        lorong: 4,
        baris: 3,
        level: 2,
        qty_carton: 8,
        is_receh: false,
      },
    ],
    driver_name: "Budi Hartono",
    vehicle_number: "B 4444 NPL",
    returned_by: "usr-004", // Budi Santoso (admin_warehouse)
    return_time: "2025-12-19T17:30:00",
    notes: "Return stock overstock",
    created_at: "2025-12-19T17:30:00",
  },
  {
    id: "npl-005",
    warehouse_id: "wh-001-cikarang",
    transaction_code: "NPL-20251218-0001",
    product_id: "prod-ckr-005", // BATU KERIKIL
    bb_produk: "2512300005",
    qty_carton: 12,
    expired_date: "2025-12-30",
    locations: [
      {
        cluster: "B",
        lorong: 22,
        baris: 6,
        level: 1,
        qty_carton: 12,
        is_receh: false,
      },
    ],
    driver_name: "Candra Kusuma",
    vehicle_number: "B 5555 NPL",
    returned_by: "usr-003",
    return_time: "2025-12-18T14:15:00",
    notes: "Return stock damaged packaging",
    created_at: "2025-12-18T14:15:00",
  },
];
