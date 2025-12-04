// File: src/lib/mock/stocklistmock.ts (UPDATED - Teratur)

// Stock List Mock Data - Data barang yang sudah ada di gudang
// Data diatur untuk simulasi kondisi gudang yang teratur di 2 lorong pertama
// Setiap record punya expired date untuk FEFO

// --- START: Perubahan Import ---
import { ProductMaster, productMasterData } from "@/lib/mock/product-master";
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
  status: "available" | "reserved" | "quarantine";
  isReceh?: boolean; // Flag untuk pallet receh (tidak penuh)
  notes?: string;
}

// Helper function untuk generate random date berdasarkan hari ini (1 Sept 2025)
const TODAY = new Date('2025-09-01'); // Anggap hari ini 1 September 2025

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
// Format: BB-YYMMDD-XXXX (contoh: BB-250901-0001)
function generateBBPallet(expiredDate: string, plantCode: string): string {
  const expDate = new Date(expiredDate);
  const yy = String(expDate.getFullYear()).slice(-2); // 25 dari 2025
  const mm = String(expDate.getMonth() + 1).padStart(2, '0'); // 01-12
  const dd = String(expDate.getDate()).padStart(2, '0'); // 01-31
  
  return `BB-${yy}${mm}${dd}-${plantCode}`;
}

// --- START: Logika Data Generator BARU (Teratur) ---

// Daftar Cluster yang digunakan
const clusters = ["A", "B", "C", "D", "E"];

// Gunakan 2 Lorong dan 9 Baris (Permintaan User)
const lorongList = ["L1", "L2"]; // Hanya 2 Lorong pertama
const barisList = ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9"]; // Semua 9 Baris
// Gunakan 3 Level (Pallet) per Baris/Rak
const levelList = ["P1", "P2", "P3"]; 

// Generate stock data
const stockListData: StockItem[] = [];
let idCounter = 1;

// Loop untuk generate data di Cluster A, B, C, D, E
clusters.forEach(cluster => {
  // Produk yang default clusternya sama dengan cluster yang sedang di-loop
  const clusterDefaultProducts = productMasterData.filter(p => p.defaultCluster === cluster);
  
  // Ambil 1 produk utama untuk cluster ini (Jika ada)
  const mainProduct = clusterDefaultProducts.length > 0 
    ? clusterDefaultProducts[0]
    : productMasterData[Math.floor(Math.random() * productMasterData.length)];


  // Loop Lorong, Baris, dan Level yang diminta
  lorongList.forEach(lorong => {
    barisList.forEach(baris => {
      levelList.forEach(level => { // P1, P2, P3 akan terisi penuh
        
        // 90% produk yang benar (default cluster), 10% produk acak (salah penempatan)
        const isCorrectProduct = Math.random() < 0.90;
        let product: ProductMaster;

        if (isCorrectProduct && clusterDefaultProducts.length > 0) {
            // Pilih produk utama atau produk yang sesuai dengan cluster
            product = mainProduct;
        } else {
            // Pilih produk secara acak dari semua produk (simulasi salah penempatan)
            product = productMasterData[Math.floor(Math.random() * productMasterData.length)];
        }
        
        // Qty Pallet harus 1 karena setiap slot (P1/P2/P3) hanya bisa 1 pallet
        const qtyPallet = 1; // Setiap lokasi level (P1, P2, P3) = 1 slot fisik = 1 pallet
        
        // Hitung qtyCarton/qtyBox (Qty Pallet * Qty Produk/Pallet)
        const qtyCarton = qtyPallet * product.qtyPerPallet; 
        
        // Hitung qtyPcs (Qty Carton * Qty per Karton)
        const qtyPcs = qtyCarton * product.qtyPerCarton;
        
        // Expired date distribution (FEFO logic):
        // Hari ini: 1 Sept 2025 (250901)
        const expRand = Math.random();
        let expiredDate: string;
        if (expRand < 0.30) {
          // Green: 0-90 hari (near expiry) - RELEASE
          expiredDate = getRandomDate(0, 90);
        } else if (expRand < 0.85) {
          // Yellow: 91-180 hari (medium expiry) - HOLD
          expiredDate = getRandomDate(91, 180);
        } else {
          // Yellow: 181-365 hari (long expiry) - HOLD
          expiredDate = getRandomDate(181, 365);
        }
        
        // Generate Plant Code (4 digit unique per item)
        const plantCode = String(idCounter).padStart(4, '0');
        
        // Generate BB Pallet berdasarkan expired date (Format: BB-YYMMDD-XXXX)
        const bbPallet = generateBBPallet(expiredDate, plantCode);
        
        // Generate batch info
        const expDate = new Date(expiredDate);
        const batchMonth = String(expDate.getMonth() + 1).padStart(2, '0');
        const batchYear = expDate.getFullYear();
        const batchSeq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
        const batchNumber = `BATCH-${batchYear}${batchMonth}-${batchSeq}`;
        const lotNumber = `LOT-${batchYear}${batchMonth}-${batchSeq}`;
        
        const inboundDate = getInboundDate();
        
        // Random status (lebih banyak available)
        const randStatus = Math.random();
        let status: "available" | "reserved" | "quarantine";
        if (randStatus < 0.88) {
          status = "available";
        } else if (randStatus < 0.96) {
          status = "reserved";
        } else {
          status = "quarantine";
        }
        
        stockListData.push({
          id: `STK-${String(idCounter).padStart(5, '0')}`,
          productCode: product.productCode,
          productName: product.productName,
          bbPallet,
          batchNumber,
          lotNumber,
          location: {
            cluster,
            lorong,
            baris,
            level,
          },
          qtyPallet,
          qtyCarton,
          qtyPcs,
          expiredDate,
          inboundDate,
          status,
          notes: status === "quarantine" ? "Quality check in progress" : undefined,
        });
        
        idCounter++;
      });
    });
  });
});

// --- END: Logika Data Generator BARU (Teratur) ---

// --- START: Manual Receh Data dengan Multiple BB ---
// Tambahkan beberapa contoh receh dengan multiple BB untuk testing dan visualisasi

// Receh 1: Cluster A, L3, B1, P1 - Multiple BB dari batch berbeda (RELEASE - expired dekat)
const receh1ExpDate = getRandomDate(30, 60); // 30-60 hari dari sekarang (GREEN)
stockListData.push({
  id: `STK-RECEH-001`,
  productCode: "AQ-1100ML-BC",
  productName: "1100ML AQUA LOCAL 1X12 BARCODE ON CAP",
  bbPallet: [
    generateBBPallet(getRandomDate(30, 40), "0101"), 
    generateBBPallet(getRandomDate(35, 45), "0102"), 
    generateBBPallet(getRandomDate(40, 50), "0103")
  ], // Multiple BB dengan expired berbeda
  batchNumber: "BATCH-202510-101",
  lotNumber: "LOT-202510-101",
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
const receh2ExpDate = getRandomDate(120, 150); // 120-150 hari dari sekarang (YELLOW)
stockListData.push({
  id: `STK-RECEH-002`,
  productCode: "AQ-1500ML",
  productName: "1500ML AQUA LOCAL 1X12",
  bbPallet: [
    generateBBPallet(getRandomDate(120, 130), "0201"), 
    generateBBPallet(getRandomDate(130, 140), "0202")
  ], // Multiple BB
  batchNumber: "BATCH-202601-201",
  lotNumber: "LOT-202601-201",
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
const receh3ExpDate = getRandomDate(60, 80); // 60-80 hari dari sekarang (GREEN)
stockListData.push({
  id: `STK-RECEH-003`,
  productCode: "AQ-1500ML-MP",
  productName: "1500ML AQUA LOCAL MULTIPACK 1X6",
  bbPallet: generateBBPallet(receh3ExpDate, "0301"), // Single BB
  batchNumber: "BATCH-202511-301",
  lotNumber: "LOT-202511-301",
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
export const getAvailableStockFEFO = (productCode?: string): StockItem[] => {
  let stocks = stockListData.filter(s => s.status === "available");
  
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
    reserved: stockListData.filter(s => s.status === "reserved").length,
    quarantine: stockListData.filter(s => s.status === "quarantine").length,
  };
  
  return {
    totalItems,
    totalPallets,
    totalCartons,
    totalPcs,
    statusCount,
  };
};