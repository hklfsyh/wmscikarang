// Mock data untuk Stock Movement Log (Backend Only)
// File: src/lib/mock/stock-movements.ts
// Simulasi tabel stock_movements dari database-schema.dbml

export interface StockMovement {
  id: string;
  warehouse_id: string;
  stock_id: string;
  product_id: string;
  bb_produk: string; // BB Produk 10 digit: YYMMDDXXXX

  movement_type: 'inbound' | 'outbound' | 'adjustment' | 'transfer';
  reference_type?: 'inbound_history' | 'outbound_history' | 'opname';
  reference_id?: string;

  qty_before: number;
  qty_change: number;
  qty_after: number;

  from_location?: string;
  to_location?: string;

  performed_by: string;
  performed_at: string;
  notes?: string;
}

// Mock data untuk Stock Movement Log
export const stockMovementsData: StockMovement[] = [
  // Inbound movements - 26 Des 2025
  {
    id: "sm-001",
    warehouse_id: "wh-001-cikarang",
    stock_id: "stk-001",
    product_id: "prod-ckr-001", // 600ML AQUA LOCAL 1X24
    bb_produk: "2512260001",
    movement_type: "inbound",
    reference_type: "inbound_history",
    reference_id: "inb-001",
    qty_before: 0,
    qty_change: 75,
    qty_after: 75,
    from_location: undefined,
    to_location: "A-01-01-01",
    performed_by: "usr-003", // Dewi Lestari (admin_warehouse)
    performed_at: "2025-12-26T08:45:00.000Z",
    notes: "Inbound dari pabrik via JNE - DN: DN-20251226-001",
  },
  {
    id: "sm-002",
    warehouse_id: "wh-001-cikarang",
    stock_id: "stk-002",
    product_id: "prod-ckr-002", // 200ML AQUA LOCAL 1X48
    bb_produk: "2512260002",
    movement_type: "inbound",
    reference_type: "inbound_history",
    reference_id: "inb-002",
    qty_before: 0,
    qty_change: 48,
    qty_after: 48,
    from_location: undefined,
    to_location: "A-02-01-01",
    performed_by: "usr-003",
    performed_at: "2025-12-26T09:15:00.000Z",
    notes: "Inbound dari distributor lokal",
  },

  // Outbound movements - 26 Des 2025
  {
    id: "sm-003",
    warehouse_id: "wh-001-cikarang",
    stock_id: "stk-001",
    product_id: "prod-ckr-001", // 600ML AQUA LOCAL 1X24
    bb_produk: "2512260001",
    movement_type: "outbound",
    reference_type: "outbound_history",
    reference_id: "out-001",
    qty_before: 75,
    qty_change: -25,
    qty_after: 50,
    from_location: "A-01-01-01",
    to_location: undefined,
    performed_by: "usr-003",
    performed_at: "2025-12-26T14:30:00.000Z",
    notes: "Outbound ke customer retail - DO: OUT-20251226-001",
  },

  // Adjustment movements - Stock Opname reconciliation
  {
    id: "sm-004",
    warehouse_id: "wh-001-cikarang",
    stock_id: "stk-003",
    product_id: "prod-ckr-008", // 1500ML AQUA LOCAL MULTIPACK 1X6
    bb_produk: "2512250003",
    movement_type: "adjustment",
    reference_type: "opname",
    reference_id: "opn-002",
    qty_before: 15,
    qty_change: 5,
    qty_after: 20,
    from_location: "B-03-02-01",
    to_location: "B-03-02-01",
    performed_by: "usr-002", // Andi Pratama (admin_cabang)
    performed_at: "2025-12-25T10:15:00.000Z",
    notes: "Adjustment stock opname - Produk baru masuk dari supplier pada shift malam",
  },

  // Transfer movements - Permutasi
  {
    id: "sm-005",
    warehouse_id: "wh-001-cikarang",
    stock_id: "stk-004",
    product_id: "prod-ckr-007", // 1100ML AQUA LOCAL 1X12 BARCODE ON CAP
    bb_produk: "2512240004",
    movement_type: "transfer",
    reference_type: undefined,
    reference_id: "pmt-001",
    qty_before: 12,
    qty_change: 0, // Transfer tidak mengubah quantity
    qty_after: 12,
    from_location: "C-11-01-01", // In Transit
    to_location: "B-04-03-02", // Home cluster
    performed_by: "usr-004", // Budi Santoso (admin_warehouse)
    performed_at: "2025-12-26T11:45:00.000Z",
    notes: "Permutasi dari In Transit ke home cluster B",
  },

  // NPL movements - Return dari lapangan
  {
    id: "sm-006",
    warehouse_id: "wh-001-cikarang",
    stock_id: "stk-005",
    product_id: "prod-ckr-009", // 600ML AQUA LOCAL MULTIPACK 1X6
    bb_produk: "2512230005",
    movement_type: "inbound",
    reference_type: undefined,
    reference_id: "npl-001",
    qty_before: 0,
    qty_change: 8,
    qty_after: 8,
    from_location: undefined,
    to_location: "B-05-01-01",
    performed_by: "usr-003",
    performed_at: "2025-12-26T16:20:00.000Z",
    notes: "NPL - Return stock dari lapangan yang tidak terjual",
  },
];

// Helper functions untuk stock movements
export const getStockMovementsByWarehouse = (warehouseId: string): StockMovement[] => {
  return stockMovementsData.filter(movement => movement.warehouse_id === warehouseId);
};

export const getStockMovementsByStock = (stockId: string): StockMovement[] => {
  return stockMovementsData.filter(movement => movement.stock_id === stockId);
};

export const getStockMovementsByDateRange = (warehouseId: string, startDate: string, endDate: string): StockMovement[] => {
  return stockMovementsData.filter(movement =>
    movement.warehouse_id === warehouseId &&
    movement.performed_at >= startDate &&
    movement.performed_at <= endDate
  );
};

export const getStockMovementsByType = (warehouseId: string, movementType: string): StockMovement[] => {
  return stockMovementsData.filter(movement =>
    movement.warehouse_id === warehouseId &&
    movement.movement_type === movementType
  );
};