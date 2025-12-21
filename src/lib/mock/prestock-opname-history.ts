// Mock data untuk Pre-Stock Opname History
// Data ini akan digunakan oleh halaman superadmin untuk rekonsel

export type PrestockOpnameItem = {
  productCode: string;
  productName: string;
  auditQty: number;
};

export type ReconciliationNote = {
  productCode: string;
  reason: string;
  reconciledAt: string;
  reconciledBy: string;
};

export type PrestockOpnameHistory = {
  id: string;
  auditorName: string;
  auditDate: string;
  auditTime: string;
  items: PrestockOpnameItem[];
  reconciliationStatus: 'pending' | 'reconciled';
  reconciliationNotes: ReconciliationNote[];
  reconciledAt?: string;
  reconciledBy?: string;
};

// Initial mock data - akan digantikan dengan data dari localStorage
// Array diurutkan dari TERBARU ke TERLAMA (index 0 = paling baru)
export const prestockOpnameHistoryData: PrestockOpnameHistory[] = [
  // Data hari ini (17 Des 2025) - BELUM DIREKONSEL
  {
    id: 'AUDIT-1734486400000',
    auditorName: 'Admin Warehouse B',
    auditDate: '2025-12-17',
    auditTime: '08:45',
    items: [
      { productCode: '166126', productName: '220ML AQUA CUBE MINI BOTTLE LOCAL 1X24', auditQty: 35 },
      { productCode: '204579', productName: '200ML AQUA LOCAL 1X48', auditQty: 48 },
      { productCode: '74561', productName: '600ML AQUA LOCAL 1X24', auditQty: 75 },
      { productCode: '74553', productName: '1500ML AQUA LOCAL 1X12', auditQty: 45 },
      { productCode: '74556', productName: '330ML AQUA LOCAL 1X24', auditQty: 62 },
      { productCode: '81681', productName: '750ML AQUA LOCAL 1X18', auditQty: 38 },
      { productCode: '142009', productName: '1100ML AQUA LOCAL 1X12 BARCODE ON CAP', auditQty: 20 },
      { productCode: '74589', productName: '1500ML AQUA LOCAL MULTIPACK 1X6', auditQty: 15 },
      { productCode: '145141', productName: '500ML MIZONE ACTIV LYCHEE LEMON 1X12', auditQty: 24 },
      { productCode: '206774', productName: '500ML MIZONE COCO BOOST 1X12', auditQty: 18 },
    ],
    reconciliationStatus: 'pending',
    reconciliationNotes: [],
  },
  
  // Data kemarin (16 Des 2025) - SUDAH DIREKONSEL
  {
    id: 'AUDIT-1734400000000',
    auditorName: 'Admin Warehouse A',
    auditDate: '2025-12-16',
    auditTime: '08:30',
    items: [
      { productCode: '166126', productName: '220ML AQUA CUBE MINI BOTTLE LOCAL 1X24', auditQty: 20 },
      { productCode: '204579', productName: '200ML AQUA LOCAL 1X48', auditQty: 48 },
      { productCode: '74561', productName: '600ML AQUA LOCAL 1X24', auditQty: 80 },
      { productCode: '74553', productName: '1500ML AQUA LOCAL 1X12', auditQty: 45 },
      { productCode: '74556', productName: '330ML AQUA LOCAL 1X24', auditQty: 65 },
      { productCode: '81681', productName: '750ML AQUA LOCAL 1X18', auditQty: 40 },
      { productCode: '142009', productName: '1100ML AQUA LOCAL 1X12 BARCODE ON CAP', auditQty: 22 },
      { productCode: '74589', productName: '1500ML AQUA LOCAL MULTIPACK 1X6', auditQty: 15 },
      { productCode: '145141', productName: '500ML MIZONE ACTIV LYCHEE LEMON 1X12', auditQty: 30 },
      { productCode: '206774', productName: '500ML MIZONE COCO BOOST 1X12', auditQty: 18 },
    ],
    reconciliationStatus: 'reconciled',
    reconciliationNotes: [
      {
        productCode: '166126',
        reason: 'Produk baru masuk dari supplier pada shift malam',
        reconciledAt: '2025-12-16 10:15',
        reconciledBy: 'Superadmin 1',
      },
      {
        productCode: '74561',
        reason: 'Terjadi pengambilan untuk outbound urgent dari customer priority',
        reconciledAt: '2025-12-16 10:15',
        reconciledBy: 'Superadmin 1',
      },
      {
        productCode: '74556',
        reason: 'Penyesuaian stock akibat kerusakan packaging saat handling',
        reconciledAt: '2025-12-16 10:15',
        reconciledBy: 'Superadmin 1',
      },
      {
        productCode: '81681',
        reason: 'Outbound ke cabang lain untuk replenishment stock',
        reconciledAt: '2025-12-16 10:15',
        reconciledBy: 'Superadmin 1',
      },
      {
        productCode: '142009',
        reason: 'Return dari customer karena mendekati expired date',
        reconciledAt: '2025-12-16 10:15',
        reconciledBy: 'Superadmin 1',
      },
      {
        productCode: '145141',
        reason: 'Penjualan langsung ke walk-in customer saat shift malam',
        reconciledAt: '2025-12-16 10:15',
        reconciledBy: 'Superadmin 1',
      },
    ],
    reconciledAt: '2025-12-16 10:15',
    reconciledBy: 'Superadmin 1',
  },
  
  // Data 15 Des 2025 - SUDAH DIREKONSEL
  {
    id: 'AUDIT-1734313600000',
    auditorName: 'Admin Warehouse C',
    auditDate: '2025-12-15',
    auditTime: '09:00',
    items: [
      { productCode: '166126', productName: '220ML AQUA CUBE MINI BOTTLE LOCAL 1X24', auditQty: 25 },
      { productCode: '204579', productName: '200ML AQUA LOCAL 1X48', auditQty: 50 },
      { productCode: '74561', productName: '600ML AQUA LOCAL 1X24', auditQty: 85 },
      { productCode: '74553', productName: '1500ML AQUA LOCAL 1X12', auditQty: 40 },
      { productCode: '74556', productName: '330ML AQUA LOCAL 1X24', auditQty: 60 },
      { productCode: '81681', productName: '750ML AQUA LOCAL 1X18', auditQty: 35 },
      { productCode: '142009', productName: '1100ML AQUA LOCAL 1X12 BARCODE ON CAP', auditQty: 25 },
      { productCode: '74589', productName: '1500ML AQUA LOCAL MULTIPACK 1X6', auditQty: 18 },
      { productCode: '145141', productName: '500ML MIZONE ACTIV LYCHEE LEMON 1X12', auditQty: 28 },
      { productCode: '206774', productName: '500ML MIZONE COCO BOOST 1X12', auditQty: 20 },
    ],
    reconciliationStatus: 'reconciled',
    reconciliationNotes: [
      {
        productCode: '204579',
        reason: 'Penerimaan stock baru dari pabrik',
        reconciledAt: '2025-12-15 11:00',
        reconciledBy: 'Superadmin 2',
      },
      {
        productCode: '74561',
        reason: 'Stock opname manual menemukan selisih dengan sistem',
        reconciledAt: '2025-12-15 11:00',
        reconciledBy: 'Superadmin 2',
      },
      {
        productCode: '74553',
        reason: 'Distribusi ke outlet modern trade',
        reconciledAt: '2025-12-15 11:00',
        reconciledBy: 'Superadmin 2',
      },
      {
        productCode: '74556',
        reason: 'Koreksi stock akibat kesalahan input sebelumnya',
        reconciledAt: '2025-12-15 11:00',
        reconciledBy: 'Superadmin 2',
      },
      {
        productCode: '81681',
        reason: 'Pengambilan untuk event promosi perusahaan',
        reconciledAt: '2025-12-15 11:00',
        reconciledBy: 'Superadmin 2',
      },
      {
        productCode: '142009',
        reason: 'Inbound dari gudang pusat',
        reconciledAt: '2025-12-15 11:00',
        reconciledBy: 'Superadmin 2',
      },
      {
        productCode: '74589',
        reason: 'Penyesuaian akibat damaged goods yang belum dicatat',
        reconciledAt: '2025-12-15 11:00',
        reconciledBy: 'Superadmin 2',
      },
      {
        productCode: '145141',
        reason: 'Return dari distributor karena over stock',
        reconciledAt: '2025-12-15 11:00',
        reconciledBy: 'Superadmin 2',
      },
      {
        productCode: '206774',
        reason: 'Koreksi manual setelah cycle count',
        reconciledAt: '2025-12-15 11:00',
        reconciledBy: 'Superadmin 2',
      },
    ],
    reconciledAt: '2025-12-15 11:00',
    reconciledBy: 'Superadmin 2',
  },
  
  // Data 14 Des 2025 - SUDAH DIREKONSEL
  {
    id: 'AUDIT-1734227200000',
    auditorName: 'Admin Warehouse A',
    auditDate: '2025-12-14',
    auditTime: '08:15',
    items: [
      { productCode: '166126', productName: '220ML AQUA CUBE MINI BOTTLE LOCAL 1X24', auditQty: 30 },
      { productCode: '204579', productName: '200ML AQUA LOCAL 1X48', auditQty: 45 },
      { productCode: '74561', productName: '600ML AQUA LOCAL 1X24', auditQty: 90 },
      { productCode: '74553', productName: '1500ML AQUA LOCAL 1X12', auditQty: 38 },
      { productCode: '74556', productName: '330ML AQUA LOCAL 1X24', auditQty: 55 },
      { productCode: '81681', productName: '750ML AQUA LOCAL 1X18', auditQty: 42 },
      { productCode: '142009', productName: '1100ML AQUA LOCAL 1X12 BARCODE ON CAP', auditQty: 28 },
      { productCode: '74589', productName: '1500ML AQUA LOCAL MULTIPACK 1X6', auditQty: 20 },
      { productCode: '145141', productName: '500ML MIZONE ACTIV LYCHEE LEMON 1X12', auditQty: 25 },
      { productCode: '206774', productName: '500ML MIZONE COCO BOOST 1X12', auditQty: 22 },
    ],
    reconciliationStatus: 'reconciled',
    reconciliationNotes: [
      {
        productCode: '166126',
        reason: 'Transfer stock antar warehouse untuk balance inventory',
        reconciledAt: '2025-12-14 10:30',
        reconciledBy: 'Superadmin 1',
      },
      {
        productCode: '204579',
        reason: 'Penjualan bulk order ke corporate client',
        reconciledAt: '2025-12-14 10:30',
        reconciledBy: 'Superadmin 1',
      },
      {
        productCode: '74561',
        reason: 'Koreksi hasil audit fisik yang tidak sesuai dengan sistem WMS',
        reconciledAt: '2025-12-14 10:30',
        reconciledBy: 'Superadmin 1',
      },
      {
        productCode: '74553',
        reason: 'Pengiriman urgent ke customer VIP tanpa input sistem',
        reconciledAt: '2025-12-14 10:30',
        reconciledBy: 'Superadmin 1',
      },
      {
        productCode: '74556',
        reason: 'Stock adjustment setelah physical count',
        reconciledAt: '2025-12-14 10:30',
        reconciledBy: 'Superadmin 1',
      },
      {
        productCode: '81681',
        reason: 'Penyesuaian karena ditemukan produk rusak saat loading',
        reconciledAt: '2025-12-14 10:30',
        reconciledBy: 'Superadmin 1',
      },
      {
        productCode: '142009',
        reason: 'Penambahan stock dari retur yang baru diproses',
        reconciledAt: '2025-12-14 10:30',
        reconciledBy: 'Superadmin 1',
      },
      {
        productCode: '74589',
        reason: 'Penyesuaian stock akibat damaged goods yang belum tercatat',
        reconciledAt: '2025-12-14 10:30',
        reconciledBy: 'Superadmin 1',
      },
      {
        productCode: '145141',
        reason: 'Produk sample untuk marketing campaign',
        reconciledAt: '2025-12-14 10:30',
        reconciledBy: 'Superadmin 1',
      },
      {
        productCode: '206774',
        reason: 'Inbound dari return customer (produk masih bagus)',
        reconciledAt: '2025-12-14 10:30',
        reconciledBy: 'Superadmin 1',
      },
    ],
    reconciledAt: '2025-12-14 10:30',
    reconciledBy: 'Superadmin 1',
  },
  
  // Data 13 Des 2025 - BELUM DIREKONSEL (oldest pending)
  {
    id: 'AUDIT-1734140800000',
    auditorName: 'Admin Warehouse B',
    auditDate: '2025-12-13',
    auditTime: '09:15',
    items: [
      { productCode: '166126', productName: '220ML AQUA CUBE MINI BOTTLE LOCAL 1X24', auditQty: 28 },
      { productCode: '204579', productName: '200ML AQUA LOCAL 1X48', auditQty: 52 },
      { productCode: '74561', productName: '600ML AQUA LOCAL 1X24', auditQty: 88 },
      { productCode: '74553', productName: '1500ML AQUA LOCAL 1X12', auditQty: 35 },
      { productCode: '74556', productName: '330ML AQUA LOCAL 1X24', auditQty: 58 },
      { productCode: '81681', productName: '750ML AQUA LOCAL 1X18', auditQty: 44 },
      { productCode: '142009', productName: '1100ML AQUA LOCAL 1X12 BARCODE ON CAP', auditQty: 26 },
      { productCode: '74589', productName: '1500ML AQUA LOCAL MULTIPACK 1X6', auditQty: 22 },
      { productCode: '145141', productName: '500ML MIZONE ACTIV LYCHEE LEMON 1X12', auditQty: 27 },
      { productCode: '206774', productName: '500ML MIZONE COCO BOOST 1X12', auditQty: 25 },
    ],
    reconciliationStatus: 'pending',
    reconciliationNotes: [],
  },
];

// Helper function untuk mendapatkan data dari localStorage atau fallback ke mock
export const getPrestockOpnameHistory = (): PrestockOpnameHistory[] => {
  if (typeof window === 'undefined') return prestockOpnameHistoryData;
  
  const saved = localStorage.getItem('wms_prestock_opname_history');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Pastikan setiap item memiliki reconciliationStatus dan reconciliationNotes
      return parsed.map((item: Partial<PrestockOpnameHistory>) => ({
        ...item,
        reconciliationStatus: item.reconciliationStatus || 'pending',
        reconciliationNotes: item.reconciliationNotes || [],
      }));
    } catch (e) {
      console.error('Error parsing prestock opname history:', e);
      return prestockOpnameHistoryData;
    }
  }
  
  return prestockOpnameHistoryData;
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
