// Stock List Mock Data - Data barang yang sudah ada di gudang
// Layout: 5 lorong (A1-A5) x 9 baris (01-09) per cluster (A, B, C, D)
// Data diacak untuk simulasi kondisi gudang yang ramai
// Setiap record punya expired date untuk FEFO

export interface StockItem {
  id: string;
  productCode: string;
  productName: string;
  bbPallet: string;      // BB Pallet (instead of batch)
  batchNumber: string;   // Kept for compatibility
  lotNumber: string;
  location: {
    cluster: string; // A, B, C, D
    lorong: string;  // L1, L2, L3, ... L11
    baris: string;   // B1, B2, B3, ... B9
    level: string;   // P1, P2, P3, P4 (Pallet position)
  };
  qtyPallet: number;
  qtyCarton: number;
  qtyPcs: number;
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

// Product codes dengan cluster assignment
const clusterProductMap: Record<string, { code: string; name: string; qtyPerCarton: number }> = {
  "A": { code: "AQ-200ML-48", name: "200ML AQUA LOCAL 1X48", qtyPerCarton: 48 },
  "B": { code: "AQ-600ML-24", name: "600ML AQUA LOCAL 1X24", qtyPerCarton: 24 },
  "C": { code: "AQ-1500ML-12", name: "1500ML AQUA LOCAL 1X12", qtyPerCarton: 12 },
  "D": { code: "AQ-330ML-24", name: "330ML AQUA LOCAL 1X24", qtyPerCarton: 24 },
};

const allProducts = [
  { code: "AQ-200ML-48", name: "200ML AQUA LOCAL 1X48", qtyPerCarton: 48 },
  { code: "AQ-600ML-24", name: "600ML AQUA LOCAL 1X24", qtyPerCarton: 24 },
  { code: "AQ-1500ML-12", name: "1500ML AQUA LOCAL 1X12", qtyPerCarton: 12 },
  { code: "AQ-330ML-24", name: "330ML AQUA LOCAL 1X24", qtyPerCarton: 24 },
];

const clusters = ["A", "B", "C", "D"];
const lorongList = ["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9", "L10", "L11"];
const barisList = ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9"];
const levelList = ["P1", "P2", "P3", "P4"]; // Pallet positions

// Generate stock data
const stockListData: StockItem[] = [];
let idCounter = 1;

// Generate data untuk setiap cluster
clusters.forEach(cluster => {
  // Produk yang seharusnya ada di cluster ini
  const correctProduct = clusterProductMap[cluster];
  
  // Generate data untuk setiap lorong
  lorongList.forEach(lorong => {
    // Generate data untuk setiap baris
    barisList.forEach(baris => {
      // Random 1-2 level terisi per lokasi (baris) - reduced density for more variety
      const numLevels = Math.floor(Math.random() * 2) + 1;
      const usedLevels = levelList.slice(0, numLevels).sort(() => Math.random() - 0.5);
      
      usedLevels.forEach(level => {
        // 85% correct product, 15% wrong product (untuk simulasi salah cluster)
        const isCorrectProduct = Math.random() < 0.85;
        const product = isCorrectProduct 
          ? correctProduct 
          : allProducts[Math.floor(Math.random() * allProducts.length)];
        
        // Random quantity
        const qtyPallet = Math.floor(Math.random() * 3) + 1; // 1-3 pallet
        const qtyCarton = Math.floor(Math.random() * 20) + 5; // 5-24 carton
        const qtyPcs = qtyCarton * product.qtyPerCarton;
        
        // Random batch and BB Pallet
        const batchMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
        const batchYear = 2024;
        const batchSeq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
        const batchNumber = `BATCH-${batchYear}${batchMonth}-${batchSeq}`;
        const lotNumber = `LOT-${batchYear}${batchMonth}-${batchSeq}`;
        const bbPallet = `BB-${batchYear}${batchMonth}-${String(idCounter).padStart(4, '0')}`;
        
        // Expired date distribution:
        // 30% green (near expiry: 10-90 days) - harus release segera (FEFO priority)
        // 55% yellow (medium expiry: 91-180 days)
        // 15% yellow (long expiry: 181-540 days)
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
        
        // Random status (kebanyakan available)
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
          productCode: product.code,
          productName: product.name,
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

export { stockListData };

// Helper functions
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
