// Transaction History Mock Data
// File: src/lib/mock/transaction-history.ts
// UPDATED: Aligned with database schema (inbound_history & outbound_history tables)

import { productMasterData } from "./product-master";

// ========== INBOUND HISTORY TABLE MOCK ==========
// Tabel: inbound_history - PER WAREHOUSE, 1 produk = 1 record
export interface InboundHistory {
  id: string; // UUID
  warehouseId: string; // UUID - reference to warehouses.id
  transactionCode: string; // varchar(50) - Format: INB-YYYYMMDD-XXXX
  
  // Produk - hanya 1 per record
  productId: string; // UUID - reference to products.id
  bbProduk: string; // varchar(10) - Format: YYMMDDXXXX
  qtyCarton: number; // integer
  expiredDate: string; // date (ISO format)
  
  // Lokasi penempatan (JSON array untuk multi-location)
  locations: Array<{
    cluster: string; // char(1)
    lorong: number; // integer
    baris: number; // integer
    level: number; // integer
    qtyCarton: number; // integer
    isReceh: boolean; // boolean
  }>;
  
  // Info pengiriman
  expeditionId: string | null; // UUID - reference to expeditions.id
  driverName: string; // varchar(100)
  vehicleNumber: string; // varchar(20)
  dnNumber: string; // varchar(50)
  
  // Metadata
  receivedBy: string; // UUID - reference to users.id
  arrivalTime: string; // timestamp (ISO format)
  notes: string; // text
  createdAt: string; // timestamp (ISO format)
}

// ========== OUTBOUND HISTORY TABLE MOCK ==========
// Tabel: outbound_history - PER WAREHOUSE, 1 produk = 1 record
export interface OutboundHistory {
  id: string; // UUID
  warehouseId: string; // UUID - reference to warehouses.id
  transactionCode: string; // varchar(50) - Format: OUT-YYYYMMDD-XXXX
  
  // Produk - hanya 1 per record
  productId: string; // UUID - reference to products.id
  bbProduk: string; // varchar(10) - DEPRECATED: Use locations[].bbProduk
  qtyCarton: number; // integer
  
  // Lokasi pengambilan (JSON array - FEFO dengan BB Produk per lokasi)
  // PENTING: Setiap lokasi FEFO memiliki BB Produk berbeda karena expired date berbeda
  locations: Array<{
    cluster: string; // char(1)
    lorong: number; // integer
    baris: number; // integer
    level: number; // integer
    qtyCarton: number; // integer
    stockId: string; // UUID - reference to stock_list.id
    bbProduk: string; // varchar(10) - BB Produk per lokasi
    expiredDate: string; // date (ISO format)
  }>;
  
  // Info pengiriman
  expeditionId: string | null; // UUID - reference to expeditions.id
  driverName: string; // varchar(100)
  vehicleNumber: string; // varchar(20)
  
  // Metadata
  processedBy: string; // UUID - reference to users.id
  departureTime: string; // timestamp (ISO format)
  notes: string; // text
  createdAt: string; // timestamp (ISO format)
}


// ========== HELPER FUNCTIONS ==========
// Helper: Get today's date string
const getTodayString = () => new Date().toISOString().slice(0, 10);

const getTodayISOWithTime = (hour: number, minute: number) => {
  const today = new Date();
  today.setHours(hour, minute, 0, 0);
  return today.toISOString();
};

// Helper: Generate transaction code
const generateTransactionCode = (prefix: string, date: string, sequence: number): string => {
  const dateStr = date.replace(/-/g, ''); // YYYYMMDD
  const seqStr = String(sequence).padStart(4, '0'); // XXXX
  return `${prefix}-${dateStr}-${seqStr}`;
};

// Helper: Extract expired date from BB Produk (first 6 digits = YYMMDD)
const extractExpiredDate = (bbProduk: string): string => {
  const yy = bbProduk.substring(0, 2);
  const mm = bbProduk.substring(2, 4);
  const dd = bbProduk.substring(4, 6);
  return `20${yy}-${mm}-${dd}`;
};

// ========== MOCK INBOUND HISTORY DATA ==========
export const inboundHistoryData: InboundHistory[] = [
  // --- DATA HARI INI (untuk testing fitur Edit & Batal) ---
  {
    id: "inb-today-001",
    warehouseId: "wh-001-cikarang",
    transactionCode: generateTransactionCode("INB", getTodayString(), 1),
    productId: productMasterData.find(p => p.productCode === "166126")?.id || "prod-001",
    bbProduk: "2606150067",
    qtyCarton: 216,
    expiredDate: "2026-06-15",
    locations: [
      { cluster: "A", lorong: 1, baris: 1, level: 1, qtyCarton: 108, isReceh: false },
      { cluster: "A", lorong: 1, baris: 2, level: 1, qtyCarton: 108, isReceh: false },
    ],
    expeditionId: "exp-ckr-001", // HGS
    driverName: "Test Driver 1",
    vehicleNumber: "B 1234 TEST",
    dnNumber: "DN-TEST-001",
    receivedBy: "usr-003", // Dewi Lestari (admin_warehouse)
    arrivalTime: getTodayISOWithTime(8, 30),
    notes: "Transaksi hari ini untuk testing Edit & Batal",
    createdAt: getTodayISOWithTime(8, 30),
  },
  {
    id: "inb-today-002",
    warehouseId: "wh-001-cikarang",
    transactionCode: generateTransactionCode("INB", getTodayString(), 2),
    productId: productMasterData.find(p => p.productCode === "74553")?.id || "prod-002",
    bbProduk: "2607200067",
    qtyCarton: 210,
    expiredDate: "2026-07-20",
    locations: [
      { cluster: "B", lorong: 1, baris: 1, level: 1, qtyCarton: 70, isReceh: false },
      { cluster: "B", lorong: 1, baris: 2, level: 1, qtyCarton: 70, isReceh: false },
      { cluster: "B", lorong: 1, baris: 3, level: 1, qtyCarton: 70, isReceh: false },
    ],
    expeditionId: "exp-ckr-002", // SJP
    driverName: "Test Driver 2",
    vehicleNumber: "B 5678 TEST",
    dnNumber: "DN-TEST-002",
    receivedBy: "usr-004", // Budi Santoso (admin_warehouse)
    arrivalTime: getTodayISOWithTime(9, 15),
    notes: "Transaksi hari ini - normal inbound",
    createdAt: getTodayISOWithTime(9, 15),
  },

  // --- DATA LAMA (History) ---
  {
    id: "inb-2025-001",
    warehouseId: "wh-001-cikarang",
    transactionCode: "INB-20251216-0001",
    productId: productMasterData.find(p => p.productCode === "166126")?.id || "prod-001",
    bbProduk: "2603150067",
    qtyCarton: 540,
    expiredDate: "2026-03-15",
    locations: [
      { cluster: "A", lorong: 1, baris: 1, level: 1, qtyCarton: 108, isReceh: false },
      { cluster: "A", lorong: 1, baris: 2, level: 1, qtyCarton: 108, isReceh: false },
      { cluster: "A", lorong: 1, baris: 3, level: 1, qtyCarton: 108, isReceh: false },
      { cluster: "A", lorong: 1, baris: 4, level: 1, qtyCarton: 108, isReceh: false },
      { cluster: "A", lorong: 1, baris: 5, level: 1, qtyCarton: 108, isReceh: false },
    ],
    expeditionId: "exp-ckr-001", // HGS
    driverName: "Budi Santoso",
    vehicleNumber: "B 1234 CD",
    dnNumber: "DN2025001",
    receivedBy: "usr-003",
    arrivalTime: "2025-12-16T08:30:00.000Z",
    notes: "Pengiriman rutin dari supplier",
    createdAt: "2025-12-16T08:30:00.000Z",
  },
  {
    id: "inb-2025-002",
    warehouseId: "wh-001-cikarang",
    transactionCode: "INB-20251216-0002",
    productId: productMasterData.find(p => p.productCode === "74553")?.id || "prod-002",
    bbProduk: "2604200067",
    qtyCarton: 700,
    expiredDate: "2026-04-20",
    locations: [
      { cluster: "B", lorong: 1, baris: 1, level: 1, qtyCarton: 140, isReceh: false },
      { cluster: "B", lorong: 1, baris: 2, level: 1, qtyCarton: 140, isReceh: false },
      { cluster: "B", lorong: 2, baris: 1, level: 1, qtyCarton: 140, isReceh: false },
      { cluster: "B", lorong: 2, baris: 2, level: 1, qtyCarton: 140, isReceh: false },
      { cluster: "B", lorong: 3, baris: 1, level: 1, qtyCarton: 140, isReceh: false },
    ],
    expeditionId: "exp-ckr-002", // SJP
    driverName: "Ahmad Rizki",
    vehicleNumber: "B 5678 EF",
    dnNumber: "DN2025002",
    receivedBy: "usr-004",
    arrivalTime: "2025-12-16T09:15:00.000Z",
    notes: "Stock reguler 1500ML",
    createdAt: "2025-12-16T09:15:00.000Z",
  },
  {
    id: "inb-2025-003",
    warehouseId: "wh-001-cikarang",
    transactionCode: "INB-20251215-0001",
    productId: productMasterData.find(p => p.productCode === "74561")?.id || "prod-003",
    bbProduk: "2605050067",
    qtyCarton: 320,
    expiredDate: "2026-05-05",
    locations: [
      { cluster: "A", lorong: 6, baris: 1, level: 1, qtyCarton: 80, isReceh: false },
      { cluster: "A", lorong: 6, baris: 2, level: 1, qtyCarton: 80, isReceh: false },
      { cluster: "A", lorong: 7, baris: 1, level: 1, qtyCarton: 80, isReceh: false },
      { cluster: "A", lorong: 7, baris: 2, level: 1, qtyCarton: 80, isReceh: false },
    ],
    expeditionId: "exp-ckr-003", // SMR
    driverName: "Dedi Kurniawan",
    vehicleNumber: "B 9012 GH",
    dnNumber: "DN2025003",
    receivedBy: "usr-003",
    arrivalTime: "2025-12-15T10:20:00.000Z",
    notes: "600ML AQUA untuk cluster A lorong 6-7",
    createdAt: "2025-12-15T10:20:00.000Z",
  },
  {
    id: "inb-2025-004",
    warehouseId: "wh-001-cikarang",
    transactionCode: "INB-20251215-0002",
    productId: productMasterData.find(p => p.productCode === "157095")?.id || "prod-vit-550",
    bbProduk: "2606100067",
    qtyCarton: 144,
    expiredDate: "2026-06-10",
    locations: [
      { cluster: "B", lorong: 22, baris: 1, level: 1, qtyCarton: 48, isReceh: false },
      { cluster: "B", lorong: 22, baris: 2, level: 1, qtyCarton: 48, isReceh: false },
      { cluster: "B", lorong: 22, baris: 3, level: 1, qtyCarton: 48, isReceh: false },
    ],
    expeditionId: "exp-ckr-001", // HGS
    driverName: "Eko Prasetyo",
    vehicleNumber: "B 3456 IJ",
    dnNumber: "DN2025004",
    receivedBy: "usr-004",
    arrivalTime: "2025-12-15T11:45:00.000Z",
    notes: "VIT 550ML untuk B-L22",
    createdAt: "2025-12-15T11:45:00.000Z",
  },
  {
    id: "inb-2025-005",
    warehouseId: "wh-001-cikarang",
    transactionCode: "INB-20251214-0001",
    productId: productMasterData.find(p => p.productCode === "145141")?.id || "prod-mizone",
    bbProduk: "2607150067",
    qtyCarton: 144,
    expiredDate: "2026-07-15",
    locations: [
      { cluster: "C", lorong: 1, baris: 1, level: 1, qtyCarton: 36, isReceh: false },
      { cluster: "C", lorong: 1, baris: 2, level: 1, qtyCarton: 36, isReceh: false },
      { cluster: "C", lorong: 2, baris: 1, level: 1, qtyCarton: 36, isReceh: false },
      { cluster: "C", lorong: 2, baris: 2, level: 1, qtyCarton: 36, isReceh: false },
    ],
    expeditionId: "exp-ckr-005", // MDI
    driverName: "Fajar Hidayat",
    vehicleNumber: "B 7890 KL",
    dnNumber: "DN2025005",
    receivedBy: "usr-003",
    arrivalTime: "2025-12-14T13:00:00.000Z",
    notes: "MIZONE ACTIV untuk cluster C",
    createdAt: "2025-12-14T13:00:00.000Z",
  },
  {
    id: "inb-2025-006",
    warehouseId: "wh-001-cikarang",
    transactionCode: "INB-20251214-0002",
    productId: productMasterData.find(p => p.productCode === "74559")?.id || "prod-galon-aqua",
    bbProduk: "2608050067",
    qtyCarton: 192,
    expiredDate: "2026-08-05",
    locations: [
      { cluster: "D", lorong: 1, baris: 1, level: 1, qtyCarton: 48, isReceh: false },
      { cluster: "D", lorong: 1, baris: 2, level: 1, qtyCarton: 48, isReceh: false },
      { cluster: "D", lorong: 1, baris: 3, level: 1, qtyCarton: 48, isReceh: false },
      { cluster: "D", lorong: 1, baris: 4, level: 1, qtyCarton: 48, isReceh: false },
    ],
    expeditionId: "exp-ckr-006", // MIR
    driverName: "Gunawan Wijaya",
    vehicleNumber: "B 1357 MN",
    dnNumber: "DN2025006",
    receivedBy: "usr-004",
    arrivalTime: "2025-12-14T14:30:00.000Z",
    notes: "Galon AQUA 5L",
    createdAt: "2025-12-14T14:30:00.000Z",
  },
  {
    id: "inb-2025-007",
    warehouseId: "wh-001-cikarang",
    transactionCode: "INB-20251213-0001",
    productId: productMasterData.find(p => p.productCode === "74560")?.id || "prod-galon-vit",
    bbProduk: "2609100067",
    qtyCarton: 144,
    expiredDate: "2026-09-10",
    locations: [
      { cluster: "E", lorong: 1, baris: 1, level: 1, qtyCarton: 48, isReceh: false },
      { cluster: "E", lorong: 1, baris: 2, level: 1, qtyCarton: 48, isReceh: false },
      { cluster: "E", lorong: 1, baris: 3, level: 1, qtyCarton: 48, isReceh: false },
    ],
    expeditionId: "exp-ckr-001", // HGS
    driverName: "Hendra Saputra",
    vehicleNumber: "B 2468 OP",
    dnNumber: "DN2025007",
    receivedBy: "usr-003",
    arrivalTime: "2025-12-13T08:00:00.000Z",
    notes: "Galon VIT 5L",
    createdAt: "2025-12-13T08:00:00.000Z",
  },
  {
    id: "inb-2025-008",
    warehouseId: "wh-001-cikarang",
    transactionCode: "INB-20251213-0002",
    productId: productMasterData.find(p => p.productCode === "204579")?.id || "prod-200ml",
    bbProduk: "2610250067",
    qtyCarton: 336,
    expiredDate: "2026-10-25",
    locations: [
      { cluster: "A", lorong: 4, baris: 1, level: 1, qtyCarton: 84, isReceh: false },
      { cluster: "A", lorong: 4, baris: 2, level: 1, qtyCarton: 84, isReceh: false },
      { cluster: "A", lorong: 5, baris: 1, level: 1, qtyCarton: 84, isReceh: false },
      { cluster: "A", lorong: 5, baris: 2, level: 1, qtyCarton: 84, isReceh: false },
    ],
    expeditionId: "exp-ckr-002", // SJP
    driverName: "Indra Gunawan",
    vehicleNumber: "B 9753 QR",
    dnNumber: "DN2025008",
    receivedBy: "usr-004",
    arrivalTime: "2025-12-13T09:30:00.000Z",
    notes: "200ML AQUA untuk A-L4 dan A-L5",
    createdAt: "2025-12-13T09:30:00.000Z",
  },
];


// ========== MOCK OUTBOUND HISTORY DATA ==========
export const outboundHistoryData: OutboundHistory[] = [
  // --- DATA HARI INI (untuk testing fitur Edit & Batal) ---
  {
    id: "out-today-001",
    warehouseId: "wh-001-cikarang",
    transactionCode: generateTransactionCode("OUT", getTodayString(), 1),
    productId: productMasterData.find(p => p.productCode === "166126")?.id || "prod-001",
    bbProduk: "2606150067", // DEPRECATED - use locations[].bbProduk
    qtyCarton: 216,
    locations: [
      {
        cluster: "A",
        lorong: 1,
        baris: 3,
        level: 1,
        qtyCarton: 108,
        stockId: "stock-a1b3l1",
        bbProduk: "2606150067",
        expiredDate: "2026-06-15",
      },
      {
        cluster: "A",
        lorong: 1,
        baris: 4,
        level: 1,
        qtyCarton: 108,
        stockId: "stock-a1b4l1",
        bbProduk: "2606200067",
        expiredDate: "2026-06-20",
      },
    ],
    expeditionId: "exp-ckr-001", // HGS
    driverName: "Test Outbound Driver 1",
    vehicleNumber: "B 9999 OUT",
    processedBy: "usr-003", // Dewi Lestari
    departureTime: getTodayISOWithTime(10, 0),
    notes: "Pengiriman hari ini - FEFO",
    createdAt: getTodayISOWithTime(10, 0),
  },
  {
    id: "out-today-002",
    warehouseId: "wh-001-cikarang",
    transactionCode: generateTransactionCode("OUT", getTodayString(), 2),
    productId: productMasterData.find(p => p.productCode === "74553")?.id || "prod-002",
    bbProduk: "2607200067",
    qtyCarton: 70,
    locations: [
      {
        cluster: "B",
        lorong: 1,
        baris: 4,
        level: 1,
        qtyCarton: 70,
        stockId: "stock-b1b4l1",
        bbProduk: "2607200067",
        expiredDate: "2026-07-20",
      },
    ],
    expeditionId: "exp-ckr-002", // SJP
    driverName: "Test Outbound Driver 2",
    vehicleNumber: "B 8888 OUT",
    processedBy: "usr-004", // Budi Santoso
    departureTime: getTodayISOWithTime(11, 30),
    notes: "Outbound normal hari ini",
    createdAt: getTodayISOWithTime(11, 30),
  },

  // --- DATA LAMA (History) ---
  {
    id: "out-2025-001",
    warehouseId: "wh-001-cikarang",
    transactionCode: "OUT-20251216-0001",
    productId: productMasterData.find(p => p.productCode === "166126")?.id || "prod-001",
    bbProduk: "2603150067",
    qtyCarton: 324,
    locations: [
      {
        cluster: "A",
        lorong: 1,
        baris: 1,
        level: 1,
        qtyCarton: 108,
        stockId: "stock-hist-001",
        bbProduk: "2603150067",
        expiredDate: "2026-03-15",
      },
      {
        cluster: "A",
        lorong: 1,
        baris: 2,
        level: 1,
        qtyCarton: 108,
        stockId: "stock-hist-002",
        bbProduk: "2603200067",
        expiredDate: "2026-03-20",
      },
      {
        cluster: "A",
        lorong: 1,
        baris: 3,
        level: 1,
        qtyCarton: 108,
        stockId: "stock-hist-003",
        bbProduk: "2603250067",
        expiredDate: "2026-03-25",
      },
    ],
    expeditionId: "exp-ckr-001",
    driverName: "Joko Widodo",
    vehicleNumber: "B 1111 AA",
    processedBy: "usr-003",
    departureTime: "2025-12-16T10:00:00.000Z",
    notes: "Pengiriman ke toko - FEFO 3 batch berbeda",
    createdAt: "2025-12-16T10:00:00.000Z",
  },
  {
    id: "out-2025-002",
    warehouseId: "wh-001-cikarang",
    transactionCode: "OUT-20251216-0002",
    productId: productMasterData.find(p => p.productCode === "74553")?.id || "prod-002",
    bbProduk: "2604200067",
    qtyCarton: 350,
    locations: [
      {
        cluster: "B",
        lorong: 1,
        baris: 1,
        level: 1,
        qtyCarton: 70,
        stockId: "stock-hist-004",
        bbProduk: "2604200067",
        expiredDate: "2026-04-20",
      },
      {
        cluster: "B",
        lorong: 1,
        baris: 2,
        level: 1,
        qtyCarton: 70,
        stockId: "stock-hist-005",
        bbProduk: "2604200067",
        expiredDate: "2026-04-20",
      },
      {
        cluster: "B",
        lorong: 2,
        baris: 1,
        level: 1,
        qtyCarton: 70,
        stockId: "stock-hist-006",
        bbProduk: "2604250067",
        expiredDate: "2026-04-25",
      },
      {
        cluster: "B",
        lorong: 2,
        baris: 2,
        level: 1,
        qtyCarton: 70,
        stockId: "stock-hist-007",
        bbProduk: "2604250067",
        expiredDate: "2026-04-25",
      },
      {
        cluster: "B",
        lorong: 3,
        baris: 1,
        level: 1,
        qtyCarton: 70,
        stockId: "stock-hist-008",
        bbProduk: "2605010067",
        expiredDate: "2026-05-01",
      },
    ],
    expeditionId: "exp-ckr-002",
    driverName: "Karno Sugiarto",
    vehicleNumber: "B 2222 BB",
    processedBy: "usr-004",
    departureTime: "2025-12-16T11:30:00.000Z",
    notes: "FEFO 5 lokasi dengan 3 batch berbeda",
    createdAt: "2025-12-16T11:30:00.000Z",
  },
  {
    id: "out-2025-003",
    warehouseId: "wh-001-cikarang",
    transactionCode: "OUT-20251215-0001",
    productId: productMasterData.find(p => p.productCode === "74561")?.id || "prod-003",
    bbProduk: "2605050067",
    qtyCarton: 160,
    locations: [
      {
        cluster: "A",
        lorong: 6,
        baris: 1,
        level: 1,
        qtyCarton: 40,
        stockId: "stock-hist-009",
        bbProduk: "2605050067",
        expiredDate: "2026-05-05",
      },
      {
        cluster: "A",
        lorong: 6,
        baris: 2,
        level: 1,
        qtyCarton: 40,
        stockId: "stock-hist-010",
        bbProduk: "2605050067",
        expiredDate: "2026-05-05",
      },
      {
        cluster: "A",
        lorong: 7,
        baris: 1,
        level: 1,
        qtyCarton: 40,
        stockId: "stock-hist-011",
        bbProduk: "2605100067",
        expiredDate: "2026-05-10",
      },
      {
        cluster: "A",
        lorong: 7,
        baris: 2,
        level: 1,
        qtyCarton: 40,
        stockId: "stock-hist-012",
        bbProduk: "2605100067",
        expiredDate: "2026-05-10",
      },
    ],
    expeditionId: "exp-ckr-003",
    driverName: "Lukman Hakim",
    vehicleNumber: "B 3333 CC",
    processedBy: "usr-003",
    departureTime: "2025-12-15T12:00:00.000Z",
    notes: "600ML AQUA - FEFO 2 batch",
    createdAt: "2025-12-15T12:00:00.000Z",
  },
  {
    id: "out-2025-004",
    warehouseId: "wh-001-cikarang",
    transactionCode: "OUT-20251215-0002",
    productId: productMasterData.find(p => p.productCode === "157095")?.id || "prod-vit-550",
    bbProduk: "2606100067",
    qtyCarton: 72,
    locations: [
      {
        cluster: "B",
        lorong: 22,
        baris: 1,
        level: 1,
        qtyCarton: 24,
        stockId: "stock-hist-013",
        bbProduk: "2606100067",
        expiredDate: "2026-06-10",
      },
      {
        cluster: "B",
        lorong: 22,
        baris: 2,
        level: 1,
        qtyCarton: 24,
        stockId: "stock-hist-014",
        bbProduk: "2606100067",
        expiredDate: "2026-06-10",
      },
      {
        cluster: "B",
        lorong: 22,
        baris: 3,
        level: 1,
        qtyCarton: 24,
        stockId: "stock-hist-015",
        bbProduk: "2606150067",
        expiredDate: "2026-06-15",
      },
    ],
    expeditionId: "exp-ckr-001",
    driverName: "Made Wirawan",
    vehicleNumber: "B 4444 DD",
    processedBy: "usr-004",
    departureTime: "2025-12-15T13:45:00.000Z",
    notes: "VIT 550ML - FEFO 2 batch",
    createdAt: "2025-12-15T13:45:00.000Z",
  },
  {
    id: "out-2025-005",
    warehouseId: "wh-001-cikarang",
    transactionCode: "OUT-20251214-0001",
    productId: productMasterData.find(p => p.productCode === "145141")?.id || "prod-mizone",
    bbProduk: "2607150067",
    qtyCarton: 72,
    locations: [
      {
        cluster: "C",
        lorong: 1,
        baris: 1,
        level: 1,
        qtyCarton: 18,
        stockId: "stock-hist-016",
        bbProduk: "2607150067",
        expiredDate: "2026-07-15",
      },
      {
        cluster: "C",
        lorong: 1,
        baris: 2,
        level: 1,
        qtyCarton: 18,
        stockId: "stock-hist-017",
        bbProduk: "2607150067",
        expiredDate: "2026-07-15",
      },
      {
        cluster: "C",
        lorong: 2,
        baris: 1,
        level: 1,
        qtyCarton: 18,
        stockId: "stock-hist-018",
        bbProduk: "2607200067",
        expiredDate: "2026-07-20",
      },
      {
        cluster: "C",
        lorong: 2,
        baris: 2,
        level: 1,
        qtyCarton: 18,
        stockId: "stock-hist-019",
        bbProduk: "2607200067",
        expiredDate: "2026-07-20",
      },
    ],
    expeditionId: "exp-ckr-005",
    driverName: "Nanda Pratama",
    vehicleNumber: "B 5555 EE",
    processedBy: "usr-003",
    departureTime: "2025-12-14T14:15:00.000Z",
    notes: "MIZONE - FEFO 2 batch",
    createdAt: "2025-12-14T14:15:00.000Z",
  },
  {
    id: "out-2025-006",
    warehouseId: "wh-001-cikarang",
    transactionCode: "OUT-20251214-0002",
    productId: productMasterData.find(p => p.productCode === "74559")?.id || "prod-galon-aqua",
    bbProduk: "2608050067",
    qtyCarton: 96,
    locations: [
      {
        cluster: "D",
        lorong: 1,
        baris: 1,
        level: 1,
        qtyCarton: 48,
        stockId: "stock-hist-020",
        bbProduk: "2608050067",
        expiredDate: "2026-08-05",
      },
      {
        cluster: "D",
        lorong: 1,
        baris: 2,
        level: 1,
        qtyCarton: 48,
        stockId: "stock-hist-021",
        bbProduk: "2608050067",
        expiredDate: "2026-08-05",
      },
    ],
    expeditionId: "exp-ckr-006",
    driverName: "Omar Abdullah",
    vehicleNumber: "B 6666 FF",
    processedBy: "usr-004",
    departureTime: "2025-12-14T15:30:00.000Z",
    notes: "Galon AQUA 5L",
    createdAt: "2025-12-14T15:30:00.000Z",
  },
  {
    id: "out-2025-007",
    warehouseId: "wh-001-cikarang",
    transactionCode: "OUT-20251213-0001",
    productId: productMasterData.find(p => p.productCode === "74560")?.id || "prod-galon-vit",
    bbProduk: "2609100067",
    qtyCarton: 96,
    locations: [
      {
        cluster: "E",
        lorong: 1,
        baris: 1,
        level: 1,
        qtyCarton: 48,
        stockId: "stock-hist-022",
        bbProduk: "2609100067",
        expiredDate: "2026-09-10",
      },
      {
        cluster: "E",
        lorong: 1,
        baris: 2,
        level: 1,
        qtyCarton: 48,
        stockId: "stock-hist-023",
        bbProduk: "2609100067",
        expiredDate: "2026-09-10",
      },
    ],
    expeditionId: "exp-ckr-001",
    driverName: "Pandu Setiawan",
    vehicleNumber: "B 7777 GG",
    processedBy: "usr-003",
    departureTime: "2025-12-13T09:00:00.000Z",
    notes: "Galon VIT 5L",
    createdAt: "2025-12-13T09:00:00.000Z",
  },
  {
    id: "out-2025-008",
    warehouseId: "wh-001-cikarang",
    transactionCode: "OUT-20251213-0002",
    productId: productMasterData.find(p => p.productCode === "204579")?.id || "prod-200ml",
    bbProduk: "2610250067",
    qtyCarton: 192,
    locations: [
      {
        cluster: "A",
        lorong: 4,
        baris: 1,
        level: 1,
        qtyCarton: 48,
        stockId: "stock-hist-024",
        bbProduk: "2610250067",
        expiredDate: "2026-10-25",
      },
      {
        cluster: "A",
        lorong: 4,
        baris: 2,
        level: 1,
        qtyCarton: 48,
        stockId: "stock-hist-025",
        bbProduk: "2610250067",
        expiredDate: "2026-10-25",
      },
      {
        cluster: "A",
        lorong: 5,
        baris: 1,
        level: 1,
        qtyCarton: 48,
        stockId: "stock-hist-026",
        bbProduk: "2611010067",
        expiredDate: "2026-11-01",
      },
      {
        cluster: "A",
        lorong: 5,
        baris: 2,
        level: 1,
        qtyCarton: 48,
        stockId: "stock-hist-027",
        bbProduk: "2611010067",
        expiredDate: "2026-11-01",
      },
    ],
    expeditionId: "exp-ckr-002",
    driverName: "Qomar Zaman",
    vehicleNumber: "B 8888 HH",
    processedBy: "usr-004",
    departureTime: "2025-12-13T10:30:00.000Z",
    notes: "200ML AQUA - FEFO 2 batch",
    createdAt: "2025-12-13T10:30:00.000Z",
  },
];

