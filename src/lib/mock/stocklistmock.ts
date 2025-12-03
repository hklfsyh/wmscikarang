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
  bbPallet: string;      // BB Pallet (instead of batch)
  batchNumber: string;   // Kept for compatibility
  lotNumber: string;
  location: {
    cluster: string; 
    lorong: string;  
    baris: string;   
    level: string;   
  };
  qtyPallet: number; // Jumlah tumpukan pallet di lokasi rak
  qtyCarton: number; // Total karton/box (menggunakan qtyPerPallet dari Master)
  qtyPcs: number; // Total pcs/unit
  expiredDate: string;
  inboundDate: string;
  status: "available" | "reserved" | "quarantine";
  notes?: string;
}

// Helper function untuk generate random date
function getRandomDate(startDaysFromNow: number, endDaysFromNow: number): string {
  const start = new Date();
  start.setDate(start.getDate() + startDaysFromNow);
  const end = new Date();
  end.setDate(end.getDate() + endDaysFromNow);
  
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

// Helper function untuk generate inbound date (masa lalu)
function getInboundDate(): string {
  const daysAgo = Math.floor(Math.random() * 90) + 1; // 1-90 hari yang lalu
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

// --- START: Logika Data Generator BARU (Teratur) ---

// Daftar Cluster yang digunakan
const clusters = ["A", "B", "C", "D", "E"]; 

// Filter produk yang memiliki defaultCluster
const allProductsWithCluster = productMasterData.filter(p => p.defaultCluster);

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
        
        // Random quantity
        const qtyPallet = Math.floor(Math.random() * 3) + 1; // 1-3 tumpukan pallet
        
        // Hitung qtyCarton/qtyBox (Qty Pallet * Qty Produk/Pallet)
        const qtyCarton = qtyPallet * product.qtyPerPallet; 
        
        // Hitung qtyPcs (Qty Carton * Qty per Karton)
        const qtyPcs = qtyCarton * product.qtyPerCarton;
        
        // Random batch and BB Pallet
        const batchMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
        const batchYear = 2025; 
        const batchSeq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
        const batchNumber = `BATCH-${batchYear}${batchMonth}-${batchSeq}`;
        const lotNumber = `LOT-${batchYear}${batchMonth}-${batchSeq}`;
        const bbPallet = `BB-${batchYear}${batchMonth}-${String(idCounter).padStart(4, '0')}`;
        
        // Expired date distribution (FEFO logic):
        const expRand = Math.random();
        let expiredDate: string;
        if (expRand < 0.30) {
          // Green: 10-90 hari (near expiry)
          expiredDate = getRandomDate(10, 90);
        } else if (expRand < 0.85) {
          // Yellow: 91-180 hari (medium expiry)
          expiredDate = getRandomDate(91, 180);
        } else {
          // Yellow: 181-540 hari (long expiry)
          expiredDate = getRandomDate(181, 540);
        }
        
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