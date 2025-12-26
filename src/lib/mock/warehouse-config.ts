// Warehouse Configuration Mock Data
// This defines the customizable structure of clusters, lorong, baris, and pallet capacity

export interface CustomLorongConfig {
  lorongRange: [number, number]; // [start, end] e.g., [1, 2] means lorong 1-2
  barisCount: number; // Custom number of baris for this lorong range
  palletPerSel?: number; // Optional custom pallet capacity
}

export interface CustomCellConfig {
  lorongRange: [number, number]; // [start, end]
  barisRange: [number, number]; // [start, end]
  palletPerSel: number; // Custom pallet capacity for this specific cell range
}

export interface ClusterCellOverride {
  id: string;
  clusterConfigId: string; // Reference to cluster_configs.id
  lorongStart: number;
  lorongEnd: number;
  barisStart: number | null; // NULL = semua baris
  barisEnd: number | null; // NULL = semua baris
  customBarisCount: number | null; // Override jumlah baris
  customPalletLevel: number | null; // Override jumlah pallet level
  isTransitArea: boolean; // Area in-transit/overflow
  isDisabled: boolean; // Lokasi tidak bisa dipakai
  note: string; // Alasan: Tiang penyangga, Area galon, dll
  createdAt: string;
  updatedAt: string;
}

export interface ClusterConfig {
  id: string;
  clusterChar: string;
  clusterName: string;
  warehouseId: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  defaultLorongCount: number; // Default number of lorong
  defaultBarisCount: number; // Default number of baris
  defaultPalletLevel: number; // Default pallet capacity per cell
  customLorongConfig?: CustomLorongConfig[]; // Custom lorong configurations
  customCellConfig?: CustomCellConfig[]; // Custom cell configurations
  inTransitLorongRange?: [number, number]; // Optional: Lorong range for In Transit area (buffer for overflow)
}

export interface ProductHome {
  id: string;
  warehouseId: string;
  productId: string; // UUID reference to products.id
  clusterChar: string; // char(1)
  lorongStart: number;
  lorongEnd: number;
  barisStart: number;
  barisEnd: number;
  maxPalletPerLocation: number;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// MOCK DATA: Cluster Configurations
export const clusterConfigs: ClusterConfig[] = [
  {
    id: "cluster-a",
    warehouseId: "wh-001-cikarang",
    clusterChar: "A",
    clusterName: "Cluster A - Fast Moving",
    description: "Cluster untuk produk fast moving seperti AQUA 220ML dan 600ML",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    defaultLorongCount: 11,
    defaultBarisCount: 9,
    defaultPalletLevel: 3,
    customLorongConfig: [
      {
        lorongRange: [1, 2],
        barisCount: 8, // Lorong 1-2 only have 8 baris
        palletPerSel: 2, // And only 2 pallet per sel (220ML AQUA CUBE MINI)
      },
    ],
    customCellConfig: [
      {
        lorongRange: [3, 3],
        barisRange: [1, 9],
        palletPerSel: 2, // Lorong 3, all 9 baris, 2 pallet per sel (220ML AQUA CUBE MINI)
      },
      {
        lorongRange: [4, 5],
        barisRange: [1, 9],
        palletPerSel: 2, // Lorong 4-5, all 9 baris, 2 pallet per sel (200ML AQUA LOCAL)
      },
      // Lorong 6-11 baris 1-9 will use default 3 pallet per sel (600ML AQUA LOCAL)
    ],
  },
  {
    id: "cluster-b",
    warehouseId: "wh-001-cikarang",
    clusterChar: "B",
    clusterName: "Cluster B - Medium Moving",
    description: "Cluster untuk produk medium moving dengan berbagai ukuran AQUA, VIT, dan Mizone",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    defaultLorongCount: 26, // Updated: Lorong 1-26
    defaultBarisCount: 8, // Most common baris count
    defaultPalletLevel: 2, // Most common pallet capacity
    customLorongConfig: [
      {
        lorongRange: [26, 26],
        barisCount: 6, // Lorong 26 hanya 6 baris untuk semua Reflections
      },
    ],
    customCellConfig: [
      {
        lorongRange: [1, 6],
        barisRange: [1, 8],
        palletPerSel: 2, // 1500ML AQUA LOCAL 1X12
      },
      {
        lorongRange: [6, 12],
        barisRange: [1, 8],
        palletPerSel: 3, // 330ML AQUA LOCAL 1X24 (highlighted)
      },
      {
        lorongRange: [13, 16],
        barisRange: [1, 8],
        palletPerSel: 2, // 750ML AQUA LOCAL 1X18
      },
      {
        lorongRange: [17, 18],
        barisRange: [1, 8],
        palletPerSel: 2, // 1100ML AQUA LOCAL 1X12 BARCODE ON CAP
      },
      {
        lorongRange: [19, 20],
        barisRange: [1, 8],
        palletPerSel: 1, // 1500ML AQUA LOCAL MULTIPACK 1X6
      },
      {
        lorongRange: [21, 21],
        barisRange: [1, 8],
        palletPerSel: 1, // 600ML AQUA LOCAL MULTIPACK 1X6
      },
      {
        lorongRange: [22, 22],
        barisRange: [1, 8],
        palletPerSel: 2, // 550ML VIT LOCAL 1X24
      },
      {
        lorongRange: [23, 23],
        barisRange: [1, 8],
        palletPerSel: 2, // 330ML VIT LOCAL 1X24
      },
      {
        lorongRange: [24, 24],
        barisRange: [1, 8],
        palletPerSel: 2, // 200ML VIT LOCAL 1X48
      },
      {
        lorongRange: [25, 25],
        barisRange: [1, 8],
        palletPerSel: 2, // 1500ML VIT LOCAL 1X12
      },
      {
        lorongRange: [26, 26],
        barisRange: [1, 6],
        palletPerSel: 1, // ALL REFLECTIONS (6 baris total, 1 pallet each)
      },
    ],
  },
  {
    id: "cluster-c",
    warehouseId: "wh-001-cikarang",
    clusterChar: "C",
    clusterName: "Cluster C - Mizone Products + In Transit",
    description: "Cluster untuk produk Mizone dan area In Transit sebagai buffer overflow",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    defaultLorongCount: 16, // Lorong 1-16 (L1-L9: Mizone, L10-L16: In Transit)
    defaultBarisCount: 5, // All lorongs have 5 baris
    defaultPalletLevel: 3, // All cells have 3 pallet capacity
    customLorongConfig: [],
    customCellConfig: [],
    inTransitLorongRange: [10, 16], // Lorong 10-16 adalah In Transit area (buffer/overflow)
  },
  {
    id: "cluster-d",
    warehouseId: "wh-001-cikarang",
    clusterChar: "D",
    clusterName: "Cluster D - Galon AQUA 5 Liter",
    description: "Cluster khusus untuk galon AQUA 5 liter dan empty bottles",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    defaultLorongCount: 2, // L1-L2 (L3 RETUR removed)
    defaultBarisCount: 5, // All lorongs have 5 baris
    defaultPalletLevel: 1, // 1 pallet per baris
    customLorongConfig: [],
    customCellConfig: [],
  },
  {
    id: "cluster-e",
    warehouseId: "wh-001-cikarang",
    clusterChar: "E",
    clusterName: "Cluster E - Galon VIT 5 Liter",
    description: "Cluster khusus untuk galon VIT 5 liter dan empty bottles",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    defaultLorongCount: 2, // L1-L2 (L3 RETUR removed)
    defaultBarisCount: 5, // All lorongs have 5 baris
    defaultPalletLevel: 1, // 1 pallet per baris
    customLorongConfig: [],
    customCellConfig: [],
  },
];

// MOCK DATA: Cluster Cell Overrides (PER-CLUSTER - admin_cabang CRUD)
export const clusterCellOverrides: ClusterCellOverride[] = [
  // Cluster A Overrides
  {
    id: "cco-a-001",
    clusterConfigId: "cluster-a",
    lorongStart: 1,
    lorongEnd: 2,
    barisStart: null, // semua baris
    barisEnd: null, // semua baris
    customBarisCount: 8, // Lorong 1-2 only have 8 baris
    customPalletLevel: 2, // And only 2 pallet per sel (220ML AQUA CUBE MINI)
    isTransitArea: false,
    isDisabled: false,
    note: "220ML AQUA CUBE MINI - kapasitas terbatas",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "cco-a-002",
    clusterConfigId: "cluster-a",
    lorongStart: 3,
    lorongEnd: 3,
    barisStart: null, // semua baris
    barisEnd: null, // semua baris
    customBarisCount: null, // use default
    customPalletLevel: 2, // Lorong 3, all 9 baris, 2 pallet per sel (220ML AQUA CUBE MINI)
    isTransitArea: false,
    isDisabled: false,
    note: "220ML AQUA CUBE MINI - lorong 3",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "cco-a-003",
    clusterConfigId: "cluster-a",
    lorongStart: 4,
    lorongEnd: 5,
    barisStart: null, // semua baris
    barisEnd: null, // semua baris
    customBarisCount: null, // use default
    customPalletLevel: 2, // Lorong 4-5, all 9 baris, 2 pallet per sel (200ML AQUA LOCAL)
    isTransitArea: false,
    isDisabled: false,
    note: "200ML AQUA LOCAL - kapasitas pallet terbatas",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },

  // Cluster B Overrides
  {
    id: "cco-b-001",
    clusterConfigId: "cluster-b",
    lorongStart: 1,
    lorongEnd: 6,
    barisStart: null, // semua baris
    barisEnd: null, // semua baris
    customBarisCount: null, // use default
    customPalletLevel: 2, // 1500ML AQUA LOCAL 1X12
    isTransitArea: false,
    isDisabled: false,
    note: "1500ML AQUA LOCAL 1X12",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "cco-b-002",
    clusterConfigId: "cluster-b",
    lorongStart: 6,
    lorongEnd: 12,
    barisStart: null, // semua baris
    barisEnd: null, // semua baris
    customBarisCount: null, // use default
    customPalletLevel: 3, // 330ML AQUA LOCAL 1X24
    isTransitArea: false,
    isDisabled: false,
    note: "330ML AQUA LOCAL 1X24",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "cco-b-003",
    clusterConfigId: "cluster-b",
    lorongStart: 13,
    lorongEnd: 16,
    barisStart: null, // semua baris
    barisEnd: null, // semua baris
    customBarisCount: null, // use default
    customPalletLevel: 2, // 750ML AQUA LOCAL 1X18
    isTransitArea: false,
    isDisabled: false,
    note: "750ML AQUA LOCAL 1X18",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "cco-b-004",
    clusterConfigId: "cluster-b",
    lorongStart: 17,
    lorongEnd: 18,
    barisStart: null, // semua baris
    barisEnd: null, // semua baris
    customBarisCount: null, // use default
    customPalletLevel: 2, // 1100ML AQUA LOCAL 1X12 BARCODE ON CAP
    isTransitArea: false,
    isDisabled: false,
    note: "1100ML AQUA LOCAL 1X12 BARCODE ON CAP",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "cco-b-005",
    clusterConfigId: "cluster-b",
    lorongStart: 19,
    lorongEnd: 20,
    barisStart: null, // semua baris
    barisEnd: null, // semua baris
    customBarisCount: null, // use default
    customPalletLevel: 1, // 1500ML AQUA LOCAL MULTIPACK 1X6
    isTransitArea: false,
    isDisabled: false,
    note: "1500ML AQUA LOCAL MULTIPACK 1X6",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "cco-b-006",
    clusterConfigId: "cluster-b",
    lorongStart: 21,
    lorongEnd: 21,
    barisStart: null, // semua baris
    barisEnd: null, // semua baris
    customBarisCount: null, // use default
    customPalletLevel: 1, // 600ML AQUA LOCAL MULTIPACK 1X6
    isTransitArea: false,
    isDisabled: false,
    note: "600ML AQUA LOCAL MULTIPACK 1X6",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "cco-b-007",
    clusterConfigId: "cluster-b",
    lorongStart: 22,
    lorongEnd: 22,
    barisStart: null, // semua baris
    barisEnd: null, // semua baris
    customBarisCount: null, // use default
    customPalletLevel: 2, // 550ML VIT LOCAL 1X24
    isTransitArea: false,
    isDisabled: false,
    note: "550ML VIT LOCAL 1X24",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "cco-b-008",
    clusterConfigId: "cluster-b",
    lorongStart: 23,
    lorongEnd: 23,
    barisStart: null, // semua baris
    barisEnd: null, // semua baris
    customBarisCount: null, // use default
    customPalletLevel: 2, // 330ML VIT LOCAL 1X24
    isTransitArea: false,
    isDisabled: false,
    note: "330ML VIT LOCAL 1X24",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "cco-b-009",
    clusterConfigId: "cluster-b",
    lorongStart: 24,
    lorongEnd: 24,
    barisStart: null, // semua baris
    barisEnd: null, // semua baris
    customBarisCount: null, // use default
    customPalletLevel: 2, // 200ML VIT LOCAL 1X48
    isTransitArea: false,
    isDisabled: false,
    note: "200ML VIT LOCAL 1X48",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "cco-b-010",
    clusterConfigId: "cluster-b",
    lorongStart: 25,
    lorongEnd: 25,
    barisStart: null, // semua baris
    barisEnd: null, // semua baris
    customBarisCount: null, // use default
    customPalletLevel: 2, // 1500ML VIT LOCAL 1X12
    isTransitArea: false,
    isDisabled: false,
    note: "1500ML VIT LOCAL 1X12",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "cco-b-011",
    clusterConfigId: "cluster-b",
    lorongStart: 26,
    lorongEnd: 26,
    barisStart: null, // semua baris
    barisEnd: null, // semua baris
    customBarisCount: 6, // Lorong 26 hanya 6 baris untuk semua Reflections
    customPalletLevel: 1, // ALL REFLECTIONS (6 baris total, 1 pallet each)
    isTransitArea: false,
    isDisabled: false,
    note: "ALL REFLECTIONS - kapasitas terbatas",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },

  // Cluster C Overrides (In Transit Area)
  {
    id: "cco-c-001",
    clusterConfigId: "cluster-c",
    lorongStart: 10,
    lorongEnd: 16,
    barisStart: null, // semua baris
    barisEnd: null, // semua baris
    customBarisCount: null, // use default
    customPalletLevel: null, // use default
    isTransitArea: true, // Area in-transit/overflow
    isDisabled: false,
    note: "Area In Transit - buffer untuk overflow stock",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

// MOCK DATA: Product Home Assignments
export const productHomes: ProductHome[] = [
  {
    id: "ph-001",
    warehouseId: "wh-001-cikarang",
    productId: "prod-166126",
    clusterChar: "A",
    lorongStart: 1,
    lorongEnd: 3,
    barisStart: 1,
    barisEnd: 9, // Note: Lorong 1-2 only have 8 baris, Lorong 3 has 9
    maxPalletPerLocation: 2,
    priority: 1,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "ph-002",
    warehouseId: "wh-001-cikarang",
    productId: "prod-204579",
    clusterChar: "A",
    lorongStart: 4,
    lorongEnd: 5,
    barisStart: 1,
    barisEnd: 9,
    maxPalletPerLocation: 2,
    priority: 1,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "ph-003",
    warehouseId: "wh-001-cikarang",
    productId: "prod-74561",
    clusterChar: "A",
    lorongStart: 6,
    lorongEnd: 11,
    barisStart: 1,
    barisEnd: 9,
    maxPalletPerLocation: 3,
    priority: 1,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "ph-004",
    warehouseId: "wh-001-cikarang",
    productId: "prod-74553",
    clusterChar: "B",
    lorongStart: 1,
    lorongEnd: 6,
    barisStart: 1,
    barisEnd: 8,
    maxPalletPerLocation: 2,
    priority: 1,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "ph-005",
    warehouseId: "wh-001-cikarang",
    productId: "prod-74556",
    clusterChar: "B",
    lorongStart: 6,
    lorongEnd: 12, // Updated: Lorong 6-12 (overlaps with 1500ML di lorong 6)
    barisStart: 1,
    barisEnd: 8,
    maxPalletPerLocation: 3,
    priority: 1,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "ph-006",
    warehouseId: "wh-001-cikarang",
    productId: "prod-81681",
    clusterChar: "B",
    lorongStart: 13,
    lorongEnd: 16,
    barisStart: 1,
    barisEnd: 8,
    maxPalletPerLocation: 2,
    priority: 1,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "ph-007",
    warehouseId: "wh-001-cikarang",
    productId: "prod-142009",
    clusterChar: "B",
    lorongStart: 17,
    lorongEnd: 18,
    barisStart: 1,
    barisEnd: 8,
    maxPalletPerLocation: 2,
    priority: 1,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "ph-008",
    warehouseId: "wh-001-cikarang",
    productId: "prod-74589",
    clusterChar: "B",
    lorongStart: 19,
    lorongEnd: 20,
    barisStart: 1,
    barisEnd: 8,
    maxPalletPerLocation: 1,
    priority: 1,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "ph-009",
    warehouseId: "wh-001-cikarang",
    productId: "prod-124172",
    clusterChar: "B",
    lorongStart: 21,
    lorongEnd: 21,
    barisStart: 1,
    barisEnd: 8,
    maxPalletPerLocation: 1,
    priority: 1,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "ph-010",
    warehouseId: "wh-001-cikarang",
    productId: "prod-157095",
    clusterChar: "B",
    lorongStart: 22,
    lorongEnd: 22,
    barisStart: 1,
    barisEnd: 8,
    maxPalletPerLocation: 2,
    priority: 1,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "ph-011",
    warehouseId: "wh-001-cikarang",
    productId: "prod-112839",
    clusterChar: "B",
    lorongStart: 23,
    lorongEnd: 23,
    barisStart: 1,
    barisEnd: 8,
    maxPalletPerLocation: 2,
    priority: 1,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "ph-012",
    warehouseId: "wh-001-cikarang",
    productId: "prod-173022",
    clusterChar: "B",
    lorongStart: 24,
    lorongEnd: 24,
    barisStart: 1,
    barisEnd: 8,
    maxPalletPerLocation: 2,
    priority: 1,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "ph-013",
    warehouseId: "wh-001-cikarang",
    productId: "prod-74565",
    clusterChar: "B",
    lorongStart: 25,
    lorongEnd: 25,
    barisStart: 1,
    barisEnd: 8,
    maxPalletPerLocation: 2,
    priority: 1,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "ph-014",
    warehouseId: "wh-001-cikarang",
    productId: "prod-80333",
    clusterChar: "B",
    lorongStart: 26,
    lorongEnd: 26,
    barisStart: 1,
    barisEnd: 1, // 1 baris
    maxPalletPerLocation: 1,
    priority: 1,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "ph-015",
    warehouseId: "wh-001-cikarang",
    productId: "prod-174139",
    clusterChar: "B",
    lorongStart: 26,
    lorongEnd: 26,
    barisStart: 2,
    barisEnd: 2, // 1 baris
    maxPalletPerLocation: 1,
    priority: 1,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "ph-016",
    warehouseId: "wh-001-cikarang",
    productId: "prod-186452",
    clusterChar: "B",
    lorongStart: 26,
    lorongEnd: 26,
    barisStart: 3,
    barisEnd: 4, // 2 baris
    maxPalletPerLocation: 1,
    priority: 1,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "ph-017",
    warehouseId: "wh-001-cikarang",
    productId: "prod-174136",
    clusterChar: "B",
    lorongStart: 26,
    lorongEnd: 26,
    barisStart: 5,
    barisEnd: 5, // 1 baris
    maxPalletPerLocation: 1,
    priority: 1,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "ph-018",
    warehouseId: "wh-001-cikarang",
    productId: "prod-174138",
    clusterChar: "B",
    lorongStart: 26,
    lorongEnd: 26,
    barisStart: 6,
    barisEnd: 6, // 1 baris
    maxPalletPerLocation: 1,
    priority: 1,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  // Cluster C products (Mizone)
  {
    id: "ph-019",
    warehouseId: "wh-001-cikarang",
    productId: "prod-145141",
    clusterChar: "C",
    lorongStart: 1,
    lorongEnd: 3,
    barisStart: 1,
    barisEnd: 5,
    maxPalletPerLocation: 3,
    priority: 1,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "ph-020",
    warehouseId: "wh-001-cikarang",
    productId: "prod-145143",
    clusterChar: "C",
    lorongStart: 4,
    lorongEnd: 6,
    barisStart: 1,
    barisEnd: 5,
    maxPalletPerLocation: 3,
    priority: 1,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "ph-021",
    warehouseId: "wh-001-cikarang",
    productId: "prod-206774",
    clusterChar: "C",
    lorongStart: 7,
    lorongEnd: 9,
    barisStart: 1,
    barisEnd: 5,
    maxPalletPerLocation: 3,
    priority: 1,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  // Cluster D products (Galon AQUA 5 Liter) - Updated: Only 2 lorongs (L1-L2)
  {
    id: "ph-022",
    warehouseId: "wh-001-cikarang",
    productId: "prod-74559",
    clusterChar: "D",
    lorongStart: 1,
    lorongEnd: 1, // Strict: 1 lorong per product
    barisStart: 1,
    barisEnd: 5,
    maxPalletPerLocation: 1, // 1 pallet per baris
    priority: 1,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "ph-023",
    warehouseId: "wh-001-cikarang",
    productId: "prod-10169933",
    clusterChar: "D",
    lorongStart: 2,
    lorongEnd: 2, // Strict: 1 lorong per product
    barisStart: 1,
    barisEnd: 5,
    maxPalletPerLocation: 1,
    priority: 1,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  // Cluster E products (Galon VIT 5 Liter) - Updated: Only 2 lorongs (L1-L2)
  {
    id: "ph-024",
    warehouseId: "wh-001-cikarang",
    productId: "prod-74560",
    clusterChar: "E",
    lorongStart: 1,
    lorongEnd: 1, // Strict: 1 lorong per product
    barisStart: 1,
    barisEnd: 5,
    maxPalletPerLocation: 1,
    priority: 1,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "ph-025",
    warehouseId: "wh-001-cikarang",
    productId: "prod-10169932",
    clusterChar: "E",
    lorongStart: 2,
    lorongEnd: 2, // Strict: 1 lorong per product
    barisStart: 1,
    barisEnd: 5,
    maxPalletPerLocation: 1,
    priority: 1,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

// UTILITY FUNCTIONS

/**
 * Get cluster configuration by cluster name
 */
export function getClusterConfig(clusterChar: string): ClusterConfig | undefined {
  return clusterConfigs.find((c) => c.clusterChar === clusterChar && c.isActive);
}

/**
 * Get product home assignment by product ID
 */
export function getProductHome(productId: string): ProductHome | undefined {
  return productHomes.find((ph) => ph.productId === productId && ph.isActive);
}

/**
 * Get number of baris for a specific lorong in a cluster
 */
export function getBarisCountForLorong(clusterChar: string, lorong: number): number {
  const config = getClusterConfig(clusterChar);
  if (!config) return 0;

  // Check if this lorong has custom baris count
  const customLorong = config.customLorongConfig?.find(
    (cl) => lorong >= cl.lorongRange[0] && lorong <= cl.lorongRange[1]
  );

  return customLorong?.barisCount ?? config.defaultBarisCount;
}

/**
 * Get pallet capacity for a specific cell (cluster-lorong-baris)
 */
export function getPalletCapacityForCell(
  clusterChar: string,
  lorong: number,
  baris: number
): number {
  const config = getClusterConfig(clusterChar);
  if (!config) return 0;

  // Check custom cell config first (most specific)
  const customCell = config.customCellConfig?.find(
    (cc) =>
      lorong >= cc.lorongRange[0] &&
      lorong <= cc.lorongRange[1] &&
      baris >= cc.barisRange[0] &&
      baris <= cc.barisRange[1]
  );

  if (customCell) return customCell.palletPerSel;

  // Check custom lorong config
  const customLorong = config.customLorongConfig?.find(
    (cl) => lorong >= cl.lorongRange[0] && lorong <= cl.lorongRange[1]
  );

  if (customLorong?.palletPerSel) return customLorong.palletPerSel;

  // Return default
  return config.defaultPalletLevel;
}

/**
 * Validate if a product can be placed in a specific location
 */
export function validateProductLocation(
  productId: string,
  clusterChar: string,
  lorong: number,
  baris: number
): { isValid: boolean; reason?: string } {
  const productHome = getProductHome(productId);
  
  if (!productHome) {
    return { isValid: true }; // No restriction if product home not defined
  }

  // Check cluster
  if (productHome.clusterChar !== clusterChar) {
    return {
      isValid: false,
      reason: `Product ${productId} can only be stored in Cluster ${productHome.clusterChar}`,
    };
  }

  // Check lorong range
  if (
    lorong < productHome.lorongStart ||
    lorong > productHome.lorongEnd
  ) {
    return {
      isValid: false,
      reason: `Product ${productId} can only be stored in Lorong ${productHome.lorongStart}-${productHome.lorongEnd}`,
    };
  }

  // Check baris range
  if (
    baris < productHome.barisStart ||
    baris > productHome.barisEnd
  ) {
    return {
      isValid: false,
      reason: `Product ${productId} can only be stored in Baris ${productHome.barisStart}-${productHome.barisEnd}`,
    };
  }

  return { isValid: true };
}

/**
 * Get all valid locations for a product
 */
export function getValidLocationsForProduct(productId: string): {
  clusterChar: string;
  lorongRange: [number, number];
  barisRange: [number, number];
  maxPalletPerLocation: number;
} | null {
  const productHome = getProductHome(productId);
  
  if (!productHome) return null;

  return {
    clusterChar: productHome.clusterChar,
    lorongRange: [productHome.lorongStart, productHome.lorongEnd],
    barisRange: [productHome.barisStart, productHome.barisEnd],
    maxPalletPerLocation: productHome.maxPalletPerLocation,
  };
}

/**
 * Check if a location is in In Transit area (buffer/overflow area)
 */
export function isInTransitLocation(clusterChar: string, lorong: number): boolean {
  const config = getClusterConfig(clusterChar);
  if (!config || !config.inTransitLorongRange) return false;
  
  return lorong >= config.inTransitLorongRange[0] && lorong <= config.inTransitLorongRange[1];
}

/**
 * Get In Transit lorong range for a cluster
 */
export function getInTransitRange(clusterChar: string): [number, number] | null {
  const config = getClusterConfig(clusterChar);
  return config?.inTransitLorongRange ?? null;
}

/**
 * Validate product location with In Transit logic
 * In Transit area can accept any product as overflow/buffer
 */
export function validateProductLocationWithTransit(
  productId: string,
  clusterChar: string,
  lorong: number,
  baris: number
): { isValid: boolean; reason?: string; isInTransit?: boolean } {
  // First check if it's in In Transit area
  if (isInTransitLocation(clusterChar, lorong)) {
    return { 
      isValid: true, 
      isInTransit: true,
      reason: "In Transit area - temporary overflow storage"
    };
  }
  
  // If not in transit, use normal validation
  const normalValidation = validateProductLocation(productId, clusterChar, lorong, baris);
  return { ...normalValidation, isInTransit: false };
}
