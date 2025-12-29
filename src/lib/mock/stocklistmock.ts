// File: src/lib/mock/stocklistmock.ts (UPDATED - Teratur)

// Stock List Mock Data - Data barang yang sudah ada di gudang
// Data diatur untuk simulasi kondisi gudang yang teratur di 2 lorong pertama
// Setiap record punya expired date untuk FEFO

// --- START: Perubahan Import ---
import { productMasterData } from "@/lib/mock/product-master";
import { validateProductLocation, isInTransitLocation } from "@/lib/mock/warehouse-config";
// --- END: Perubahan Import ---

// Stock Item Interface - Aligned with database schema stock_list table
export interface StockItem {
  id: string; // UUID
  warehouseId: string; // UUID - reference to warehouses.id
  productId: string; // UUID - reference to products.id
  
  // Identifikasi - BB Produk WAJIB (10 digit, TIDAK BOLEH LEBIH)
  bbProduk: string; // varchar(10) - Format: YYMMDDXXXX
  
  // Lokasi Fisik - separate fields (NOT nested object)
  cluster: string; // char(1)
  lorong: number; // integer
  baris: number; // integer
  level: number; // integer
  
  // Quantity
  qtyPallet: number; // integer
  qtyCarton: number; // integer
  
  // Status & Dates
  expiredDate: string; // date (ISO format)
  inboundDate: string; // date (ISO format)
  status: "release" | "hold" | "receh" | "salah-cluster"; // varchar(20)
  
  // Receh tracking
  isReceh: boolean; // boolean
  parentStockId: string | null; // UUID - reference to stock_list.id for receh parent
  
  // Audit
  createdBy: string | null; // UUID - reference to users.id
  createdAt: string; // timestamp (ISO format)
  updatedAt: string; // timestamp (ISO format)
}

// Helper function untuk generate random date berdasarkan hari ini (29 Des 2025)
const TODAY = new Date('2025-12-29'); // Anggap hari ini 29 Desember 2025

function getRandomDate(startDaysFromNow: number, endDaysFromNow: number): string {
  const start = new Date(TODAY);
  start.setDate(start.getDate() + startDaysFromNow);
  const end = new Date(TODAY);
  end.setDate(end.getDate() + endDaysFromNow);
  
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

// Helper function untuk generate inbound date (masa lalu)
function getInboundDate(): string {
  const daysAgo = Math.floor(Math.random() * 90) + 1; // 1-90 hari yang lalu
  const date = new Date(TODAY);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

// Helper function untuk generate BB Produk berdasarkan expired date
// Format: YYMMDDXXXX (contoh: 2509010001)
function generateBBProduk(expiredDate: string, plantCode: string): string {
  const expDate = new Date(expiredDate);
  const yy = String(expDate.getFullYear()).slice(-2); // 25 dari 2025
  const mm = String(expDate.getMonth() + 1).padStart(2, '0'); // 01-12
  const dd = String(expDate.getDate()).padStart(2, '0'); // 01-31
  
  return `${yy}${mm}${dd}${plantCode}`;
}

// --- START: Logika Data Generator BARU (Teratur) ---

// Gunakan struktur sesuai screenshot untuk Cluster A
const stockListData: StockItem[] = [];
let idCounter = 1;

// Helper untuk generate stock item
function addStockItem(
  clusterChar: string,
  lorong: number,
  baris: number,
  level: number,
  productCode: string,
  expDaysFrom: number,
  expDaysTo: number
) {
  const product = productMasterData.find(p => p.productCode === productCode);
  if (!product) return;

  const qtyPallet = 1;
  const qtyCarton = qtyPallet * product.qtyCartonPerPallet;
  
  const expiredDate = getRandomDate(expDaysFrom, expDaysTo);
  const plantCode = String(idCounter).padStart(4, '0');
  const bbProduk = generateBBProduk(expiredDate, plantCode);
  
  const now = new Date().toISOString();
  
  stockListData.push({
    id: `stock-${String(idCounter).padStart(5, '0')}`, // UUID format in real DB
    warehouseId: "wh-001-cikarang", // UUID reference
    productId: product.id, // UUID reference from product master
    bbProduk, // varchar(10) - YYMMDDXXXX format
    cluster: clusterChar, // char(1)
    lorong, // integer
    baris, // integer
    level, // integer (not "P1" string)
    qtyPallet,
    qtyCarton,
    expiredDate,
    inboundDate: getInboundDate(),
    status: "release", // Will be updated dynamically
    isReceh: false, // Will be updated if partial pallet
    parentStockId: null, // NULL for non-receh items
    createdBy: "user-001-admin", // UUID reference to admin user
    createdAt: now,
    updatedAt: now,
  });
  
  idCounter++;
}

// Function to calculate dynamic status based on expired date and cluster validation
const calculateDynamicStatus = (stock: StockItem): "release" | "hold" | "receh" | "salah-cluster" => {
  // Check if receh first
  if (stock.isReceh) {
    return "receh";
  }
  
  // Get product info for validation
  const product = productMasterData.find(p => p.id === stock.productId);
  if (!product) return "hold";
  
  // Check if In Transit area
  const inTransit = isInTransitLocation(stock.cluster, stock.lorong);
  if (inTransit) {
    return "salah-cluster"; // In Transit considered as wrong location
  }
  
  // Check if product is in wrong cluster
  const validation = validateProductLocation(product.productCode, stock.cluster, stock.lorong, stock.baris);
  
  if (!validation.isValid) {
    return "salah-cluster"; // Wrong location = salah-cluster status
  }
  
  // Calculate days to expiry for RELEASE vs HOLD
  const today = new Date();
  const expDate = new Date(stock.expiredDate);
  const diffTime = expDate.getTime() - today.getTime();
  const daysToExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // RELEASE: expired dalam 90 hari atau kurang
  if (daysToExpiry <= 90) {
    return "release";
  }
  
  // HOLD: expired lebih dari 90 hari
  return "hold";
};

// Function to update all stock statuses dynamically
const updateStockStatuses = () => {
  stockListData.forEach(stock => {
    stock.status = calculateDynamicStatus(stock);
  });
};

// === CLUSTER A: 220ML AQUA CUBE MINI (Lorong 1-3) ===
// Lorong 1: TERISI PENUH (8 baris, 2 pallet per sel) - untuk testing
for (let baris = 1; baris <= 8; baris++) {
  for (let pallet = 1; pallet <= 2; pallet++) {
    addStockItem("A", 1, baris, pallet, "166126", 30, 120);
  }
}

// Lorong 2: SEBAGIAN TERISI (hanya baris 1-4 terisi, baris 5-8 kosong) - untuk testing inbound
for (let baris = 1; baris <= 4; baris++) {
  for (let pallet = 1; pallet <= 2; pallet++) {
    addStockItem("A", 2, baris, pallet, "166126", 45, 150);
  }
}
// Baris 5-8 di lorong 2 KOSONG (untuk testing rekomendasi)

// Lorong 3: KOSONG SEMUA (9 baris) - untuk testing rekomendasi dari awal
// TIDAK ADA DATA - full kosong untuk testing

// === CLUSTER A: 200ML AQUA LOCAL (Lorong 4-5) ===
// Lorong 4: SEBAGIAN TERISI (baris 1-6 terisi, baris 7-9 kosong)
for (let baris = 1; baris <= 6; baris++) {
  for (let pallet = 1; pallet <= 2; pallet++) {
    addStockItem("A", 4, baris, pallet, "204579", 60, 200);
  }
}
// Baris 7-9 di lorong 4 KOSONG

// Lorong 5: KOSONG SEMUA - untuk testing rekomendasi
// TIDAK ADA DATA

// === CLUSTER A: 600ML AQUA LOCAL (Lorong 6-11) ===
// Lorong 6-7: TERISI PENUH (9 baris, 3 pallet per sel)
for (let lorong = 6; lorong <= 7; lorong++) {
  for (let baris = 1; baris <= 9; baris++) {
    for (let pallet = 1; pallet <= 3; pallet++) {
      addStockItem("A", lorong, baris, pallet, "74561", 120, 300);
    }
  }
}

// Lorong 8: SEBAGIAN TERISI (baris 1-5 terisi, baris 6-9 kosong)
for (let baris = 1; baris <= 5; baris++) {
  for (let pallet = 1; pallet <= 3; pallet++) {
    addStockItem("A", 8, baris, pallet, "74561", 120, 300);
  }
}
// Baris 6-9 di lorong 8 KOSONG

// Lorong 9-10: KOSONG SEMUA - untuk testing rekomendasi
// TIDAK ADA DATA

// Lorong 11: SEBAGIAN TERISI (hanya baris 1-3 terisi, baris 4-9 kosong)
for (let baris = 1; baris <= 3; baris++) {
  for (let pallet = 1; pallet <= 3; pallet++) {
    addStockItem("A", 11, baris, pallet, "74561", 120, 300);
  }
}
// Baris 4-9 di lorong 11 KOSONG

// === CLUSTER B: Berdasarkan Instruksi User ===
// Lorong 1-6: 1500ML AQUA LOCAL 1X12 (2 pallet per sel)
for (let lorong = 1; lorong <= 6; lorong++) {
  for (let baris = 1; baris <= 8; baris++) {
    for (let pallet = 1; pallet <= 2; pallet++) {
      // 80% filled
      if (Math.random() < 0.8) {
        addStockItem("B", lorong, baris, pallet, "74553", 50, 180);
      }
    }
  }
}

// Lorong 6-12: 330ML AQUA LOCAL 1X24 (3 pallet per sel) - Note: Lorong 6 overlap dengan 1500ML
for (let lorong = 6; lorong <= 12; lorong++) {
  for (let baris = 1; baris <= 8; baris++) {
    for (let pallet = 1; pallet <= 3; pallet++) {
      // 85% filled untuk area ini (lebih penuh)
      if (Math.random() < 0.85) {
        addStockItem("B", lorong, baris, pallet, "74556", 120, 300);
      }
    }
  }
}

// Lorong 13-16: 750ML AQUA LOCAL 1X18 (2 pallet per sel)
for (let lorong = 13; lorong <= 16; lorong++) {
  for (let baris = 1; baris <= 8; baris++) {
    for (let pallet = 1; pallet <= 2; pallet++) {
      // 75% filled
      if (Math.random() < 0.75) {
        addStockItem("B", lorong, baris, pallet, "81681", 90, 270);
      }
    }
  }
}

// Lorong 17-18: 1100ML AQUA LOCAL 1X12 BARCODE ON CAP (2 pallet per sel)
for (let lorong = 17; lorong <= 18; lorong++) {
  for (let baris = 1; baris <= 8; baris++) {
    for (let pallet = 1; pallet <= 2; pallet++) {
      // 70% filled
      if (Math.random() < 0.7) {
        addStockItem("B", lorong, baris, pallet, "142009", 90, 270);
      }
    }
  }
}

// Lorong 19-20: 1500ML AQUA LOCAL MULTIPACK 1X6 (1 pallet per sel, 8 baris)
for (let lorong = 19; lorong <= 20; lorong++) {
  for (let baris = 1; baris <= 8; baris++) {
    // 60% filled
    if (Math.random() < 0.6) {
      addStockItem("B", lorong, baris, 1, "74589", 120, 300);
    }
  }
}

// Lorong 21: 600ML AQUA LOCAL MULTIPACK 1X6 (1 pallet per sel, 8 baris)
for (let baris = 1; baris <= 8; baris++) {
  // 65% filled
  if (Math.random() < 0.65) {
    addStockItem("B", 21, baris, 1, "124172", 90, 270);
  }
}

// Lorong 22: 550ML VIT LOCAL 1X24 (2 pallet per sel, 8 baris)
for (let baris = 1; baris <= 8; baris++) {
  for (let pallet = 1; pallet <= 2; pallet++) {
    // 70% filled
    if (Math.random() < 0.7) {
      addStockItem("B", 22, baris, pallet, "157095", 90, 270);
    }
  }
}

// Lorong 23: 330ML VIT LOCAL 1X24 (2 pallet per sel, 8 baris)
for (let baris = 1; baris <= 8; baris++) {
  for (let pallet = 1; pallet <= 2; pallet++) {
    // 70% filled
    if (Math.random() < 0.7) {
      addStockItem("B", 23, baris, pallet, "112839", 90, 270);
    }
  }
}

// Lorong 24: 200ML VIT LOCAL 1X48 (2 pallet per sel, 8 baris)
for (let baris = 1; baris <= 8; baris++) {
  for (let pallet = 1; pallet <= 2; pallet++) {
    // 65% filled
    if (Math.random() < 0.65) {
      addStockItem("B", 24, baris, pallet, "173022", 90, 270);
    }
  }
}

// Lorong 25: 1500ML VIT LOCAL 1X12 (2 pallet per sel, 8 baris)
for (let baris = 1; baris <= 8; baris++) {
  for (let pallet = 1; pallet <= 2; pallet++) {
    // 70% filled
    if (Math.random() < 0.7) {
      addStockItem("B", 25, baris, pallet, "74565", 120, 300);
    }
  }
}

// Lorong 26: ALL REFLECTIONS (6 baris, 1 pallet per baris)
// Baris 1: 380ML AQUA REFLECTIONS SPARKLING 1X12
if (Math.random() < 0.8) {
  addStockItem("B", 26, 1, 1, "80333", 150, 360);
}
// Baris 2: 380ML AQUA REFLECTIONS BAL 1X12
if (Math.random() < 0.8) {
  addStockItem("B", 26, 2, 1, "174139", 150, 360);
}
// Baris 3-4: 380ML AQUA REFLECTIONS SBUX BAL 1X12 (2 baris)
for (let baris = 3; baris <= 4; baris++) {
  if (Math.random() < 0.8) {
    addStockItem("B", 26, baris, 1, "186452", 150, 360);
  }
}
// Baris 5: 750ML AQUA SPARKLING BAL 1X6
if (Math.random() < 0.8) {
  addStockItem("B", 26, 5, 1, "174136", 150, 360);
}
// Baris 6: 750ML AQUA REFLECTIONS BAL 1X6
if (Math.random() < 0.8) {
  addStockItem("B", 26, 6, 1, "174138", 150, 360);
}

// === CLUSTER C: Mizone Products + In Transit Area ===
// Lorong 1-3: 500ML MIZONE ACTIV LYCHEE LEMON 1X12 (5 baris, 3 pallet per sel)
for (let lorong = 1; lorong <= 3; lorong++) {
  for (let baris = 1; baris <= 5; baris++) {
    for (let pallet = 1; pallet <= 3; pallet++) {
      // 70% filled
      if (Math.random() < 0.7) {
        addStockItem("C", lorong, baris, pallet, "145141", 40, 150);
      }
    }
  }
}

// Lorong 4-6: 500ML MIZONE MOOD UP CRANBERRY 1X12 (5 baris, 3 pallet per sel)
for (let lorong = 4; lorong <= 6; lorong++) {
  for (let baris = 1; baris <= 5; baris++) {
    for (let pallet = 1; pallet <= 3; pallet++) {
      // 70% filled
      if (Math.random() < 0.7) {
        addStockItem("C", lorong, baris, pallet, "145143", 90, 270);
      }
    }
  }
}

// Lorong 7-9: 500ML MIZONE COCO BOOST 1X12 (5 baris, 3 pallet per sel)
for (let lorong = 7; lorong <= 9; lorong++) {
  for (let baris = 1; baris <= 5; baris++) {
    for (let pallet = 1; pallet <= 3; pallet++) {
      // 70% filled
      if (Math.random() < 0.7) {
        addStockItem("C", lorong, baris, pallet, "206774", 90, 270);
      }
    }
  }
}

// Lorong 10-16: IN TRANSIT AREA (Buffer/Overflow)
// This area can contain overflow products from other clusters
// For demonstration, we'll add some mixed products from other clusters that are "overflowed"
const inTransitProducts = ["74553", "74556", "157095", "74561"];
for (let lorong = 10; lorong <= 16; lorong++) {
  for (let baris = 1; baris <= 5; baris++) {
    for (let pallet = 1; pallet <= 3; pallet++) {
      // 30% filled (sparse, as it's temporary storage)
      if (Math.random() < 0.3) {
        const randomProduct = inTransitProducts[Math.floor(Math.random() * inTransitProducts.length)];
        addStockItem("C", lorong, baris, pallet, randomProduct, 60, 240);
      }
    }
  }
}

// === CLUSTER D: Galon AQUA 5 Liter ===
// Lorong 1: 5 GALLON AQUA LOCAL (5 baris, 1 pallet per baris)
for (let baris = 1; baris <= 5; baris++) {
  // 80% filled
  if (Math.random() < 0.8) {
    addStockItem("D", 1, baris, 1, "74559", 90, 270);
  }
}

// Lorong 2: EMPTY BOTTLE AQUA 5 GALLON (5 baris, 1 pallet per baris)
for (let baris = 1; baris <= 5; baris++) {
  // 80% filled
  if (Math.random() < 0.8) {
    addStockItem("D", 2, baris, 1, "10169933", 90, 270);
  }
}

// === CLUSTER E: Galon VIT 5 Liter ===
// Lorong 1: 5 GALLON VIT LOCAL (5 baris, 1 pallet per baris)
for (let baris = 1; baris <= 5; baris++) {
  // 80% filled
  if (Math.random() < 0.8) {
    addStockItem("E", 1, baris, 1, "74560", 90, 270);
  }
}

// Lorong 2: EMPTY BOTTLE VIT 5 GALLON (5 baris, 1 pallet per baris)
for (let baris = 1; baris <= 5; baris++) {
  // 80% filled
  if (Math.random() < 0.8) {
    addStockItem("E", 2, baris, 1, "10169932", 90, 270);
  }
}


// --- START: Manual Receh Data dengan Multiple BB ---
// Tambahkan beberapa contoh receh dengan multiple BB untuk testing dan visualisasi
// Note: In real database, multiple BB would be separate records with same parent_stock_id

// Receh 1: Cluster A, L3, B1, Level 1 - RELEASE (expired dekat)
const receh1ExpDate = getRandomDate(20, 45); // 20-45 hari dari sekarang
const receh1Product = productMasterData.find(p => p.productCode === "142009");
if (receh1Product) {
  const now = new Date().toISOString();
  const receh1ParentId = `stock-receh-001-parent`;
  
  // Parent stock (main receh pallet)
  stockListData.push({
    id: receh1ParentId,
    warehouseId: "wh-001-cikarang",
    productId: receh1Product.id,
    bbProduk: generateBBProduk(getRandomDate(20, 30), "0101"),
    cluster: "A",
    lorong: 3,
    baris: 1,
    level: 1,
    qtyPallet: 1,
    qtyCarton: 25, // Kurang dari standard (42 karton per pallet)
    expiredDate: receh1ExpDate,
    inboundDate: getInboundDate(),
    status: "release",
    isReceh: true,
    parentStockId: null, // This is the parent
    createdBy: "user-001-admin",
    createdAt: now,
    updatedAt: now,
  });
}

// Receh 2: Cluster B, L3, B2, Level 2 - HOLD (expired masih lama)
const receh2ExpDate = getRandomDate(150, 180); // 150-180 hari dari sekarang
const receh2Product = productMasterData.find(p => p.productCode === "74553");
if (receh2Product) {
  const now = new Date().toISOString();
  
  stockListData.push({
    id: `stock-receh-002`,
    warehouseId: "wh-001-cikarang",
    productId: receh2Product.id,
    bbProduk: generateBBProduk(getRandomDate(150, 160), "0201"),
    cluster: "B",
    lorong: 3,
    baris: 2,
    level: 2,
    qtyPallet: 1,
    qtyCarton: 50, // Kurang dari standard (70 karton per pallet)
    expiredDate: receh2ExpDate,
    inboundDate: getInboundDate(),
    status: "hold",
    isReceh: true,
    parentStockId: null,
    createdBy: "user-001-admin",
    createdAt: now,
    updatedAt: now,
  });
}

// Receh 3: Cluster C, L3, B3, Level 1 - RELEASE (expired dekat)
const receh3ExpDate = getRandomDate(90, 120); // 90-120 hari dari sekarang
const receh3Product = productMasterData.find(p => p.productCode === "74589");
if (receh3Product) {
  const now = new Date().toISOString();
  
  stockListData.push({
    id: `stock-receh-003`,
    warehouseId: "wh-001-cikarang",
    productId: receh3Product.id,
    bbProduk: generateBBProduk(receh3ExpDate, "0301"),
    cluster: "C",
    lorong: 3,
    baris: 3,
    level: 1,
    qtyPallet: 1,
    qtyCarton: 80, // Kurang dari standard (112 karton per pallet)
    expiredDate: receh3ExpDate,
    inboundDate: getInboundDate(),
    status: "release",
    isReceh: true,
    parentStockId: null,
    createdBy: "user-001-admin",
    createdAt: now,
    updatedAt: now,
  });
}

// --- END: Manual Receh Data ---

// --- START: Data untuk Produk Baru ---
// TISSUE AQUA V.4 (10481618) - Qty/Pallet = 0 (tidak ada setting cluster, letakkan di Cluster B)
const newProduct1 = productMasterData.find(p => p.productCode === "10481618");
if (newProduct1) {
  const now = new Date().toISOString();
  stockListData.push({
    id: `stock-new-001`,
    warehouseId: "wh-001-cikarang",
    productId: newProduct1.id,
    bbProduk: generateBBProduk(getRandomDate(180, 365), "1001"),
    cluster: "B",
    lorong: 26,
    baris: 7,
    level: 1,
    qtyPallet: 1,
    qtyCarton: 0, // Belum diketahui
    expiredDate: getRandomDate(180, 365),
    inboundDate: getInboundDate(),
    status: "release",
    isReceh: false,
    parentStockId: null,
    createdBy: "user-001-admin",
    createdAt: now,
    updatedAt: now,
  });
}

// JUG AQUA 19L PC 55 MM (10516937) - Qty = 48
const newProduct2 = productMasterData.find(p => p.productCode === "10516937");
if (newProduct2) {
  const now = new Date().toISOString();
  stockListData.push({
    id: `stock-new-002`,
    warehouseId: "wh-001-cikarang",
    productId: newProduct2.id,
    bbProduk: generateBBProduk(getRandomDate(90, 180), "1002"),
    cluster: "D",
    lorong: 3,
    baris: 1,
    level: 1,
    qtyPallet: 1,
    qtyCarton: 48,
    expiredDate: getRandomDate(90, 180),
    inboundDate: getInboundDate(),
    status: "release",
    isReceh: false,
    parentStockId: null,
    createdBy: "user-001-admin",
    createdAt: now,
    updatedAt: now,
  });
}

// JUG VIT 19L PC 55 MM (10516939) - Qty = 48
const newProduct3 = productMasterData.find(p => p.productCode === "10516939");
if (newProduct3) {
  const now = new Date().toISOString();
  stockListData.push({
    id: `stock-new-003`,
    warehouseId: "wh-001-cikarang",
    productId: newProduct3.id,
    bbProduk: generateBBProduk(getRandomDate(90, 180), "1003"),
    cluster: "E",
    lorong: 3,
    baris: 1,
    level: 1,
    qtyPallet: 1,
    qtyCarton: 48,
    expiredDate: getRandomDate(90, 180),
    inboundDate: getInboundDate(),
    status: "release",
    isReceh: false,
    parentStockId: null,
    createdBy: "user-001-admin",
    createdAt: now,
    updatedAt: now,
  });
}

// 380ML AQUA SPARKLING BAL 1X12 (174137) - Produk duplikat
const newProduct4 = productMasterData.find(p => p.productCode === "174137");
if (newProduct4) {
  const now = new Date().toISOString();
  stockListData.push({
    id: `stock-new-004`,
    warehouseId: "wh-001-cikarang",
    productId: newProduct4.id,
    bbProduk: generateBBProduk(getRandomDate(150, 360), "1004"),
    cluster: "B",
    lorong: 26,
    baris: 8,
    level: 1,
    qtyPallet: 1,
    qtyCarton: 90,
    expiredDate: getRandomDate(150, 360),
    inboundDate: getInboundDate(),
    status: "release",
    isReceh: false,
    parentStockId: null,
    createdBy: "user-001-admin",
    createdAt: now,
    updatedAt: now,
  });
}

// --- END: Data untuk Produk Baru ---

// --- START: Manual Wrong Cluster Data (Salah Cluster) ---
// Add some products in wrong clusters for testing status validation

// 1. Put 600ML (should be in Cluster A L6-11) in Cluster B
const wrongProduct1 = productMasterData.find(p => p.productCode === "74561");
if (wrongProduct1) {
  const now = new Date().toISOString();
  stockListData.push({
    id: `stock-wrong-001`,
    warehouseId: "wh-001-cikarang",
    productId: wrongProduct1.id,
    bbProduk: generateBBProduk(getRandomDate(80, 120), "0102"),
    cluster: "B", // Wrong! Should be in A L6-11
    lorong: 4,
    baris: 5,
    level: 1,
    qtyPallet: 1,
    qtyCarton: 40,
    expiredDate: getRandomDate(80, 120),
    inboundDate: getInboundDate(),
    status: "hold", // Will be validated
    isReceh: false,
    parentStockId: null,
    createdBy: "user-001-admin",
    createdAt: now,
    updatedAt: now,
  });
}

// 2. Put 1500ML (should be in Cluster B) in Cluster C
const wrongProduct2 = productMasterData.find(p => p.productCode === "74553");
if (wrongProduct2) {
  const now = new Date().toISOString();
  stockListData.push({
    id: `stock-wrong-002`,
    warehouseId: "wh-001-cikarang",
    productId: wrongProduct2.id,
    bbProduk: generateBBProduk(getRandomDate(60, 90), "0203"),
    cluster: "C", // Wrong! Should be in B
    lorong: 2,
    baris: 3,
    level: 2,
    qtyPallet: 1,
    qtyCarton: 70,
    expiredDate: getRandomDate(60, 90),
    inboundDate: getInboundDate(),
    status: "hold", // Will be validated
    isReceh: false,
    parentStockId: null,
    createdBy: "user-001-admin",
    createdAt: now,
    updatedAt: now,
  });
}

// 3. Put Mizone ACTIV (should be in Cluster C) in Cluster A
const wrongProduct3 = productMasterData.find(p => p.productCode === "145141");
if (wrongProduct3) {
  const now = new Date().toISOString();
  stockListData.push({
    id: `stock-wrong-003`,
    warehouseId: "wh-001-cikarang",
    productId: wrongProduct3.id,
    bbProduk: generateBBProduk(getRandomDate(100, 150), "0301"),
    cluster: "A", // Wrong! Should be in C
    lorong: 5,
    baris: 8,
    level: 2,
    qtyPallet: 1,
    qtyCarton: 84,
    expiredDate: getRandomDate(100, 150),
    inboundDate: getInboundDate(),
    status: "hold", // Will be validated
    isReceh: false,
    parentStockId: null,
    createdBy: "user-001-admin",
    createdAt: now,
    updatedAt: now,
  });
}

// --- END: Manual Wrong Cluster Data ---

// Update all stock statuses dynamically based on current date and cluster validation
updateStockStatuses();

export { stockListData };

// Helper functions - Updated for new schema

export const getStockByLocation = (cluster: string, lorong: number, baris: number, level: number): StockItem | undefined => {
  return stockListData.find(
    s => s.cluster === cluster && 
         s.lorong === lorong && 
         s.baris === baris && 
         s.level === level
  );
};

export const getStockByProductId = (productId: string): StockItem[] => {
  return stockListData.filter(s => s.productId === productId);
};

export const getStockByCluster = (cluster: string): StockItem[] => {
  return stockListData.filter(s => s.cluster === cluster);
};

// Get available stock sorted by FEFO (First Expired First Out)
// Available means: release, hold (excluding damaged and expired)
export const getAvailableStockFEFO = (productId?: string): StockItem[] => {
  let stocks = stockListData.filter(s => 
    s.status === "release" || s.status === "hold"
  );
  
  if (productId) {
    stocks = stocks.filter(s => s.productId === productId);
  }
  
  return stocks.sort((a, b) => {
    const dateA = new Date(a.expiredDate).getTime();
    const dateB = new Date(b.expiredDate).getTime();
    return dateA - dateB; // Ascending: expired date terdekat dulu
  });
};

// Get stock statistics
export const getStockStats = () => {
  const totalItems = stockListData.length;
  const totalPallets = stockListData.reduce((sum, s) => sum + s.qtyPallet, 0);
  const totalCartons = stockListData.reduce((sum, s) => sum + s.qtyCarton, 0);
  
  const statusCount = {
    release: stockListData.filter(s => s.status === "release").length,
    hold: stockListData.filter(s => s.status === "hold").length,
    receh: stockListData.filter(s => s.status === "receh").length,
    salahCluster: stockListData.filter(s => s.status === "salah-cluster").length,
  };
  
  const recehCount = stockListData.filter(s => s.isReceh).length;
  
  return {
    totalItems,
    totalPallets,
    totalCartons,
    statusCount,
    recehCount,
  };
};
