// Transaction History Mock Data
// File: src/lib/mock/transaction-history.ts

export interface InboundHistory {
  id: string;
  tanggal: string;
  ekspedisi: string;
  namaPengemudi: string;
  noDN: string;
  nomorPolisi: string;
  productCode: string;
  productName: string;
  qtyPallet: number;
  qtyCarton: number;
  totalPcs: number;
  bbProduk: string;
  expiredDate: string;
  location: string;
  status: "completed" | "partial";
  createdAt: string;
}

export interface OutboundHistory {
  id: string;
  tanggal: string;
  namaPengemudi: string;
  nomorPolisi: string;
  productCode: string;
  productName: string;
  qtyPallet: number;
  qtyCarton: number;
  totalPcs: number;
  locations: string[]; // Multiple locations for FEFO
  status: "completed" | "partial";
  createdAt: string;
}

// Mock Inbound History Data
export const inboundHistoryData: InboundHistory[] = [
  {
    id: "INB-2025-001",
    tanggal: "2025-12-16",
    ekspedisi: "HGS",
    namaPengemudi: "Budi Santoso",
    noDN: "DN2025001",
    nomorPolisi: "B 1234 CD",
    productCode: "166126",
    productName: "220ML AQUA CUBE MINI BOTTLE LOCAL 1X24",
    qtyPallet: 5,
    qtyCarton: 540,
    totalPcs: 12960,
    bbProduk: "2603150067",
    expiredDate: "2026-03-15",
    location: "A-L1-B1-P1, A-L1-B2-P1, A-L1-B3-P1, A-L1-B4-P1, A-L1-B5-P1",
    status: "completed",
    createdAt: "2025-12-16T08:30:00",
  },
  {
    id: "INB-2025-002",
    tanggal: "2025-12-16",
    ekspedisi: "SJP",
    namaPengemudi: "Ahmad Rizki",
    noDN: "DN2025002",
    nomorPolisi: "B 5678 EF",
    productCode: "74553",
    productName: "1500ML AQUA LOCAL 1X12",
    qtyPallet: 10,
    qtyCarton: 700,
    totalPcs: 8400,
    bbProduk: "2604200067",
    expiredDate: "2026-04-20",
    location: "B-L1-B1-P1, B-L1-B2-P1, B-L2-B1-P1, B-L2-B2-P1, B-L3-B1-P1",
    status: "completed",
    createdAt: "2025-12-16T09:15:00",
  },
  {
    id: "INB-2025-003",
    tanggal: "2025-12-15",
    ekspedisi: "SMR",
    namaPengemudi: "Dedi Kurniawan",
    noDN: "DN2025003",
    nomorPolisi: "B 9012 GH",
    productCode: "74561",
    productName: "600ML AQUA LOCAL 1X24",
    qtyPallet: 8,
    qtyCarton: 320,
    totalPcs: 7680,
    bbProduk: "2605050067",
    expiredDate: "2026-05-05",
    location: "A-L6-B1-P1, A-L6-B2-P1, A-L7-B1-P1, A-L7-B2-P1",
    status: "completed",
    createdAt: "2025-12-15T10:20:00",
  },
  {
    id: "INB-2025-004",
    tanggal: "2025-12-15",
    ekspedisi: "HGS",
    namaPengemudi: "Eko Prasetyo",
    noDN: "DN2025004",
    nomorPolisi: "B 3456 IJ",
    productCode: "157095",
    productName: "550ML VIT LOCAL 1X24",
    qtyPallet: 6,
    qtyCarton: 144,
    totalPcs: 3456,
    bbProduk: "2606100067",
    expiredDate: "2026-06-10",
    location: "B-L22-B1-P1, B-L22-B2-P1, B-L22-B3-P1",
    status: "completed",
    createdAt: "2025-12-15T11:45:00",
  },
  {
    id: "INB-2025-005",
    tanggal: "2025-12-14",
    ekspedisi: "MDI",
    namaPengemudi: "Fajar Hidayat",
    noDN: "DN2025005",
    nomorPolisi: "B 7890 KL",
    productCode: "145141",
    productName: "500ML MIZONE ACTIV LYCHEE LEMON 1X12",
    qtyPallet: 12,
    qtyCarton: 144,
    totalPcs: 1728,
    bbProduk: "2607150067",
    expiredDate: "2026-07-15",
    location: "C-L1-B1-P1, C-L1-B2-P1, C-L2-B1-P1, C-L2-B2-P1, C-L3-B1-P1",
    status: "completed",
    createdAt: "2025-12-14T13:00:00",
  },
  {
    id: "INB-2025-006",
    tanggal: "2025-12-14",
    ekspedisi: "MIR",
    namaPengemudi: "Gunawan Wijaya",
    noDN: "DN2025006",
    nomorPolisi: "B 1357 MN",
    productCode: "74559",
    productName: "5 GALLON AQUA LOCAL",
    qtyPallet: 4,
    qtyCarton: 192,
    totalPcs: 192,
    bbProduk: "2608050067",
    expiredDate: "2026-08-05",
    location: "D-L1-B1-P1, D-L1-B2-P1, D-L1-B3-P1, D-L1-B4-P1",
    status: "completed",
    createdAt: "2025-12-14T14:30:00",
  },
  {
    id: "INB-2025-007",
    tanggal: "2025-12-13",
    ekspedisi: "HGS",
    namaPengemudi: "Hendra Saputra",
    noDN: "DN2025007",
    nomorPolisi: "B 2468 OP",
    productCode: "74560",
    productName: "5 GALLON VIT LOCAL",
    qtyPallet: 3,
    qtyCarton: 144,
    totalPcs: 144,
    bbProduk: "2609100067",
    expiredDate: "2026-09-10",
    location: "E-L1-B1-P1, E-L1-B2-P1, E-L1-B3-P1",
    status: "completed",
    createdAt: "2025-12-13T08:00:00",
  },
  {
    id: "INB-2025-008",
    tanggal: "2025-12-13",
    ekspedisi: "SJP",
    namaPengemudi: "Indra Gunawan",
    noDN: "DN2025008",
    nomorPolisi: "B 9753 QR",
    productCode: "204579",
    productName: "200ML AQUA LOCAL 1X48",
    qtyPallet: 7,
    qtyCarton: 336,
    totalPcs: 16128,
    bbProduk: "2610250067",
    expiredDate: "2026-10-25",
    location: "A-L4-B1-P1, A-L4-B2-P1, A-L5-B1-P1, A-L5-B2-P1",
    status: "completed",
    createdAt: "2025-12-13T09:30:00",
  },
];

// Mock Outbound History Data
export const outboundHistoryData: OutboundHistory[] = [
  {
    id: "OUT-2025-001",
    tanggal: "2025-12-16",
    namaPengemudi: "Joko Widodo",
    nomorPolisi: "B 1111 AA",
    productCode: "166126",
    productName: "220ML AQUA CUBE MINI BOTTLE LOCAL 1X24",
    qtyPallet: 3,
    qtyCarton: 324,
    totalPcs: 7776,
    locations: ["A-L1-B1-P1", "A-L1-B2-P1", "A-L1-B3-P1"],
    status: "completed",
    createdAt: "2025-12-16T10:00:00",
  },
  {
    id: "OUT-2025-002",
    tanggal: "2025-12-16",
    namaPengemudi: "Karno Sugiarto",
    nomorPolisi: "B 2222 BB",
    productCode: "74553",
    productName: "1500ML AQUA LOCAL 1X12",
    qtyPallet: 5,
    qtyCarton: 350,
    totalPcs: 4200,
    locations: ["B-L1-B1-P1", "B-L1-B2-P1", "B-L2-B1-P1", "B-L2-B2-P1", "B-L3-B1-P1"],
    status: "completed",
    createdAt: "2025-12-16T11:30:00",
  },
  {
    id: "OUT-2025-003",
    tanggal: "2025-12-15",
    namaPengemudi: "Lukman Hakim",
    nomorPolisi: "B 3333 CC",
    productCode: "74561",
    productName: "600ML AQUA LOCAL 1X24",
    qtyPallet: 4,
    qtyCarton: 160,
    totalPcs: 3840,
    locations: ["A-L6-B1-P1", "A-L6-B2-P1", "A-L7-B1-P1", "A-L7-B2-P1"],
    status: "completed",
    createdAt: "2025-12-15T12:00:00",
  },
  {
    id: "OUT-2025-004",
    tanggal: "2025-12-15",
    namaPengemudi: "Made Wirawan",
    nomorPolisi: "B 4444 DD",
    productCode: "157095",
    productName: "550ML VIT LOCAL 1X24",
    qtyPallet: 3,
    qtyCarton: 72,
    totalPcs: 1728,
    locations: ["B-L22-B1-P1", "B-L22-B2-P1", "B-L22-B3-P1"],
    status: "completed",
    createdAt: "2025-12-15T13:45:00",
  },
  {
    id: "OUT-2025-005",
    tanggal: "2025-12-14",
    namaPengemudi: "Nanda Pratama",
    nomorPolisi: "B 5555 EE",
    productCode: "145141",
    productName: "500ML MIZONE ACTIV LYCHEE LEMON 1X12",
    qtyPallet: 6,
    qtyCarton: 72,
    totalPcs: 864,
    locations: ["C-L1-B1-P1", "C-L1-B2-P1", "C-L2-B1-P1", "C-L2-B2-P1"],
    status: "completed",
    createdAt: "2025-12-14T14:15:00",
  },
  {
    id: "OUT-2025-006",
    tanggal: "2025-12-14",
    namaPengemudi: "Omar Abdullah",
    nomorPolisi: "B 6666 FF",
    productCode: "74559",
    productName: "5 GALLON AQUA LOCAL",
    qtyPallet: 2,
    qtyCarton: 96,
    totalPcs: 96,
    locations: ["D-L1-B1-P1", "D-L1-B2-P1"],
    status: "completed",
    createdAt: "2025-12-14T15:30:00",
  },
  {
    id: "OUT-2025-007",
    tanggal: "2025-12-13",
    namaPengemudi: "Pandu Setiawan",
    nomorPolisi: "B 7777 GG",
    productCode: "74560",
    productName: "5 GALLON VIT LOCAL",
    qtyPallet: 2,
    qtyCarton: 96,
    totalPcs: 96,
    locations: ["E-L1-B1-P1", "E-L1-B2-P1"],
    status: "completed",
    createdAt: "2025-12-13T09:00:00",
  },
  {
    id: "OUT-2025-008",
    tanggal: "2025-12-13",
    namaPengemudi: "Qomar Zaman",
    nomorPolisi: "B 8888 HH",
    productCode: "204579",
    productName: "200ML AQUA LOCAL 1X48",
    qtyPallet: 4,
    qtyCarton: 192,
    totalPcs: 9216,
    locations: ["A-L4-B1-P1", "A-L4-B2-P1", "A-L5-B1-P1", "A-L5-B2-P1"],
    status: "completed",
    createdAt: "2025-12-13T10:30:00",
  },
];
