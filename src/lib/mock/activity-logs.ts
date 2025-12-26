// Mock data untuk Activity Log (Backend Only)
// File: src/lib/mock/activity-logs.ts
// Simulasi tabel activity_logs dari database-schema.dbml

export interface ActivityLog {
  id: string;
  warehouse_id?: string | null; // NULL untuk developer
  user_id: string;

  action: 'login' | 'logout' | 'create' | 'update' | 'delete' | 'view' | 'export' | 'reconcile';
  entity_type: string; // 'user', 'product', 'inbound', 'outbound', 'stock_opname', dll
  entity_id?: string;

  old_values?: Record<string, unknown>; // JSON object
  new_values?: Record<string, unknown>; // JSON object

  ip_address?: string;
  user_agent?: string;

  created_at: string;
}

// Mock data untuk Activity Log
export const activityLogsData: ActivityLog[] = [
  // Developer activities (warehouse_id = null)
  {
    id: "act-001",
    warehouse_id: null,
    user_id: "usr-001", // Developer
    action: "login",
    entity_type: "session",
    created_at: "2025-12-26T08:00:00.000Z",
    ip_address: "192.168.1.100",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  },
  {
    id: "act-002",
    warehouse_id: null,
    user_id: "usr-001",
    action: "create",
    entity_type: "user",
    entity_id: "usr-005",
    new_values: {
      username: "admin_baru",
      full_name: "Admin Warehouse Baru",
      role: "admin_warehouse",
      warehouse_id: "wh-001-cikarang"
    },
    created_at: "2025-12-26T08:15:00.000Z",
    ip_address: "192.168.1.100",
  },

  // Admin Cabang activities
  {
    id: "act-003",
    warehouse_id: "wh-001-cikarang",
    user_id: "usr-002", // Andi Pratama (admin_cabang)
    action: "login",
    entity_type: "session",
    created_at: "2025-12-26T08:30:00.000Z",
    ip_address: "10.0.0.50",
    user_agent: "Mozilla/5.0 (Android 12; Mobile)",
  },
  {
    id: "act-004",
    warehouse_id: "wh-001-cikarang",
    user_id: "usr-002",
    action: "reconcile",
    entity_type: "prestock_opname",
    entity_id: "opn-002",
    old_values: { reconciliation_status: "pending" },
    new_values: {
      reconciliation_status: "reconciled",
      reconciled_by: "usr-002",
      reconciliation_notes: "Rekonsel selesai. Beberapa selisih dapat dijelaskan dengan transaksi antar shift."
    },
    created_at: "2025-12-25T10:15:00.000Z",
    ip_address: "10.0.0.50",
  },
  {
    id: "act-005",
    warehouse_id: "wh-001-cikarang",
    user_id: "usr-002",
    action: "update",
    entity_type: "product",
    entity_id: "prod-ckr-001",
    old_values: { product_name: "600ML AQUA LOCAL 1X24" },
    new_values: { product_name: "600ML AQUA LOCAL 1X24 - UPDATED" },
    created_at: "2025-12-26T09:00:00.000Z",
    ip_address: "10.0.0.50",
  },

  // Admin Warehouse activities
  {
    id: "act-006",
    warehouse_id: "wh-001-cikarang",
    user_id: "usr-003", // Dewi Lestari (admin_warehouse)
    action: "login",
    entity_type: "session",
    created_at: "2025-12-26T08:45:00.000Z",
    ip_address: "10.0.0.51",
    user_agent: "Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X)",
  },
  {
    id: "act-007",
    warehouse_id: "wh-001-cikarang",
    user_id: "usr-003",
    action: "create",
    entity_type: "inbound_history",
    entity_id: "inb-001",
    new_values: {
      transaction_code: "INB-20251226-0001",
      product_id: "prod-ckr-001",
      qty_carton: 75,
      bb_produk: "2512260001"
    },
    created_at: "2025-12-26T08:45:00.000Z",
    ip_address: "10.0.0.51",
  },
  {
    id: "act-008",
    warehouse_id: "wh-001-cikarang",
    user_id: "usr-003",
    action: "create",
    entity_type: "outbound_history",
    entity_id: "out-001",
    new_values: {
      transaction_code: "OUT-20251226-0001",
      product_id: "prod-ckr-001",
      qty_carton: 25
    },
    created_at: "2025-12-26T14:30:00.000Z",
    ip_address: "10.0.0.51",
  },
  {
    id: "act-009",
    warehouse_id: "wh-001-cikarang",
    user_id: "usr-003",
    action: "create",
    entity_type: "npl_history",
    entity_id: "npl-001",
    new_values: {
      transaction_code: "NPL-20251226-0001",
      product_id: "prod-ckr-009",
      qty_carton: 8,
      bb_produk: "2512230005"
    },
    created_at: "2025-12-26T16:20:00.000Z",
    ip_address: "10.0.0.51",
  },

  // Another Admin Warehouse
  {
    id: "act-010",
    warehouse_id: "wh-001-cikarang",
    user_id: "usr-004", // Budi Santoso (admin_warehouse)
    action: "create",
    entity_type: "permutasi_history",
    entity_id: "pmt-001",
    new_values: {
      transaction_code: "PMT-20251226-0001",
      stock_id: "stk-004",
      from_location: "C-11-01-01",
      to_location: "B-04-03-02",
      reason: "Relokasi dari In Transit ke home cluster"
    },
    created_at: "2025-12-26T11:45:00.000Z",
    ip_address: "10.0.0.52",
  },
  {
    id: "act-011",
    warehouse_id: "wh-001-cikarang",
    user_id: "usr-004",
    action: "create",
    entity_type: "prestock_opname",
    entity_id: "opn-001",
    new_values: {
      opname_code: "OPN-20251226-0001",
      audit_date: "2025-12-26",
      auditor_id: "usr-003"
    },
    created_at: "2025-12-26T08:45:00.000Z",
    ip_address: "10.0.0.52",
  },

  // Failed login attempts (security monitoring)
  {
    id: "act-012",
    warehouse_id: "wh-001-cikarang",
    user_id: "usr-003",
    action: "login",
    entity_type: "session",
    old_values: { status: "failed", reason: "wrong_password" },
    created_at: "2025-12-26T08:40:00.000Z",
    ip_address: "192.168.1.200",
    user_agent: "Mozilla/5.0 (Unknown Device)",
  },

  // Data export activities
  {
    id: "act-013",
    warehouse_id: "wh-001-cikarang",
    user_id: "usr-002",
    action: "export",
    entity_type: "outbound_history",
    new_values: {
      format: "excel",
      date_range: "2025-12-01 to 2025-12-26",
      record_count: 45
    },
    created_at: "2025-12-26T10:30:00.000Z",
    ip_address: "10.0.0.50",
  },

  // Logout activities
  {
    id: "act-014",
    warehouse_id: "wh-001-cikarang",
    user_id: "usr-003",
    action: "logout",
    entity_type: "session",
    created_at: "2025-12-26T17:00:00.000Z",
    ip_address: "10.0.0.51",
  },
  {
    id: "act-015",
    warehouse_id: null,
    user_id: "usr-001",
    action: "logout",
    entity_type: "session",
    created_at: "2025-12-26T18:00:00.000Z",
    ip_address: "192.168.1.100",
  },
];

// Helper functions untuk activity logs
export const getActivityLogsByUser = (userId: string): ActivityLog[] => {
  return activityLogsData.filter(log => log.user_id === userId);
};

export const getActivityLogsByWarehouse = (warehouseId: string): ActivityLog[] => {
  return activityLogsData.filter(log => log.warehouse_id === warehouseId);
};

export const getActivityLogsByDateRange = (startDate: string, endDate: string): ActivityLog[] => {
  return activityLogsData.filter(log =>
    log.created_at >= startDate && log.created_at <= endDate
  );
};

export const getActivityLogsByAction = (action: string): ActivityLog[] => {
  return activityLogsData.filter(log => log.action === action);
};

export const getActivityLogsByEntity = (entityType: string, entityId?: string): ActivityLog[] => {
  return activityLogsData.filter(log =>
    log.entity_type === entityType &&
    (!entityId || log.entity_id === entityId)
  );
};

export const getRecentActivityLogs = (limit: number = 10): ActivityLog[] => {
  return activityLogsData
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
};