// File: src/lib/mock/stocklistmock.ts (UPDATED - Teratur)

// Stock List Mock Data - Data barang yang sudah ada di gudang
// Data diatur untuk simulasi kondisi gudang yang teratur di 2 lorong pertama
// Setiap record punya expired date untuk FEFO

// --- START: Perubahan Import ---
import { productMasterData } from "@/lib/mock/product-master";
import { validateProductLocation, isInTransitLocation } from "@/lib/mock/warehouse-config";
// --- END: Perubahan Import ---

export interface StockItem {
  id: string;
  productCode: string;
  productName: string;
  bbPallet: string | string[];      // BB Pallet - bisa array untuk receh dengan multiple BB
  batchNumber: string;   // Kept for compatibility
  lotNumber: string;
  location: {
    cluster: string; 
    lorong: string;  
    baris: string;   
    level: string;   
  };
  qtyPallet: number; // Jumlah tumpukan pallet di lokasi rak (max 3 untuk full pallet)
  qtyCarton: number; // Total karton/box (menggunakan qtyPerPallet dari Master)
  qtyPcs: number; // Total pcs/unit
  expiredDate: string;
  inboundDate: string;
  status: "available" | "hold" | "release" | "receh" | "salah-cluster";
  isReceh?: boolean; // Flag untuk pallet receh (tidak penuh)
  notes?: string;
}

// Helper function untuk generate random date berdasarkan hari ini (10 Des 2025)
const TODAY = new Date('2025-12-10'); // Anggap hari ini 10 Desember 2025

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

// Helper function untuk generate BB Pallet berdasarkan expired date
// Format: YYMMDDXXXX (contoh: 2509010001)
function generateBBPallet(expiredDate: string, plantCode: string): string {
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
  cluster: string,
  lorong: number,
  baris: number,
  pallet: number,
  productCode: string,
  expDaysFrom: number,
  expDaysTo: number
) {
  const product = productMasterData.find(p => p.productCode === productCode);
  if (!product) return;

  const qtyPallet = 1;
  const qtyCarton = qtyPallet * product.qtyPerPallet;
  const qtyPcs = qtyCarton * product.qtyPerCarton;
  
  const expiredDate = getRandomDate(expDaysFrom, expDaysTo);
  const plantCode = String(idCounter).padStart(4, '0');
  const bbPallet = generateBBPallet(expiredDate, plantCode);
  
  const expDate = new Date(expiredDate);
  const batchMonth = String(expDate.getMonth() + 1).padStart(2, '0');
  const batchYear = expDate.getFullYear();
  const batchSeq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  const batchNumber = `BATCH-${batchYear}${batchMonth}-${batchSeq}`;
  const lotNumber = `LOT-${batchYear}${batchMonth}-${batchSeq}`;
  
  stockListData.push({
    id: `STK-${String(idCounter).padStart(5, '0')}`,
    productCode: product.productCode,
    productName: product.productName,
    bbPallet,
    batchNumber,
    lotNumber,
    location: {
      cluster,
      lorong: `L${lorong}`,
      baris: `B${baris}`,
      level: `P${pallet}`,
    },
    qtyPallet,
    qtyCarton,
    qtyPcs,
    expiredDate,
    inboundDate: getInboundDate(),
    status: "available", // Will be updated dynamically
    isReceh: false, // Will be updated if partial pallet
  });
  
  idCounter++;
}

// Function to calculate dynamic status based on expired date and cluster validation
const calculateDynamicStatus = (stock: StockItem): "available" | "hold" | "release" | "receh" | "salah-cluster" => {
  const lorongNum = parseInt(stock.location.lorong.replace("L", ""));
  
  // Check if In Transit area
  const inTransit = isInTransitLocation(stock.location.cluster, lorongNum);
  if (inTransit) {
    return "salah-cluster"; // In Transit considered as wrong location for visual consistency
  }
  
  // Check if product is in wrong cluster
  const barisNum = parseInt(stock.location.baris.replace("B", ""));
  const validation = validateProductLocation(stock.productCode, stock.location.cluster, lorongNum, barisNum);
  
  if (!validation.isValid) {
    return "salah-cluster";
  }
  
  // Check if receh (partial pallet)
  if (stock.isReceh) {
    return "receh";
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
    addStockItem("A", 1, baris, pallet, "AQ-220-CUBE-24", 30, 120);
  }
}

// Lorong 2: SEBAGIAN TERISI (hanya baris 1-4 terisi, baris 5-8 kosong) - untuk testing inbound
for (let baris = 1; baris <= 4; baris++) {
  for (let pallet = 1; pallet <= 2; pallet++) {
    addStockItem("A", 2, baris, pallet, "AQ-220-CUBE-24", 45, 150);
  }
}
// Baris 5-8 di lorong 2 KOSONG (untuk testing rekomendasi)

// Lorong 3: KOSONG SEMUA (9 baris) - untuk testing rekomendasi dari awal
// TIDAK ADA DATA - full kosong untuk testing

// === CLUSTER A: 200ML AQUA LOCAL (Lorong 4-5) ===
// Lorong 4: SEBAGIAN TERISI (baris 1-6 terisi, baris 7-9 kosong)
for (let baris = 1; baris <= 6; baris++) {
  for (let pallet = 1; pallet <= 2; pallet++) {
    addStockItem("A", 4, baris, pallet, "AQ-200-LOC-48", 60, 200);
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
      addStockItem("A", lorong, baris, pallet, "AQ-600-LOC-24", 120, 300);
    }
  }
}

// Lorong 8: SEBAGIAN TERISI (baris 1-5 terisi, baris 6-9 kosong)
for (let baris = 1; baris <= 5; baris++) {
  for (let pallet = 1; pallet <= 3; pallet++) {
    addStockItem("A", 8, baris, pallet, "AQ-600-LOC-24", 120, 300);
  }
}
// Baris 6-9 di lorong 8 KOSONG

// Lorong 9-10: KOSONG SEMUA - untuk testing rekomendasi
// TIDAK ADA DATA

// Lorong 11: SEBAGIAN TERISI (hanya baris 1-3 terisi, baris 4-9 kosong)
for (let baris = 1; baris <= 3; baris++) {
  for (let pallet = 1; pallet <= 3; pallet++) {
    addStockItem("A", 11, baris, pallet, "AQ-600-LOC-24", 120, 300);
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
        addStockItem("B", lorong, baris, pallet, "AQ-1500ML", 50, 180);
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
        addStockItem("B", lorong, baris, pallet, "AQ-330ML", 120, 300);
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
        addStockItem("B", lorong, baris, pallet, "AQ-750ML", 90, 270);
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
        addStockItem("B", lorong, baris, pallet, "AQ-1100ML-BC", 90, 270);
      }
    }
  }
}

// Lorong 19-20: 1500ML AQUA LOCAL MULTIPACK 1X6 (1 pallet per sel, 8 baris)
for (let lorong = 19; lorong <= 20; lorong++) {
  for (let baris = 1; baris <= 8; baris++) {
    // 60% filled
    if (Math.random() < 0.6) {
      addStockItem("B", lorong, baris, 1, "AQ-1500ML-MP", 120, 300);
    }
  }
}

// Lorong 21: 600ML AQUA LOCAL MULTIPACK 1X6 (1 pallet per sel, 8 baris)
for (let baris = 1; baris <= 8; baris++) {
  // 65% filled
  if (Math.random() < 0.65) {
    addStockItem("B", 21, baris, 1, "AQ-600ML-MP", 90, 270);
  }
}

// Lorong 22: 550ML VIT LOCAL 1X24 (2 pallet per sel, 8 baris)
for (let baris = 1; baris <= 8; baris++) {
  for (let pallet = 1; pallet <= 2; pallet++) {
    // 70% filled
    if (Math.random() < 0.7) {
      addStockItem("B", 22, baris, pallet, "VIT-550ML", 90, 270);
    }
  }
}

// Lorong 23: 330ML VIT LOCAL 1X24 (2 pallet per sel, 8 baris)
for (let baris = 1; baris <= 8; baris++) {
  for (let pallet = 1; pallet <= 2; pallet++) {
    // 70% filled
    if (Math.random() < 0.7) {
      addStockItem("B", 23, baris, pallet, "VIT-330ML", 90, 270);
    }
  }
}

// Lorong 24: 200ML VIT LOCAL 1X48 (2 pallet per sel, 8 baris)
for (let baris = 1; baris <= 8; baris++) {
  for (let pallet = 1; pallet <= 2; pallet++) {
    // 65% filled
    if (Math.random() < 0.65) {
      addStockItem("B", 24, baris, pallet, "VIT-200ML", 90, 270);
    }
  }
}

// Lorong 25: 1500ML VIT LOCAL 1X12 (2 pallet per sel, 8 baris)
for (let baris = 1; baris <= 8; baris++) {
  for (let pallet = 1; pallet <= 2; pallet++) {
    // 70% filled
    if (Math.random() < 0.7) {
      addStockItem("B", 25, baris, pallet, "VIT-1500ML", 120, 300);
    }
  }
}

// Lorong 26: ALL REFLECTIONS (6 baris, 1 pallet per baris)
// Baris 1: 380ML AQUA REFLECTIONS SPARKLING 1X12
if (Math.random() < 0.8) {
  addStockItem("B", 26, 1, 1, "AQ-380-SPARK", 150, 360);
}
// Baris 2: 380ML AQUA REFLECTIONS BAL 1X12
if (Math.random() < 0.8) {
  addStockItem("B", 26, 2, 1, "AQ-380-BAL", 150, 360);
}
// Baris 3-4: 380ML AQUA REFLECTIONS SBUX BAL 1X12 (2 baris)
for (let baris = 3; baris <= 4; baris++) {
  if (Math.random() < 0.8) {
    addStockItem("B", 26, baris, 1, "AQ-380-SBUX", 150, 360);
  }
}
// Baris 5: 750ML AQUA SPARKLING BAL 1X6
if (Math.random() < 0.8) {
  addStockItem("B", 26, 5, 1, "AQ-750-SPARK-BAL", 150, 360);
}
// Baris 6: 750ML AQUA REFLECTIONS BAL 1X6
if (Math.random() < 0.8) {
  addStockItem("B", 26, 6, 1, "AQ-750-REF-BAL", 150, 360);
}

// === CLUSTER C: Mizone Products + In Transit Area ===
// Lorong 1-3: 500ML MIZONE ACTIV LYCHEE LEMON 1X12 (5 baris, 3 pallet per sel)
for (let lorong = 1; lorong <= 3; lorong++) {
  for (let baris = 1; baris <= 5; baris++) {
    for (let pallet = 1; pallet <= 3; pallet++) {
      // 70% filled
      if (Math.random() < 0.7) {
        addStockItem("C", lorong, baris, pallet, "MIZ-ACTIV", 40, 150);
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
        addStockItem("C", lorong, baris, pallet, "MIZ-MOOD", 90, 270);
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
        addStockItem("C", lorong, baris, pallet, "MIZ-COCO", 90, 270);
      }
    }
  }
}

// Lorong 10-16: IN TRANSIT AREA (Buffer/Overflow)
// This area can contain overflow products from other clusters
// For demonstration, we'll add some mixed products from other clusters that are "overflowed"
const inTransitProducts = ["AQ-1500ML", "AQ-330ML", "VIT-550ML", "AQ-600-LOC-24"];
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
    addStockItem("D", 1, baris, 1, "AQ-5GAL", 90, 270);
  }
}

// Lorong 2: 5 GALLON AQUA LOCAL RETUR (5 baris, 1 pallet per baris)
for (let baris = 1; baris <= 5; baris++) {
  // 80% filled
  if (Math.random() < 0.8) {
    addStockItem("D", 2, baris, 1, "AQ-5GAL-RETUR", 90, 270);
  }
}

// Lorong 3: EMPTY BOTTLE AQUA 5 GALLON (5 baris, 1 pallet per baris)
for (let baris = 1; baris <= 5; baris++) {
  // 80% filled
  if (Math.random() < 0.8) {
    addStockItem("D", 3, baris, 1, "AQ-EMPTY-5GAL", 90, 270);
  }
}

// === CLUSTER E: Galon VIT 5 Liter ===
// Lorong 1: 5 GALLON VIT LOCAL (5 baris, 1 pallet per baris)
for (let baris = 1; baris <= 5; baris++) {
  // 80% filled
  if (Math.random() < 0.8) {
    addStockItem("E", 1, baris, 1, "VIT-5GAL", 90, 270);
  }
}

// Lorong 2: 5 GALLON VIT LOCAL RETUR (5 baris, 1 pallet per baris)
for (let baris = 1; baris <= 5; baris++) {
  // 80% filled
  if (Math.random() < 0.8) {
    addStockItem("E", 2, baris, 1, "VIT-5GAL-RETUR", 90, 270);
  }
}

// Lorong 3: EMPTY BOTTLE VIT 5 GALLON (5 baris, 1 pallet per baris)
for (let baris = 1; baris <= 5; baris++) {
  // 80% filled
  if (Math.random() < 0.8) {
    addStockItem("E", 3, baris, 1, "VIT-EMPTY-5GAL", 90, 270);
  }
}


// --- START: Manual Receh Data dengan Multiple BB ---
// Tambahkan beberapa contoh receh dengan multiple BB untuk testing dan visualisasi

// Receh 1: Cluster A, L3, B1, P1 - Multiple BB dari batch berbeda (RELEASE - expired dekat)
const receh1ExpDate = getRandomDate(20, 45); // 20-45 hari dari sekarang (VERY CLOSE)
stockListData.push({
  id: `STK-RECEH-001`,
  productCode: "AQ-1100ML-BC",
  productName: "1100ML AQUA LOCAL 1X12 BARCODE ON CAP",
  bbPallet: [
    generateBBPallet(getRandomDate(20, 30), "0101"), 
    generateBBPallet(getRandomDate(25, 35), "0102"), 
    generateBBPallet(getRandomDate(30, 40), "0103")
  ], // Multiple BB dengan expired berbeda
  batchNumber: "BATCH-202602-101",
  lotNumber: "LOT-202602-101",
  location: {
    cluster: "A",
    lorong: "L3",
    baris: "B1",
    level: "P1",
  },
  qtyPallet: 1,
  qtyCarton: 25, // Kurang dari standard (42 karton per pallet)
  qtyPcs: 300,
  expiredDate: receh1ExpDate,
  inboundDate: getInboundDate(),
  status: "available",
  isReceh: true,
  notes: "Pallet receh dengan 3 BB berbeda (produk sama) - RELEASE",
});

// Receh 2: Cluster B, L3, B2, P2 - Multiple BB (HOLD - expired masih lama)
const receh2ExpDate = getRandomDate(150, 180); // 150-180 hari dari sekarang (YELLOW)
stockListData.push({
  id: `STK-RECEH-002`,
  productCode: "AQ-1500ML",
  productName: "1500ML AQUA LOCAL 1X12",
  bbPallet: [
    generateBBPallet(getRandomDate(150, 160), "0201"), 
    generateBBPallet(getRandomDate(160, 170), "0202")
  ], // Multiple BB
  batchNumber: "BATCH-202605-201",
  lotNumber: "LOT-202605-201",
  location: {
    cluster: "B",
    lorong: "L3",
    baris: "B2",
    level: "P2",
  },
  qtyPallet: 1,
  qtyCarton: 50, // Kurang dari standard (70 karton per pallet)
  qtyPcs: 600,
  expiredDate: receh2ExpDate,
  inboundDate: getInboundDate(),
  status: "available",
  isReceh: true,
  notes: "Pallet receh dengan 2 BB berbeda (produk sama) - HOLD",
});

// Receh 3: Cluster C, L3, B3, P1 - Single BB (RELEASE - expired dekat)
const receh3ExpDate = getRandomDate(90, 120); // 90-120 hari dari sekarang (GREEN)
stockListData.push({
  id: `STK-RECEH-003`,
  productCode: "AQ-1500ML-MP",
  productName: "1500ML AQUA LOCAL MULTIPACK 1X6",
  bbPallet: generateBBPallet(receh3ExpDate, "0301"), // Single BB
  batchNumber: "BATCH-202603-301",
  lotNumber: "LOT-202603-301",
  location: {
    cluster: "C",
    lorong: "L3",
    baris: "B3",
    level: "P1",
  },
  qtyPallet: 1,
  qtyCarton: 80, // Kurang dari standard (112 karton per pallet)
  qtyPcs: 480,
  expiredDate: receh3ExpDate,
  inboundDate: getInboundDate(),
  status: "available",
  isReceh: true,
  notes: "Pallet receh dengan single BB - RELEASE",
});

// --- END: Manual Receh Data ---

// --- START: Manual Wrong Cluster Data (Salah Cluster) ---
// Add some products in wrong clusters for testing status "salah-cluster"

// 1. Put Mizone (should be in Cluster C) in Cluster A
stockListData.push({
  id: `STK-WRONG-001`,
  productCode: "MZ-1000ML-ORA",
  productName: "1000ML MIZONE ORANGE 1X12",
  bbPallet: generateBBPallet(getRandomDate(100, 150), "0301"),
  batchNumber: "BATCH-202604-301",
  lotNumber: "LOT-202604-301",
  location: {
    cluster: "A", // Wrong! Should be in C
    lorong: "L5",
    baris: "B8",
    level: "P2",
  },
  qtyPallet: 1,
  qtyCarton: 84, // Standard untuk Mizone
  qtyPcs: 1008,
  expiredDate: getRandomDate(100, 150),
  inboundDate: getInboundDate(),
  status: "available",
  isReceh: false,
});

// 2. Put 600ML (should be in Cluster A L6-11) in Cluster B
stockListData.push({
  id: `STK-WRONG-002`,
  productCode: "AQ-600-LOC-24",
  productName: "600ML AQUA LOCAL 1X24",
  bbPallet: generateBBPallet(getRandomDate(80, 120), "0102"),
  batchNumber: "BATCH-202603-102",
  lotNumber: "LOT-202603-102",
  location: {
    cluster: "B", // Wrong! Should be in A L6-11
    lorong: "L4",
    baris: "B5",
    level: "P1",
  },
  qtyPallet: 1,
  qtyCarton: 70,
  qtyPcs: 1680,
  expiredDate: getRandomDate(80, 120),
  inboundDate: getInboundDate(),
  status: "available",
  isReceh: false,
});

// 3. Put 1500ML (should be in Cluster B) in Cluster C
stockListData.push({
  id: `STK-WRONG-003`,
  productCode: "AQ-1500ML",
  productName: "1500ML AQUA LOCAL 1X12",
  bbPallet: generateBBPallet(getRandomDate(60, 90), "0203"),
  batchNumber: "BATCH-202602-203",
  lotNumber: "LOT-202602-203",
  location: {
    cluster: "C", // Wrong! Should be in B
    lorong: "L2",
    baris: "B3",
    level: "P2",
  },
  qtyPallet: 1,
  qtyCarton: 70,
  qtyPcs: 840,
  expiredDate: getRandomDate(60, 90),
  inboundDate: getInboundDate(),
  status: "available",
  isReceh: false,
});

// --- END: Manual Wrong Cluster Data ---

// Update all stock statuses dynamically based on current date and cluster validation
updateStockStatuses();

export { stockListData };

// Helper functions (Tidak perlu diubah)

export const getStockByLocation = (cluster: string, lorong: string, baris: string, level: string): StockItem | undefined => {
  return stockListData.find(
    s => s.location.cluster === cluster && 
         s.location.lorong === lorong && 
         s.location.baris === baris && 
         s.location.level === level
  );
};

export const getStockByProduct = (productCode: string): StockItem[] => {
  return stockListData.filter(s => s.productCode === productCode);
};

export const getStockByCluster = (cluster: string): StockItem[] => {
  return stockListData.filter(s => s.location.cluster === cluster);
};

// Get available stock sorted by FEFO (First Expired First Out)
// Available means: release, hold, or receh (excluding salah-cluster)
export const getAvailableStockFEFO = (productCode?: string): StockItem[] => {
  let stocks = stockListData.filter(s => 
    s.status === "release" || s.status === "hold" || s.status === "receh"
  );
  
  if (productCode) {
    stocks = stocks.filter(s => s.productCode === productCode);
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
  const totalPcs = stockListData.reduce((sum, s) => sum + s.qtyPcs, 0);
  
  const statusCount = {
    available: stockListData.filter(s => s.status === "available").length,
    hold: stockListData.filter(s => s.status === "hold").length,
    release: stockListData.filter(s => s.status === "release").length,
    receh: stockListData.filter(s => s.status === "receh").length,
    salahCluster: stockListData.filter(s => s.status === "salah-cluster").length,
  };
  
  return {
    totalItems,
    totalPallets,
    totalCartons,
    totalPcs,
    statusCount,
  };
};