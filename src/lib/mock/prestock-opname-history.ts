// Mock data untuk Pre-Stock Opname sesuai skema database
// File: src/lib/mock/prestock-opname-history.ts

import { productMasterData } from './product-master';

export interface PrestockOpnameItem {
  id: string; // UUID
  opname_id: string; // UUID reference to prestock_opname.id
  product_id: string; // UUID
  bb_produk?: string; // BB Produk 10 digit: YYMMDDXXXX (optional)
  audit_qty: number; // Hasil hitung fisik
  system_qty?: number; // Dari audit sebelumnya, diisi saat rekonsel
  difference?: number; // Selisih = audit - system
  reconciliation_reason?: string; // Alasan rekonsel
  is_reconciled: boolean; // Status rekonsel per item
  created_at: string;
}

export interface PrestockOpname {
  id: string; // UUID
  warehouse_id: string; // UUID
  opname_code: string; // OPN-YYYYMMDD-XXXX
  auditor_id: string; // UUID admin_warehouse
  audit_date: string; // YYYY-MM-DD
  audit_time: string; // HH:MM:SS
  reconciliation_status: 'pending' | 'reconciled';
  reconciled_by?: string; // UUID admin_cabang
  reconciled_at?: string; // ISO timestamp
  reconciliation_notes?: string; // Catatan rekonsel
  created_at: string;
  updated_at: string;
  // Items akan di-query terpisah dari prestock_opname_items
  items?: PrestockOpnameItem[];
}

// Interface untuk history view (gabungan data untuk UI)
export interface PrestockOpnameHistoryItem {
  productCode: string;
  productName: string;
  auditQty: number;
  systemQty?: number;
  difference?: number;
  reconciliationReason?: string;
}

export interface ReconciliationNote {
  productCode: string;
  reason: string;
  reconciledAt: string;
  reconciledBy: string;
}

export interface PrestockOpnameHistory {
  id: string;
  auditorName: string;
  auditDate: string;
  auditTime: string;
  items: PrestockOpnameHistoryItem[];
  reconciliationStatus: 'pending' | 'reconciled';
  reconciliationNotes: ReconciliationNote[];
  reconciledAt?: string;
  reconciledBy?: string;
}

// Mock data untuk Pre-Stock Opname sesuai skema database
export const prestockOpnameData: PrestockOpname[] = [
  // Data hari ini (26 Des 2025) - BELUM DIREKONSEL
  {
    id: "opn-001",
    warehouse_id: "wh-001-cikarang",
    opname_code: "OPN-20251226-0001",
    auditor_id: "usr-003", // Dewi Lestari (admin_warehouse)
    audit_date: "2025-12-26",
    audit_time: "08:45:00",
    reconciliation_status: "pending",
    created_at: "2025-12-26T08:45:00.000Z",
    updated_at: "2025-12-26T08:45:00.000Z",
  },
  // Data kemarin (25 Des 2025) - SUDAH DIREKONSEL
  {
    id: "opn-002",
    warehouse_id: "wh-001-cikarang",
    opname_code: "OPN-20251225-0001",
    auditor_id: "usr-004", // Budi Santoso (admin_warehouse)
    audit_date: "2025-12-25",
    audit_time: "08:30:00",
    reconciliation_status: "reconciled",
    reconciled_by: "usr-002", // Andi Pratama (admin_cabang)
    reconciled_at: "2025-12-25T10:15:00.000Z",
    reconciliation_notes: "Rekonsel selesai. Beberapa selisih dapat dijelaskan dengan transaksi antar shift.",
    created_at: "2025-12-25T08:30:00.000Z",
    updated_at: "2025-12-25T10:15:00.000Z",
  },
];

// Mock data untuk Pre-Stock Opname Items
export const prestockOpnameItemsData: PrestockOpnameItem[] = [
  // Items untuk opn-001 (hari ini - pending)
  {
    id: "opi-001-001",
    opname_id: "opn-001",
    product_id: "prod-ckr-008", // 220ML AQUA CUBE MINI BOTTLE LOCAL 1X24
    audit_qty: 35,
    is_reconciled: false,
    created_at: "2025-12-26T08:45:00.000Z",
  },
  {
    id: "opi-001-002",
    opname_id: "opn-001",
    product_id: "prod-ckr-009", // 200ML AQUA LOCAL 1X48
    audit_qty: 48,
    is_reconciled: false,
    created_at: "2025-12-26T08:45:00.000Z",
  },
  {
    id: "opi-001-003",
    opname_id: "opn-001",
    product_id: "prod-ckr-001", // 600ML AQUA LOCAL 1X24
    audit_qty: 75,
    is_reconciled: false,
    created_at: "2025-12-26T08:45:00.000Z",
  },
  {
    id: "opi-001-004",
    opname_id: "opn-001",
    product_id: "prod-ckr-002", // 1500ML AQUA LOCAL 1X12
    audit_qty: 45,
    is_reconciled: false,
    created_at: "2025-12-26T08:45:00.000Z",
  },
  {
    id: "opi-001-005",
    opname_id: "opn-001",
    product_id: "prod-ckr-007", // 330ML AQUA LOCAL 1X24
    audit_qty: 62,
    is_reconciled: false,
    created_at: "2025-12-26T08:45:00.000Z",
  },

  // Items untuk opn-002 (kemarin - reconciled)
  {
    id: "opi-002-001",
    opname_id: "opn-002",
    product_id: "prod-ckr-008", // 220ML AQUA CUBE MINI BOTTLE LOCAL 1X24
    audit_qty: 20,
    system_qty: 15,
    difference: 5,
    reconciliation_reason: "Produk baru masuk dari supplier pada shift malam",
    is_reconciled: true,
    created_at: "2025-12-25T08:30:00.000Z",
  },
  {
    id: "opi-002-002",
    opname_id: "opn-002",
    product_id: "prod-ckr-009", // 200ML AQUA LOCAL 1X48
    audit_qty: 48,
    system_qty: 48,
    difference: 0,
    is_reconciled: true,
    created_at: "2025-12-25T08:30:00.000Z",
  },
  {
    id: "opi-002-003",
    opname_id: "opn-002",
    product_id: "prod-ckr-001", // 600ML AQUA LOCAL 1X24
    audit_qty: 80,
    system_qty: 85,
    difference: -5,
    reconciliation_reason: "Terjadi pengambilan untuk outbound urgent dari customer priority",
    is_reconciled: true,
    created_at: "2025-12-25T08:30:00.000Z",
  },
  {
    id: "opi-002-004",
    opname_id: "opn-002",
    product_id: "prod-ckr-002", // 1500ML AQUA LOCAL 1X12
    audit_qty: 45,
    system_qty: 45,
    difference: 0,
    is_reconciled: true,
    created_at: "2025-12-25T08:30:00.000Z",
  },
  {
    id: "opi-002-005",
    opname_id: "opn-002",
    product_id: "prod-ckr-007", // 330ML AQUA LOCAL 1X24
    audit_qty: 65,
    system_qty: 68,
    difference: -3,
    reconciliation_reason: "Penyesuaian stock akibat kerusakan packaging saat handling",
    is_reconciled: true,
    created_at: "2025-12-25T08:30:00.000Z",
  },
];

// Helper function untuk mendapatkan data dari localStorage atau fallback ke mock
export const getPrestockOpnameHistory = (): PrestockOpnameHistory[] => {
  return prestockOpnameData.map(opname => {
    const items = prestockOpnameItemsData.filter(item => item.opname_id === opname.id);
    return {
      id: opname.id,
      auditorName: 'Admin Warehouse', // TODO: Get from users data
      auditDate: opname.audit_date,
      auditTime: opname.audit_time,
      items: items.map(item => {
        // Cari produk berdasarkan product_id (UUID)
        const product = productMasterData.find(p => p.id === item.product_id);
        return {
          productCode: product?.productCode || item.product_id, // Fallback ke product_id jika tidak ditemukan
          productName: product?.productName || 'Product Name', // Fallback jika tidak ditemukan
          auditQty: item.audit_qty,
          systemQty: item.system_qty,
          difference: item.difference,
          reconciliationReason: item.reconciliation_reason,
        };
      }),
      reconciliationStatus: opname.reconciliation_status,
      reconciliationNotes: [], // TODO: Build from items reconciliation
      reconciledAt: opname.reconciled_at,
      reconciledBy: opname.reconciled_by,
    };
  });
};

// Helper function untuk save history ke localStorage
export const savePrestockOpnameHistory = (history: PrestockOpnameHistory[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('wms_prestock_opname_history', JSON.stringify(history));
};

// Helper function untuk update reconciliation
export const updateReconciliation = (
  auditId: string,
  reconciliationNotes: ReconciliationNote[],
  reconciledBy: string
) => {
  const history = getPrestockOpnameHistory();
  const updated = history.map((item) => {
    if (item.id === auditId) {
      return {
        ...item,
        reconciliationStatus: 'reconciled' as const,
        reconciliationNotes,
        reconciledAt: new Date().toISOString(),
        reconciledBy,
      };
    }
    return item;
  });
  savePrestockOpnameHistory(updated);
  return updated;
};

// Helper function untuk mendapatkan data opname berdasarkan ID
export const getPrestockOpnameById = (id: string): PrestockOpname | undefined => {
  return prestockOpnameData.find(opname => opname.id === id);
};

// Helper function untuk mendapatkan items opname berdasarkan opname ID
export const getPrestockOpnameItemsByOpnameId = (opnameId: string): PrestockOpnameItem[] => {
  return prestockOpnameItemsData.filter(item => item.opname_id === opnameId);
};
