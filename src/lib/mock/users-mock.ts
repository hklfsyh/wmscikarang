// Mock Data Users - 3 Role Hierarchy
// File: src/lib/mock/users-mock.ts
// Simulasi tabel: users dari database-schema.dbml

// ========== USERS TABLE MOCK ==========
export interface User {
  id: string;
  warehouseId: string | null; // NULL untuk role developer
  username: string;
  password: string; // Plain text untuk demo localStorage (production: bcrypt)
  fullName: string;
  role: "developer" | "admin_cabang" | "admin_warehouse";
  email: string;
  phone: string;
  warehouseName: string; // Computed dari warehouseId untuk display
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

// Mock password untuk demo localStorage (production gunakan bcrypt)
// Plain passwords untuk demo:
// - dev_haikal: dev123
// - admin_ckr: admin123
// - staff_ckr1: staff123
// - staff_ckr2: staff123
// - admin_bdg: admin123
// - staff_bdg1: staff123

export const mockUsers: User[] = [
  // ===== DEVELOPER (warehouseId = NULL, akses semua gudang) =====
  {
    id: "usr-001-developer",
    warehouseId: null, // Developer tidak terikat warehouse
    username: "dev_haikal",
    password: "dev123", // Plain text untuk demo
    fullName: "Haikal (Developer)",
    role: "developer",
    email: "haikal@wmscikarang.com",
    phone: "081234567890",
    warehouseName: "Semua Gudang", // Computed
    isActive: true,
    lastLogin: "2025-12-26T08:30:00Z",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2025-12-26T08:30:00Z",
  },

  // ===== CIKARANG WAREHOUSE USERS =====
  // Admin Cabang Cikarang (Kepala Gudang)
  {
    id: "usr-002-admin-ckr",
    warehouseId: "wh-001-cikarang",
    username: "admin_ckr",
    password: "admin123",
    fullName: "Andi Pratama (Kepala Gudang Cikarang)",
    role: "admin_cabang",
    email: "andi.pratama@wmscikarang.com",
    phone: "081234567891",
    warehouseName: "Cikarang",
    isActive: true,
    lastLogin: "2025-12-26T07:45:00Z",
    createdAt: "2024-01-15T00:00:00Z",
    updatedAt: "2025-12-26T07:45:00Z",
  },

  // Admin Warehouse Cikarang #1 (Staff Operasional)
  {
    id: "usr-003-staff-ckr",
    warehouseId: "wh-001-cikarang",
    username: "staff_ckr1",
    password: "staff123",
    fullName: "Dewi Lestari",
    role: "admin_warehouse",
    email: "dewi.lestari@wmscikarang.com",
    phone: "081234567892",
    warehouseName: "Cikarang",
    isActive: true,
    lastLogin: "2025-12-26T06:00:00Z",
    createdAt: "2024-02-01T00:00:00Z",
    updatedAt: "2025-12-26T06:00:00Z",
  },

  // Admin Warehouse Cikarang #2 (Staff Operasional)
  {
    id: "usr-004-staff-ckr",
    warehouseId: "wh-001-cikarang",
    username: "staff_ckr2",
    password: "staff123",
    fullName: "Budi Santoso",
    role: "admin_warehouse",
    email: "budi.santoso@wmscikarang.com",
    phone: "081234567893",
    warehouseName: "Cikarang",
    isActive: true,
    lastLogin: "2025-12-25T14:30:00Z",
    createdAt: "2024-02-15T00:00:00Z",
    updatedAt: "2025-12-25T14:30:00Z",
  },

  // ===== BANDUNG WAREHOUSE USERS =====
  // Admin Cabang Bandung (Kepala Gudang)
  {
    id: "usr-005-admin-bdg",
    warehouseId: "wh-002-bandung",
    username: "admin_bdg",
    password: "admin123",
    fullName: "Rizki Hakim (Kepala Gudang Bandung)",
    role: "admin_cabang",
    email: "rizki.hakim@wmscikarang.com",
    phone: "082234567890",
    warehouseName: "Bandung",
    isActive: true,
    lastLogin: "2025-12-26T08:00:00Z",
    createdAt: "2024-03-01T00:00:00Z",
    updatedAt: "2025-12-26T08:00:00Z",
  },

  // Admin Warehouse Bandung (Staff Operasional)
  {
    id: "usr-006-staff-bdg",
    warehouseId: "wh-002-bandung",
    username: "staff_bdg1",
    password: "staff123",
    fullName: "Siti Nurhaliza",
    role: "admin_warehouse",
    email: "siti.nurhaliza@wmscikarang.com",
    phone: "082234567891",
    warehouseName: "Bandung",
    isActive: true,
    lastLogin: "2025-12-26T06:15:00Z",
    createdAt: "2024-03-15T00:00:00Z",
    updatedAt: "2025-12-26T06:15:00Z",
  },

  // ===== INACTIVE USER (Contoh user yang di-nonaktifkan) =====
  {
    id: "usr-007-inactive",
    warehouseId: "wh-001-cikarang",
    username: "staff_ckr_old",
    password: "staff123",
    fullName: "Ahmad Fauzi (Tidak Aktif)",
    role: "admin_warehouse",
    email: "ahmad.fauzi@wmscikarang.com",
    phone: "081234567899",
    warehouseName: "Cikarang",
    isActive: false, // User sudah tidak aktif
    lastLogin: "2024-11-30T17:00:00Z",
    createdAt: "2024-01-20T00:00:00Z",
    updatedAt: "2024-12-01T00:00:00Z",
  },
];

// ========== HELPER FUNCTIONS ==========

// Get user by ID
export const getUserById = (id: string): User | undefined => {
  return mockUsers.find((u) => u.id === id);
};

// Get user by username
export const getUserByUsername = (username: string): User | undefined => {
  return mockUsers.find((u) => u.username === username);
};

// Get users by warehouse (untuk admin_cabang filter)
export const getUsersByWarehouse = (warehouseId: string): User[] => {
  return mockUsers.filter((u) => u.warehouseId === warehouseId && u.isActive);
};

// Get users by role
export const getUsersByRole = (
  role: "developer" | "admin_cabang" | "admin_warehouse"
): User[] => {
  return mockUsers.filter((u) => u.role === role && u.isActive);
};

// Get admin_warehouse users for specific warehouse (untuk admin_cabang CRUD)
export const getAdminWarehouseByWarehouse = (warehouseId: string): User[] => {
  return mockUsers.filter(
    (u) =>
      u.warehouseId === warehouseId &&
      u.role === "admin_warehouse" &&
      u.isActive
  );
};

// Validate login credentials (demo - langsung compare password)
export const validateLogin = (
  username: string,
  password: string
): User | null => {
  const user = getUserByUsername(username);
  if (!user || !user.isActive) return null;

  // Demo: direct password comparison (production gunakan bcrypt.compare)
  if (user.password === password) {
    return user;
  }

  return null;
};

// Check if user can CRUD another user (authorization helper)
export const canCRUDUser = (
  currentUser: User,
  targetUser: User
): boolean => {
  // Developer bisa CRUD semua user
  if (currentUser.role === "developer") return true;

  // Admin cabang hanya bisa CRUD admin_warehouse di warehouse sendiri
  if (currentUser.role === "admin_cabang") {
    return (
      targetUser.role === "admin_warehouse" &&
      targetUser.warehouseId === currentUser.warehouseId
    );
  }

  // Admin warehouse tidak bisa CRUD user sama sekali
  return false;
};

// Get users that current user can see/manage
export const getUsersForUser = (currentUser: User): User[] => {
  // Developer lihat semua user
  if (currentUser.role === "developer") {
    return mockUsers;
  }

  // Admin cabang hanya lihat admin_warehouse di warehouse sendiri
  if (currentUser.role === "admin_cabang") {
    return getAdminWarehouseByWarehouse(currentUser.warehouseId!);
  }

  // Admin warehouse tidak bisa lihat user management
  return [];
};
