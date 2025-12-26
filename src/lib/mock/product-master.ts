// Master Data Produk & Ekspedisi
// File: src/lib/mock/product-master.ts
// Simulasi tabel: products, expeditions, warehouses dari database-schema.dbml

// ========== WAREHOUSES TABLE MOCK ==========
export interface Warehouse {
  id: string;
  warehouseCode: string;
  cityName: string;
  address: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const warehousesMock: Warehouse[] = [
  {
    id: "wh-001-cikarang",
    warehouseCode: "WH-CKR",
    cityName: "Cikarang",
    address: "Jl. Industri Raya No. 123, Cikarang, Bekasi",
    phone: "021-12345678",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "wh-002-bandung",
    warehouseCode: "WH-BDG",
    cityName: "Bandung",
    address: "Jl. Soekarno Hatta No. 456, Bandung",
    phone: "022-87654321",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

// ========== EXPEDITIONS TABLE MOCK ==========
export interface Expedition {
  id: string;
  warehouseId: string;
  expeditionCode: string;
  expeditionName: string;
  contactPerson: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const expeditionsMock: Expedition[] = [
  // Cikarang Expeditions
  {
    id: "exp-ckr-001",
    warehouseId: "wh-001-cikarang",
    expeditionCode: "HGS",
    expeditionName: "HGS",
    contactPerson: "HGS",
    phone: "081234567890",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "exp-ckr-002",
    warehouseId: "wh-001-cikarang",
    expeditionCode: "SJP",
    expeditionName: "SJP",
    contactPerson: "SJP",
    phone: "081234567891",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "exp-ckr-003",
    warehouseId: "wh-001-cikarang",
    expeditionCode: "SMR",
    expeditionName: "SMR",
    contactPerson: "SMR",
    phone: "081234567892",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "exp-ckr-004",
    warehouseId: "wh-001-cikarang",
    expeditionCode: "SMJ",
    expeditionName: "SMJ",
    contactPerson: "SMJ",
    phone: "081234567893",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "exp-ckr-005",
    warehouseId: "wh-001-cikarang",
    expeditionCode: "MDI",
    expeditionName: "MDI",
    contactPerson: "MDI",
    phone: "081234567894",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "exp-ckr-006",
    warehouseId: "wh-001-cikarang",
    expeditionCode: "MIR",
    expeditionName: "MIR",
    contactPerson: "MIR",
    phone: "081234567895",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  // Bandung Expeditions
  {
    id: "exp-bdg-001",
    warehouseId: "wh-002-bandung",
    expeditionCode: "HGS",
    expeditionName: "HGS",
    contactPerson: "HGS",
    phone: "082234567890",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "exp-bdg-002",
    warehouseId: "wh-002-bandung",
    expeditionCode: "SJP",
    expeditionName: "SJP",
    contactPerson: "SJP",
    phone: "082234567891",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "exp-bdg-003",
    warehouseId: "wh-002-bandung",
    expeditionCode: "SMR",
    expeditionName: "SMR",
    contactPerson: "SMR",
    phone: "082234567892",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "exp-bdg-004",
    warehouseId: "wh-002-bandung",
    expeditionCode: "SMJ",
    expeditionName: "SMJ",
    contactPerson: "SMJ",
    phone: "082234567893",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "exp-bdg-005",
    warehouseId: "wh-002-bandung",
    expeditionCode: "MDI",
    expeditionName: "MDI",
    contactPerson: "MDI",
    phone: "082234567894",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "exp-bdg-006",
    warehouseId: "wh-002-bandung",
    expeditionCode: "MIR",
    expeditionName: "MIR",
    contactPerson: "MIR",
    phone: "082234567895",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

// Legacy support - untuk backward compatibility
export const ekspedisiMaster: { code: string; name: string }[] = [
  { code: "HGS", name: "HGS" },
  { code: "SJP", name: "SJP" },
  { code: "SMR", name: "SMR" },
  { code: "SMJ", name: "SMJ" },
  { code: "MDI", name: "MDI" },
  { code: "MIR", name: "MIR" },
];

// ========== PRODUCTS TABLE MOCK ==========
export interface ProductMaster {
  id: string;
  warehouseId: string; // NEW: Per-warehouse products
  productCode: string;
  productName: string;
  category: string; // NEW: Product category
  unit: string; // NEW: Unit of measurement
  qtyPerCarton: number; // Qty per karton (pcs/unit per carton)
  qtyCartonPerPallet: number; // RENAMED from qtyPerPallet: Qty carton per pallet
  defaultCluster: string | null; // Cluster yang direkomendasikan
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 3. Data Produk Baru (PER-WAREHOUSE)
export const productMasterData: ProductMaster[] = [
  // ===== CIKARANG WAREHOUSE PRODUCTS =====
  // Produk Cluster A - Cikarang
  {
    id: "prod-ckr-001",
    warehouseId: "wh-001-cikarang",
    productCode: "166126",
    productName: "220ML AQUA CUBE MINI BOTTLE LOCAL 1X24",
    category: "AQUA",
    unit: "carton",
    qtyPerCarton: 24,
    qtyCartonPerPallet: 108,
    defaultCluster: "A",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "prod-ckr-002",
    warehouseId: "wh-001-cikarang",
    productCode: "204579",
    productName: "200ML AQUA LOCAL 1X48",
    category: "AQUA",
    unit: "carton",
    qtyPerCarton: 48,
    qtyCartonPerPallet: 48,
    defaultCluster: "A",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "prod-ckr-003",
    warehouseId: "wh-001-cikarang",
    productCode: "74561",
    productName: "600ML AQUA LOCAL 1X24",
    category: "AQUA",
    unit: "carton",
    qtyPerCarton: 24,
    qtyCartonPerPallet: 40,
    defaultCluster: "A",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  
  // Produk Cluster B - Cikarang
  {
    id: "prod-ckr-004",
    warehouseId: "wh-001-cikarang",
    productCode: "74553",
    productName: "1500ML AQUA LOCAL 1X12",
    category: "AQUA",
    unit: "carton",
    qtyPerCarton: 12,
    qtyCartonPerPallet: 70,
    defaultCluster: "B",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "prod-ckr-005",
    warehouseId: "wh-001-cikarang",
    productCode: "74556",
    productName: "330ML AQUA LOCAL 1X24",
    category: "AQUA",
    unit: "carton",
    qtyPerCarton: 24,
    qtyCartonPerPallet: 65,
    defaultCluster: "B",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "prod-ckr-006",
    warehouseId: "wh-001-cikarang",
    productCode: "81681",
    productName: "750ML AQUA LOCAL 1X18",
    category: "AQUA",
    unit: "carton",
    qtyPerCarton: 18,
    qtyCartonPerPallet: 40,
    defaultCluster: "B",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "prod-ckr-007",
    warehouseId: "wh-001-cikarang",
    productCode: "142009",
    productName: "1100ML AQUA LOCAL 1X12 BARCODE ON CAP",
    category: "AQUA",
    unit: "carton",
    qtyPerCarton: 12,
    qtyCartonPerPallet: 42,
    defaultCluster: "B",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "prod-ckr-008",
    warehouseId: "wh-001-cikarang",
    productCode: "74589",
    productName: "1500ML AQUA LOCAL MULTIPACK 1X6",
    category: "AQUA",
    unit: "carton",
    qtyPerCarton: 6,
    qtyCartonPerPallet: 112,
    defaultCluster: "B",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "prod-ckr-009",
    warehouseId: "wh-001-cikarang",
    productCode: "124172",
    productName: "600ML AQUA LOCAL MULTIPACK 1X6",
    category: "AQUA",
    unit: "carton",
    qtyPerCarton: 6,
    qtyCartonPerPallet: 160,
    defaultCluster: "B",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "prod-ckr-010",
    warehouseId: "wh-001-cikarang",
    productCode: "157095",
    productName: "550ML VIT LOCAL 1X24",
    category: "VIT",
    unit: "carton",
    qtyPerCarton: 24,
    qtyCartonPerPallet: 40,
    defaultCluster: "B",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "prod-ckr-011",
    warehouseId: "wh-001-cikarang",
    productCode: "112839",
    productName: "330ML VIT LOCAL 1X24",
    category: "VIT",
    unit: "carton",
    qtyPerCarton: 24,
    qtyCartonPerPallet: 65,
    defaultCluster: "B",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "prod-ckr-012",
    warehouseId: "wh-001-cikarang",
    productCode: "173022",
    productName: "200ML VIT LOCAL 1X48",
    category: "VIT",
    unit: "carton",
    qtyPerCarton: 48,
    qtyCartonPerPallet: 48,
    defaultCluster: "B",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "prod-ckr-013",
    warehouseId: "wh-001-cikarang",
    productCode: "74565",
    productName: "1500ML VIT LOCAL 1X12",
    category: "VIT",
    unit: "carton",
    qtyPerCarton: 12,
    qtyCartonPerPallet: 33,
    defaultCluster: "B",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "prod-ckr-014",
    warehouseId: "wh-001-cikarang",
    productCode: "80333",
    productName: "380ML AQUA REFLECTIONS SPARKLING 1X12",
    category: "AQUA",
    unit: "carton",
    qtyPerCarton: 12,
    qtyCartonPerPallet: 90,
    defaultCluster: "B",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "prod-ckr-015",
    warehouseId: "wh-001-cikarang",
    productCode: "174139",
    productName: "380ML AQUA REFLECTIONS BAL 1X12",
    category: "AQUA",
    unit: "carton",
    qtyPerCarton: 12,
    qtyCartonPerPallet: 90,
    defaultCluster: "B",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "prod-ckr-016",
    warehouseId: "wh-001-cikarang",
    productCode: "186452",
    productName: "380ML AQUA REFLECTIONS SBUX BAL 1X12",
    category: "AQUA",
    unit: "carton",
    qtyPerCarton: 12,
    qtyCartonPerPallet: 90,
    defaultCluster: "B",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "prod-ckr-017",
    warehouseId: "wh-001-cikarang",
    productCode: "174136",
    productName: "750ML AQUA SPARKLING BAL 1X6",
    category: "AQUA",
    unit: "carton",
    qtyPerCarton: 6,
    qtyCartonPerPallet: 100,
    defaultCluster: "B",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "prod-ckr-018",
    warehouseId: "wh-001-cikarang",
    productCode: "174138",
    productName: "750ML AQUA REFLECTIONS BAL 1X6",
    category: "AQUA",
    unit: "carton",
    qtyPerCarton: 6,
    qtyCartonPerPallet: 100,
    defaultCluster: "B",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "prod-ckr-019",
    warehouseId: "wh-001-cikarang",
    productCode: "174137",
    productName: "380ML AQUA SPARKLING BAL 1X12",
    category: "AQUA",
    unit: "carton",
    qtyPerCarton: 12,
    qtyCartonPerPallet: 90,
    defaultCluster: "B",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  
  // Produk Cluster C (Mizone) - Cikarang
  {
    id: "prod-ckr-020",
    warehouseId: "wh-001-cikarang",
    productCode: "145141",
    productName: "500ML MIZONE ACTIV LYCHEE LEMON 1X12",
    category: "MIZONE",
    unit: "carton",
    qtyPerCarton: 12,
    qtyCartonPerPallet: 84,
    defaultCluster: "C",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "prod-ckr-021",
    warehouseId: "wh-001-cikarang",
    productCode: "206774",
    productName: "500ML MIZONE COCO BOOST 1X12",
    category: "MIZONE",
    unit: "carton",
    qtyPerCarton: 12,
    qtyCartonPerPallet: 84,
    defaultCluster: "C",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "prod-ckr-022",
    warehouseId: "wh-001-cikarang",
    productCode: "145143",
    productName: "500ML MIZONE MOOD UP CRANBERRY 1X12",
    category: "MIZONE",
    unit: "carton",
    qtyPerCarton: 12,
    qtyCartonPerPallet: 84,
    defaultCluster: "C",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  
  // 5 Gallon - Cluster D (AQUA) - Cikarang
  {
    id: "prod-ckr-023",
    warehouseId: "wh-001-cikarang",
    productCode: "74559",
    productName: "5 GALLON AQUA LOCAL",
    category: "GALON",
    unit: "carton",
    qtyPerCarton: 1,
    qtyCartonPerPallet: 48,
    defaultCluster: "D",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "prod-ckr-024",
    warehouseId: "wh-001-cikarang",
    productCode: "10169933",
    productName: "EMPTY BOTTLE AQUA 5 GALLON",
    category: "GALON",
    unit: "carton",
    qtyPerCarton: 1,
    qtyCartonPerPallet: 48,
    defaultCluster: "D",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  
  // 5 Gallon - Cluster E (VIT) - Cikarang
  {
    id: "prod-ckr-025",
    warehouseId: "wh-001-cikarang",
    productCode: "74560",
    productName: "5 GALLON VIT LOCAL",
    category: "GALON",
    unit: "carton",
    qtyPerCarton: 1,
    qtyCartonPerPallet: 48,
    defaultCluster: "E",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "prod-ckr-026",
    warehouseId: "wh-001-cikarang",
    productCode: "10169932",
    productName: "EMPTY BOTTLE VIT 5 GALLON",
    category: "GALON",
    unit: "carton",
    qtyPerCarton: 1,
    qtyCartonPerPallet: 48,
    defaultCluster: "E",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  
  // Produk Baru - Cikarang
  {
    id: "prod-ckr-027",
    warehouseId: "wh-001-cikarang",
    productCode: "10481618",
    productName: "TISSUE AQUA V.4",
    category: "AQUA",
    unit: "carton",
    qtyPerCarton: 1,
    qtyCartonPerPallet: 50,
    defaultCluster: null,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "prod-ckr-028",
    warehouseId: "wh-001-cikarang",
    productCode: "10516937",
    productName: "JUG AQUA 19L PC 55 MM",
    category: "GALON",
    unit: "carton",
    qtyPerCarton: 1,
    qtyCartonPerPallet: 48,
    defaultCluster: "D",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "prod-ckr-029",
    warehouseId: "wh-001-cikarang",
    productCode: "10516939",
    productName: "JUG VIT 19L PC 55 MM",
    category: "GALON",
    unit: "carton",
    qtyPerCarton: 1,
    qtyCartonPerPallet: 48,
    defaultCluster: "E",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },

  // ===== BANDUNG WAREHOUSE PRODUCTS =====
  // Produk Cluster A - Bandung
  {
    id: "prod-bdg-001",
    warehouseId: "wh-002-bandung",
    productCode: "166126",
    productName: "220ML AQUA CUBE MINI BOTTLE LOCAL 1X24",
    category: "AQUA",
    unit: "carton",
    qtyPerCarton: 24,
    qtyCartonPerPallet: 108,
    defaultCluster: "A",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "prod-bdg-002",
    warehouseId: "wh-002-bandung",
    productCode: "204579",
    productName: "200ML AQUA LOCAL 1X48",
    category: "AQUA",
    unit: "carton",
    qtyPerCarton: 48,
    qtyCartonPerPallet: 48,
    defaultCluster: "A",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "prod-bdg-003",
    warehouseId: "wh-002-bandung",
    productCode: "74561",
    productName: "600ML AQUA LOCAL 1X24",
    category: "AQUA",
    unit: "carton",
    qtyPerCarton: 24,
    qtyCartonPerPallet: 40,
    defaultCluster: "A",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  
  // Produk Cluster B - Bandung
  {
    id: "prod-bdg-004",
    warehouseId: "wh-002-bandung",
    productCode: "74553",
    productName: "1500ML AQUA LOCAL 1X12",
    category: "AQUA",
    unit: "carton",
    qtyPerCarton: 12,
    qtyCartonPerPallet: 70,
    defaultCluster: "B",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "prod-bdg-005",
    warehouseId: "wh-002-bandung",
    productCode: "145141",
    productName: "500ML MIZONE ACTIV LYCHEE LEMON 1X12",
    category: "MIZONE",
    unit: "carton",
    qtyPerCarton: 12,
    qtyCartonPerPallet: 84,
    defaultCluster: "B",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

// Helper function untuk mendapatkan produk by code
export const getProductByCode = (productCode: string): ProductMaster | undefined => {
  return productMasterData.find(p => p.productCode === productCode);
};

// Helper function untuk mendapatkan produk by id
export const getProductById = (id: string): ProductMaster | undefined => {
  return productMasterData.find(p => p.id === id);
};

// Helper function untuk mendapatkan produk by warehouse
export const getProductsByWarehouse = (warehouseId: string): ProductMaster[] => {
  return productMasterData.filter(p => p.warehouseId === warehouseId);
};

// Helper function untuk mendapatkan ekspedisi by warehouse
export const getExpeditionsByWarehouse = (warehouseId: string): Expedition[] => {
  return expeditionsMock.filter(e => e.warehouseId === warehouseId);
};

// Helper function untuk mendapatkan warehouse by id
export const getWarehouseById = (id: string): Warehouse | undefined => {
  return warehousesMock.find(w => w.id === id);
};
