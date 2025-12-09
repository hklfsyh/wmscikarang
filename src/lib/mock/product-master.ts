// Master Data Produk & Ekspedisi
// File: src/lib/mock/product-master.ts

// 1. Master Data Ekspedisi (HGS, SJP, SMR, SMJ, MDI, MIR)
export const ekspedisiMaster: { code: string; name: string }[] = [
  { code: "HGS", name: "HGS" },
  { code: "SJP", name: "SJP" },
  { code: "SMR", name: "SMR" },
  { code: "SMJ", name: "SMJ" },
  { code: "MDI", name: "MDI" },
  { code: "MIR", name: "MIR" },
];

// 2. Interface Baru untuk Produk (dengan Qty/Pallet)
// Dibuat sederhana agar mudah di-mock
export interface ProductMaster {
  id: string;
  productCode: string;
  productName: string;
  qtyPerCarton: number; // Qty per karton (pcs/unit per carton)
  qtyPerPallet: number; // Qty Produk/Pallet: 1 pallet = berapa CARTON (dari master baru klien)
  defaultCluster?: string; // Cluster yang direkomendasikan
  // Per-product conversion: 1 pallet = qtyPerPallet cartons
}

// 3. Data Produk Baru
export const productMasterData: ProductMaster[] = [
  // Produk Cluster A (sesuai screenshot)
  {
    id: "PM001",
    productCode: "AQ-220-CUBE-24",
    productName: "220ML AQUA CUBE MINI BOTTLE LOCAL 1X24",
    qtyPerCarton: 24,
    qtyPerPallet: 108,
    defaultCluster: "A",
  },
  {
    id: "PM002",
    productCode: "AQ-200-LOC-48",
    productName: "200ML AQUA LOCAL 1X48",
    qtyPerCarton: 48,
    qtyPerPallet: 48,
    defaultCluster: "A",
  },
  {
    id: "PM003",
    productCode: "AQ-600-LOC-24",
    productName: "600ML AQUA LOCAL 1X24",
    qtyPerCarton: 24,
    qtyPerPallet: 40,
    defaultCluster: "A",
  },
  
  // Produk Cluster B (sesuai screenshot)
  {
    id: "PM004",
    productCode: "AQ-1500ML",
    productName: "1500ML AQUA LOCAL 1X12",
    qtyPerCarton: 12,
    qtyPerPallet: 70,
    defaultCluster: "B",
  },
  {
    id: "PM005",
    productCode: "AQ-330ML",
    productName: "330ML AQUA LOCAL 1X24",
    qtyPerCarton: 24,
    qtyPerPallet: 65,
    defaultCluster: "B",
  },
  {
    id: "PM006",
    productCode: "AQ-750ML",
    productName: "750ML AQUA LOCAL 1X18",
    qtyPerCarton: 18,
    qtyPerPallet: 40,
    defaultCluster: "B",
  },
  {
    id: "PM007",
    productCode: "AQ-1100ML-BC",
    productName: "1100ML AQUA LOCAL 1X12 BARCODE ON CAP",
    qtyPerCarton: 12,
    qtyPerPallet: 42,
    defaultCluster: "B",
  },
  {
    id: "PM008",
    productCode: "AQ-1500ML-MP",
    productName: "1500ML AQUA LOCAL MULTIPACK 1X6",
    qtyPerCarton: 6,
    qtyPerPallet: 112,
    defaultCluster: "B",
  },
  {
    id: "PM009",
    productCode: "AQ-600ML-MP",
    productName: "600ML AQUA LOCAL MULTIPACK 1X6",
    qtyPerCarton: 6,
    qtyPerPallet: 160,
    defaultCluster: "B",
  },
  {
    id: "PM010",
    productCode: "VIT-550ML",
    productName: "550ML VIT LOCAL 1X24",
    qtyPerCarton: 24,
    qtyPerPallet: 40,
    defaultCluster: "B",
  },
  {
    id: "PM011",
    productCode: "VIT-330ML",
    productName: "330ML VIT LOCAL 1X24",
    qtyPerCarton: 24,
    qtyPerPallet: 65,
    defaultCluster: "B",
  },
  {
    id: "PM012",
    productCode: "VIT-200ML",
    productName: "200ML VIT LOCAL 1X48",
    qtyPerCarton: 48,
    qtyPerPallet: 48,
    defaultCluster: "B",
  },
  {
    id: "PM013",
    productCode: "VIT-1500ML",
    productName: "1500ML VIT LOCAL 1X12",
    qtyPerCarton: 12,
    qtyPerPallet: 33,
    defaultCluster: "B",
  },
  {
    id: "PM014",
    productCode: "AQ-380-SPARK",
    productName: "380ML AQUA REFLECTIONS SPARKLING 1X12",
    qtyPerCarton: 12,
    qtyPerPallet: 90,
    defaultCluster: "B",
  },
  {
    id: "PM015",
    productCode: "AQ-380-BAL",
    productName: "380ML AQUA REFLECTIONS BAL 1X12",
    qtyPerCarton: 12,
    qtyPerPallet: 90,
    defaultCluster: "B",
  },
  {
    id: "PM016",
    productCode: "AQ-380-SBUX",
    productName: "380ML AQUA REFLECTIONS SBUX BAL 1X12",
    qtyPerCarton: 12,
    qtyPerPallet: 90,
    defaultCluster: "B",
  },
  {
    id: "PM017",
    productCode: "AQ-750-SPARK-BAL",
    productName: "750ML AQUA SPARKLING BAL 1X6",
    qtyPerCarton: 6,
    qtyPerPallet: 100,
    defaultCluster: "B",
  },
  {
    id: "PM018",
    productCode: "AQ-750-REF-BAL",
    productName: "750ML AQUA REFLECTIONS BAL 1X6",
    qtyPerCarton: 6,
    qtyPerPallet: 100,
    defaultCluster: "B",
  },
  
  // Produk Cluster C-E
  {
    id: "PM018",
    productCode: "VIT-330-CAN-24",
    productName: "330ML VIT CAN 1X24",
    qtyPerCarton: 24,
    qtyPerPallet: 65,
    defaultCluster: "C",
  },
  {
    id: "PM019",
    productCode: "TEH-350-BTL-12",
    productName: "350ML TEH BOTOL SOSRO 1X12",
    qtyPerCarton: 12,
    qtyPerPallet: 84,
    defaultCluster: "D",
  },
  
  // Produk tambahan
  { id: "PM020", productCode: "AQ-RFL-380ML-BAL", productName: "380ML AQUA REFLECTIONS BAL 1X12", qtyPerCarton: 12, qtyPerPallet: 90 },
  { id: "PM021", productCode: "AQ-RFL-SBUX", productName: "380ML AQUA REFLECTIONS SBUX BAL 1X12", qtyPerCarton: 12, qtyPerPallet: 90 },
  { id: "PM022", productCode: "AQ-RFL-SPK", productName: "380ML AQUA REFLECTIONS SPARKLING 1X12", qtyPerCarton: 12, qtyPerPallet: 90 },
  { id: "PM023", productCode: "AQ-SPK-380ML-BAL", productName: "380ML AQUA SPARKLING BAL 1X12", qtyPerCarton: 12, qtyPerPallet: 90 },
  { id: "PM024", productCode: "MIZ-ACTIV", productName: "500ML MIZONE ACTIV LYCHEE LEMON 1X12", qtyPerCarton: 12, qtyPerPallet: 84, defaultCluster: "C" },
  { id: "PM025", productCode: "MIZ-COCO", productName: "500ML MIZONE COCO BOOST 1X12", qtyPerCarton: 12, qtyPerPallet: 84, defaultCluster: "C" },
  { id: "PM026", productCode: "MIZ-MOOD", productName: "500ML MIZONE MOOD UP CRANBERRY 1X12", qtyPerCarton: 12, qtyPerPallet: 84, defaultCluster: "C" },
  { id: "PM027", productCode: "AQ-600ML", productName: "600ML AQUA LOCAL 1X24", qtyPerCarton: 24, qtyPerPallet: 40 },
  // 5 Gallon - Cluster D (AQUA)
  { id: "PM028", productCode: "AQ-5GAL", productName: "5 GALLON AQUA LOCAL", qtyPerCarton: 1, qtyPerPallet: 48, defaultCluster: "D" },
  { id: "PM029", productCode: "AQ-5GAL-RETUR", productName: "5 GALLON AQUA LOCAL RETUR", qtyPerCarton: 1, qtyPerPallet: 48, defaultCluster: "D" },
  { id: "PM032", productCode: "AQ-EMPTY-5GAL", productName: "EMPTY BOTTLE AQUA 5 GALLON", qtyPerCarton: 1, qtyPerPallet: 48, defaultCluster: "D" },
  // 5 Gallon - Cluster E (VIT)
  { id: "PM030", productCode: "VIT-5GAL", productName: "5 GALLON VIT LOCAL", qtyPerCarton: 1, qtyPerPallet: 48, defaultCluster: "E" },
  { id: "PM031", productCode: "VIT-5GAL-RETUR", productName: "5 GALLON VIT LOCAL RETUR", qtyPerCarton: 1, qtyPerPallet: 48, defaultCluster: "E" },
  { id: "PM033", productCode: "VIT-EMPTY-5GAL", productName: "EMPTY BOTTLE VIT 5 GALLON", qtyPerCarton: 1, qtyPerPallet: 48, defaultCluster: "E" },
];

// Helper function untuk mendapatkan produk by code
export const getProductByCode = (productCode: string): ProductMaster | undefined => {
  return productMasterData.find(p => p.productCode === productCode);
};

// Helper function untuk mendapatkan produk by id
export const getProductById = (id: string): ProductMaster | undefined => {
  return productMasterData.find(p => p.id === id);
};