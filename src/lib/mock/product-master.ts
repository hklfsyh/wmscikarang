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
  // Produk Cluster A
  {
    id: "PM001",
    productCode: "166126",
    productName: "220ML AQUA CUBE MINI BOTTLE LOCAL 1X24",
    qtyPerCarton: 24,
    qtyPerPallet: 108,
    defaultCluster: "A",
  },
  {
    id: "PM002",
    productCode: "204579",
    productName: "200ML AQUA LOCAL 1X48",
    qtyPerCarton: 48,
    qtyPerPallet: 48,
    defaultCluster: "A",
  },
  {
    id: "PM003",
    productCode: "74561",
    productName: "600ML AQUA LOCAL 1X24",
    qtyPerCarton: 24,
    qtyPerPallet: 40,
    defaultCluster: "A",
  },
  
  // Produk Cluster B
  {
    id: "PM004",
    productCode: "74553",
    productName: "1500ML AQUA LOCAL 1X12",
    qtyPerCarton: 12,
    qtyPerPallet: 70,
    defaultCluster: "B",
  },
  {
    id: "PM005",
    productCode: "74556",
    productName: "330ML AQUA LOCAL 1X24",
    qtyPerCarton: 24,
    qtyPerPallet: 65,
    defaultCluster: "B",
  },
  {
    id: "PM006",
    productCode: "81681",
    productName: "750ML AQUA LOCAL 1X18",
    qtyPerCarton: 18,
    qtyPerPallet: 40,
    defaultCluster: "B",
  },
  {
    id: "PM007",
    productCode: "142009",
    productName: "1100ML AQUA LOCAL 1X12 BARCODE ON CAP",
    qtyPerCarton: 12,
    qtyPerPallet: 42,
    defaultCluster: "B",
  },
  {
    id: "PM008",
    productCode: "74589",
    productName: "1500ML AQUA LOCAL MULTIPACK 1X6",
    qtyPerCarton: 6,
    qtyPerPallet: 112,
    defaultCluster: "B",
  },
  {
    id: "PM009",
    productCode: "124172",
    productName: "600ML AQUA LOCAL MULTIPACK 1X6",
    qtyPerCarton: 6,
    qtyPerPallet: 160,
    defaultCluster: "B",
  },
  {
    id: "PM010",
    productCode: "157095",
    productName: "550ML VIT LOCAL 1X24",
    qtyPerCarton: 24,
    qtyPerPallet: 40,
    defaultCluster: "B",
  },
  {
    id: "PM011",
    productCode: "112839",
    productName: "330ML VIT LOCAL 1X24",
    qtyPerCarton: 24,
    qtyPerPallet: 65,
    defaultCluster: "B",
  },
  {
    id: "PM012",
    productCode: "173022",
    productName: "200ML VIT LOCAL 1X48",
    qtyPerCarton: 48,
    qtyPerPallet: 48,
    defaultCluster: "B",
  },
  {
    id: "PM013",
    productCode: "74565",
    productName: "1500ML VIT LOCAL 1X12",
    qtyPerCarton: 12,
    qtyPerPallet: 33,
    defaultCluster: "B",
  },
  {
    id: "PM014",
    productCode: "80333",
    productName: "380ML AQUA REFLECTIONS SPARKLING 1X12",
    qtyPerCarton: 12,
    qtyPerPallet: 90,
    defaultCluster: "B",
  },
  {
    id: "PM015",
    productCode: "174139",
    productName: "380ML AQUA REFLECTIONS BAL 1X12",
    qtyPerCarton: 12,
    qtyPerPallet: 90,
    defaultCluster: "B",
  },
  {
    id: "PM016",
    productCode: "186452",
    productName: "380ML AQUA REFLECTIONS SBUX BAL 1X12",
    qtyPerCarton: 12,
    qtyPerPallet: 90,
    defaultCluster: "B",
  },
  {
    id: "PM017",
    productCode: "174136",
    productName: "750ML AQUA SPARKLING BAL 1X6",
    qtyPerCarton: 6,
    qtyPerPallet: 100,
    defaultCluster: "B",
  },
  {
    id: "PM018",
    productCode: "174138",
    productName: "750ML AQUA REFLECTIONS BAL 1X6",
    qtyPerCarton: 6,
    qtyPerPallet: 100,
    defaultCluster: "B",
  },
  
  // Produk Cluster C (Mizone)
  {
    id: "PM019",
    productCode: "145141",
    productName: "500ML MIZONE ACTIV LYCHEE LEMON 1X12",
    qtyPerCarton: 12,
    qtyPerPallet: 84,
    defaultCluster: "C",
  },
  {
    id: "PM020",
    productCode: "206774",
    productName: "500ML MIZONE COCO BOOST 1X12",
    qtyPerCarton: 12,
    qtyPerPallet: 84,
    defaultCluster: "C",
  },
  {
    id: "PM021",
    productCode: "145143",
    productName: "500ML MIZONE MOOD UP CRANBERRY 1X12",
    qtyPerCarton: 12,
    qtyPerPallet: 84,
    defaultCluster: "C",
  },
  
  // 5 Gallon - Cluster D (AQUA)
  {
    id: "PM022",
    productCode: "74559",
    productName: "5 GALLON AQUA LOCAL",
    qtyPerCarton: 1,
    qtyPerPallet: 48,
    defaultCluster: "D",
  },
  {
    id: "PM023",
    productCode: "10169933",
    productName: "EMPTY BOTTLE AQUA 5 GALLON",
    qtyPerCarton: 1,
    qtyPerPallet: 48,
    defaultCluster: "D",
  },
  
  // 5 Gallon - Cluster E (VIT)
  {
    id: "PM024",
    productCode: "74560",
    productName: "5 GALLON VIT LOCAL",
    qtyPerCarton: 1,
    qtyPerPallet: 48,
    defaultCluster: "E",
  },
  {
    id: "PM025",
    productCode: "10169932",
    productName: "EMPTY BOTTLE VIT 5 GALLON",
    qtyPerCarton: 1,
    qtyPerPallet: 48,
    defaultCluster: "E",
  },
  
  // Produk Baru
  {
    id: "PM026",
    productCode: "10481618",
    productName: "TISSUE AQUA V.4",
    qtyPerCarton: 1,
    qtyPerPallet: 0,
  },
  {
    id: "PM027",
    productCode: "10516937",
    productName: "JUG AQUA 19L PC 55 MM",
    qtyPerCarton: 1,
    qtyPerPallet: 48,
  },
  {
    id: "PM028",
    productCode: "10516939",
    productName: "JUG VIT 19L PC 55 MM",
    qtyPerCarton: 1,
    qtyPerPallet: 48,
  },
  
  // Produk duplikat yang digabung (174137 = sama dengan 174136 AQUA SPARKLING)
  {
    id: "PM029",
    productCode: "174137",
    productName: "380ML AQUA SPARKLING BAL 1X12",
    qtyPerCarton: 12,
    qtyPerPallet: 90,
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