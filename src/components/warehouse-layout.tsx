// File: src/components/warehouse-layout.tsx (Langkah 10: Tukar Posisi P1 dan P3)

"use client";

import { useMemo, useState } from "react";
import { stockListData, type StockItem } from "@/lib/mock/stocklistmock";
import { 
  getProductByCode, // Import helper function
} from "@/lib/mock/product-master"; 
import { 
  clusterConfigs,
  getBarisCountForLorong,
  getPalletCapacityForCell,
  validateProductLocation,
  isInTransitLocation,
  getInTransitRange,
} from "@/lib/mock/warehouse-config";
import { X } from "lucide-react";


// --- TYPE & STATUS DEFINITION (BASED ON INITIAL FILE) ---
type StatusColor =
  | "green"  // RELEASE (produk yang expired date paling dekat)
  | "yellow" // HOLD (produk yang expired date lebih lama)
  | "blue"   // RECEH (produk sisa/sebagian diambil)
  | "red"    // WRONG_CLUSTER (produk lain yang tidak sesuai clusternya)
  | "empty";

type WarehouseCellStatus = "RELEASE" | "HOLD" | "RECEH" | "WRONG_CLUSTER";

export type WarehouseCell = {
  id: string;
  cluster: string; // Menggunakan string untuk cluster A-E
  lorong: number;
  baris: number;
  pallet: number;
  product?: string;
  bbPallet?: string | string[]; // Support untuk array (multiple BB untuk receh)
  qtyPallet?: number;
  qtyCarton?: number;
  status?: WarehouseCellStatus;
  colorCode?: StatusColor;
  assignedCluster?: string;
  isReceh?: boolean; // Flag untuk receh
  isInTransit?: boolean; // Flag untuk In Transit area
};

const colorMap: Record<StatusColor, string> = {
  green: "bg-green-500",    
  yellow: "bg-yellow-400",  
  blue: "bg-blue-500",      
  red: "bg-red-500",        
  empty: "bg-white border border-slate-300",
};

// =========================================================================
// LOGIC: DYNAMIC CLUSTER MAPPING & VALIDATION (NOW USING warehouse-config)
// =========================================================================

// Legacy code kept for reference (now using validateProductLocation from warehouse-config)
// const generateClusterProductMap = (masterData: ProductMaster[]): Record<string, string[]> => { ... }

// 3. GENERATE CELLS (DYNAMIC BASED ON CLUSTER CONFIG)
function generateWarehouseCells(): WarehouseCell[] {
  const cells: WarehouseCell[] = [];
  const locationMap = new Map<string, StockItem>();
  
  // Mapping stok ke kunci numerik
  stockListData.forEach((stock: StockItem) => {
    const lorongNum = parseInt(stock.location.lorong.replace("L", ""));
    const barisNum = parseInt(stock.location.baris.replace("B", ""));
    const palletNum = parseInt(stock.location.level.replace("P", ""));
    const key = `${stock.location.cluster}-${lorongNum}-${barisNum}-${palletNum}`;
    locationMap.set(key, stock);
  });
  
  // Loop through all active cluster configs (DYNAMIC)
  clusterConfigs.filter(c => c.isActive).forEach((clusterConfig) => {
    const cluster = clusterConfig.cluster;
    const maxLorong = clusterConfig.defaultLorongCount;
    
    for (let lorong = 1; lorong <= maxLorong; lorong++) {
      // Get baris count for this specific lorong (DYNAMIC)
      const maxBaris = getBarisCountForLorong(cluster, lorong);
      
      for (let baris = 1; baris <= maxBaris; baris++) {
        // Get pallet capacity for this specific cell (DYNAMIC)
        const maxPallet = getPalletCapacityForCell(cluster, lorong, baris);
        
        for (let pallet = 1; pallet <= maxPallet; pallet++) { 
          const key = `${cluster}-${lorong}-${baris}-${pallet}`;
          const stock = locationMap.get(key);
          
          // Check if this location is in In Transit area
          const inTransit = isInTransitLocation(cluster, lorong);
          
          if (stock) {
            let colorCode: StatusColor = "green";
            let status: WarehouseCellStatus = "RELEASE";
            
            // --- IN TRANSIT: Always RED (buffer/overflow products) ---
            if (inTransit) {
              colorCode = "red";
              status = "WRONG_CLUSTER"; // Reuse status for visual consistency
            } else {
              // --- VALIDASI PRODUCT LOCATION (for non In Transit) ---
              const validation = validateProductLocation(stock.productCode, cluster, lorong, baris);
              const wrongCluster = !validation.isValid;
              
              if (wrongCluster) {
                colorCode = "red";
                status = "WRONG_CLUSTER";
              } else {
                // LOGIKA LAMA: Cek Expired Date (FEFO)
                const today = new Date();
                const expDate = new Date(stock.expiredDate);
                const diffTime = expDate.getTime() - today.getTime();
                const daysToExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (daysToExpiry <= 90) {
                  colorCode = "green"; // RELEASE
                  status = "RELEASE";
                } else {
                  colorCode = "yellow"; // HOLD
                  status = "HOLD";
                }
                
                // Cek apakah receh (jika ada isReceh flag dari stock)
                if (stock.isReceh) {
                  colorCode = "blue";
                  status = "RECEH";
                }
              }
            }
          
          cells.push({
            id: key,
            cluster,
            lorong,
            baris,
            pallet,
            product: stock.productName,
            bbPallet: stock.bbPallet,
            qtyPallet: stock.qtyPallet,
            qtyCarton: stock.qtyCarton,
            status,
            colorCode,
            assignedCluster: stock.location.cluster,
            isReceh: stock.isReceh,
            isInTransit: inTransit,
          });
          } else {
            // Sel kosong
            cells.push({
              id: key,
              cluster,
              lorong,
              baris,
              pallet,
              colorCode: "empty",
              isInTransit: inTransit,
            });
          }
        }
      }
    }
  });
  
  return cells;
}

// 4. PalletInfoModal
type PalletInfoModalProps = {
  cell: WarehouseCell | null;
  open: boolean;
  onClose: () => void;
};

function PalletInfoModal({ cell, open, onClose }: PalletInfoModalProps) {
  if (!open || !cell) return null;

  const productDetail = cell.product ? getProductByCode(cell.product) : null;
  const totalPcs = (cell.qtyCarton ?? 0) * (productDetail?.qtyPerCarton ?? 1); 

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-blue-500 px-4 sm:px-6 py-4 sm:py-5 rounded-t-2xl sticky top-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-white">
              Detail Pallet
            </h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl font-light transition-colors w-8 h-8 flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
              <p className="text-xs font-medium text-slate-500 mb-1">Produk</p>
              <p className="font-semibold text-slate-900 text-xs sm:text-sm wrap-break-word">
                {cell.product ?? "-"}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
              <p className="text-xs font-medium text-slate-500 mb-1">BB Pallet</p>
              <p className="font-semibold text-slate-900 text-xs sm:text-sm">
                {cell.bbPallet 
                  ? Array.isArray(cell.bbPallet) 
                    ? cell.bbPallet.join(", ") 
                    : cell.bbPallet 
                  : "-"}
              </p>
              {cell.isReceh && Array.isArray(cell.bbPallet) && cell.bbPallet.length > 1 && (
                <p className="text-[10px] text-blue-600 mt-1">
                  🔵 Receh: {cell.bbPallet.length} BB dalam 1 pallet
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-emerald-50 rounded-lg p-3 sm:p-4 border border-emerald-200">
              <p className="text-xs font-medium text-emerald-700 mb-1">
                Qty Pallet (Tumpukan)
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-emerald-600">
                {cell.qtyPallet ?? 0}
              </p>
              <p className="text-[10px] text-emerald-600 mt-1">
                = Jumlah tumpukan barang
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border border-blue-200">
              <p className="text-xs font-medium text-blue-700 mb-1">
                Qty Carton (Kardus)
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600">
                {cell.qtyCarton ?? 0}
              </p>
              <p className="text-[10px] text-blue-600 mt-1">
                = Total kardus di tumpukan
              </p>
            </div>
          </div>

          {/* Menampilkan total PCS */}
          {cell.product && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
              <p className="text-xs font-medium text-yellow-900 mb-1">Total Pieces (Units)</p>
              <p className="text-xl font-bold text-yellow-800">
                {totalPcs.toLocaleString()}
              </p>
            </div>
          )}


          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-900 font-medium mb-1">💡 Penjelasan:</p>
            <p className="text-[10px] sm:text-xs text-blue-800">
              <strong>Lokasi:</strong> L{cell.lorong}-B{cell.baris}-P{cell.pallet} adalah slot rak (lokasi fisik).<br/>
              <strong>Qty Pallet:</strong> Jumlah tumpukan barang yang disimpan di slot ini.<br/>
              <strong>Qty Carton:</strong> Total kardus dari semua tumpukan tersebut.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
              <p className="text-xs font-medium text-slate-500 mb-1">Cluster</p>
              <p className="font-semibold text-slate-900">{cell.cluster}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
              <p className="text-xs font-medium text-slate-500 mb-1">Lokasi Rak</p>
              <p className="font-semibold text-slate-900 text-xs sm:text-sm">
                L{cell.lorong}-B{cell.baris}-P{cell.pallet}
              </p>
            </div>
          </div>
          
          {/* Status dan Notifikasi Wrong Cluster */}
          <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
            <p className="text-xs font-medium text-slate-500 mb-1">Status</p>
            <p className={`font-semibold text-sm ${
              cell.status === "RELEASE" ? "text-green-600" :
              cell.status === "HOLD" ? "text-yellow-600" :
              cell.status === "RECEH" ? "text-blue-600" :
              "text-red-600"
            }`}>
              {cell.status === "RELEASE" ? "✓ RELEASE (Expired dekat, prioritas keluar)" :
               cell.status === "HOLD" ? "⏸ HOLD (Expired jauh, belum perlu keluar)" :
               cell.status === "RECEH" ? "📦 RECEH (Ada sisa, tidak full)" :
               "⚠️ SALAH CLUSTER (Perlu relokasi)"}
            </p>
            
            {cell.isInTransit && (
              <div className="p-3 mt-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs">
                <p className="font-semibold">🚚 In Transit Area (Buffer/Overflow):</p>
                <p>Lokasi ini adalah area buffer sementara untuk produk overflow. Produk dapat disimpan di sini sementara menunggu relokasi ke home location yang sesuai.</p>
              </div>
            )}
            
            {cell.status === "WRONG_CLUSTER" && productDetail && !cell.isInTransit && (
              <div className="p-3 mt-3 bg-red-100 border-l-4 border-red-500 text-red-700 text-xs">
                <p className="font-semibold">Perhatian:</p>
                <p>Produk ini seharusnya diletakkan di Cluster 
                  <span className="font-bold text-red-900"> {productDetail.defaultCluster || 'N/A'}</span>.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-blue-500 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-600 transition-all shadow-lg hover:shadow-xl active:scale-98"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}


export function WarehouseLayout() {
  const [selectedCell, setSelectedCell] = useState<WarehouseCell | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, _setStatusFilter] = useState<"ALL" | "RELEASE" | "HOLD" | "RECEH" | "WRONG_CLUSTER">("ALL");
  const [clusterFilter, _setClusterFilter] = useState<"ALL" | "A" | "B" | "C" | "D" | "E">("ALL");
  const [productFilter, _setProductFilter] = useState<string>("ALL");
  const [openClusters, setOpenClusters] = useState<Set<string>>(new Set());
  
  const toggleCluster = (cluster: string) => {
    setOpenClusters((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(cluster)) {
        newSet.delete(cluster);
      } else {
        newSet.add(cluster);
      }
      return newSet;
    });
  };


  // Generate cells from mock data
  const warehouseCells = useMemo(() => generateWarehouseCells(), []);

  // Get unique products for filter
  const _uniqueProducts = useMemo(() => {
    const products = new Set<string>();
    stockListData.forEach((stock: StockItem) => {
      if (stock.productName) products.add(stock.productName);
    });
    return Array.from(products).sort();
  }, []);

  // Filter cells based on search query and status filter
  const filteredCells = useMemo(() => {
    return warehouseCells.filter((cell) => {
      // Filter by cluster
      if (clusterFilter !== "ALL" && cell.cluster !== clusterFilter) {
        return false;
      }
      
      // Filter by product
      if (productFilter !== "ALL" && cell.product !== productFilter) {
        return false;
      }
      
      // Filter by status
      if (statusFilter !== "ALL" && cell.status !== statusFilter) {
        return false;
      }
      
      // Filter by search query (product name or BB pallet)
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const productMatch = cell.product?.toLowerCase().includes(query);
        
        // Handle bbPallet as both string and array
        let bbPalletMatch = false;
        if (cell.bbPallet) {
          if (Array.isArray(cell.bbPallet)) {
            bbPalletMatch = cell.bbPallet.some(bb => bb.toLowerCase().includes(query));
          } else {
            bbPalletMatch = cell.bbPallet.toLowerCase().includes(query);
          }
        }
        
        return productMatch || bbPalletMatch;
      }
      
      return true;
    });
  }, [warehouseCells, searchQuery, statusFilter, clusterFilter, productFilter]);

  // Group cells by cluster, lorong, and baris
  const cellsByCluster = useMemo(() => {
    const grouped: Record<string, {
      lorong: number;
      baris: number;
      pallets: WarehouseCell[];
    }[]> = {};
    
    filteredCells.forEach((cell) => {
      if (!grouped[cell.cluster]) {
        grouped[cell.cluster] = [];
      }
      
      let group = grouped[cell.cluster].find(
        (g) => g.lorong === cell.lorong && g.baris === cell.baris
      );
      
      if (!group) {
        group = { lorong: cell.lorong, baris: cell.baris, pallets: [] };
        grouped[cell.cluster].push(group);
      }
      
      group.pallets.push(cell);
    });
    
    // Sort pallets within each group
    Object.keys(grouped).forEach((cluster) => {
      grouped[cluster].forEach((group) => {
        group.pallets.sort((a, b) => a.pallet - b.pallet);
      });
      // Sort groups by lorong and baris
      grouped[cluster].sort((a, b) => {
        if (a.lorong !== b.lorong) return a.lorong - b.lorong;
        return a.baris - b.baris;
      });
    });
    
    return grouped;
  }, [filteredCells]);

  // FIX: Perhitungan Dinamis untuk Legend (Berdasarkan actual cells yang di-generate)
  const _getStockStats = () => {
    const stats = {
      totalItems: 0,
      Kosong: 0,
      TerisiNormal: 0, // HOLD (Yellow)
      FEFO_Alert: 0,   // RELEASE (Green)
      SalahCluster: 0, // WRONG_CLUSTER (Red)
    };
    
    // DYNAMIC: Total cells adalah jumlah aktual cells yang di-generate
    const totalCells = warehouseCells.length;

    warehouseCells.forEach(cell => {
      if (cell.colorCode === 'empty') {
        stats.Kosong++;
      } else {
        stats.totalItems++;
        if (cell.colorCode === 'yellow') {
          stats.TerisiNormal++; 
        } else if (cell.colorCode === 'green') {
          stats.FEFO_Alert++; 
        } else if (cell.colorCode === 'red') {
          stats.SalahCluster++;
        }
      }
    });

    if (stats.Kosong === 0 && stats.totalItems > 0) {
      stats.Kosong = totalCells - stats.totalItems;
    }
    
    return stats;
  };
  
  // Komponen Pallet untuk di-render di grid
  const PalletComponent = ({ cell }: { cell: WarehouseCell }) => {
    const isFilled = cell.colorCode !== "empty";
    const colorKey: StatusColor = cell.colorCode as StatusColor; 

    return (
        <button
          type="button"
          onClick={() => isFilled ? setSelectedCell(cell) : null}
          className={`
            flex-1 h-12 sm:h-14 rounded flex flex-col items-center justify-center
            ${colorMap[colorKey]}
            ${
              isFilled
                ? "cursor-pointer hover:scale-105 hover:shadow-md transition-all active:scale-95"
                : "cursor-default opacity-40"
            }
            text-[8px] sm:text-[9px] font-medium text-white shadow-sm
          `}
          title={`${cell.cluster}-L${cell.lorong}-B${cell.baris}-P${cell.pallet} - ${isFilled ? cell.product : 'Kosong'}`}
        >
          {isFilled ? (
            <div className="font-bold text-[9px] sm:text-[10px]">
                P{cell.pallet}
            </div>
          ) : (
            <div className="text-slate-400 font-medium text-[8px]">
              P{cell.pallet}
            </div>
          )}
        </button>
    );
  };


  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header (Diambil dari file yang Anda inginkan) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                Warehouse Layout Visualization
              </h1>
              <p className="text-xs sm:text-sm text-slate-600">
                Peta lokasi stok produk dengan struktur dinamis berdasarkan konfigurasi cluster (Cluster × Lorong × Baris × Pallet).
              </p>
            </div>
          </div>
        </div>

        {/* Quick Filter & Search */}
        <div className="bg-white rounded-xl shadow-xl p-8 mb-8 mt-6">
            <h1 className="text-2xl font-bold text-gray-800">Warehouse Layout Visualization</h1>
            <p className="text-gray-500 mt-1">Visualisasi status lokasi gudang berdasarkan Master Data & Stok</p>

            <div className="mt-4 flex items-center gap-4">
                <input
                    type="text"
                    placeholder="Cari Lokasi, Produk (Code/Name), atau BB Pallet..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                    onClick={() => setSearchQuery("")}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
                >
                    <X size={20} /> Reset
                </button>
            </div>
        </div>


        {/* Warehouse View Sesuai Template Lama */}
        <div className="space-y-6">
          {clusterConfigs.filter(c => c.isActive).map((clusterConfig) => {
            const cluster = clusterConfig.cluster;
            const isOpen = openClusters.has(cluster);
            const clusterCells = cellsByCluster[cluster] || [];
            const filledCount = clusterCells.reduce((sum, group) => {
              return sum + group.pallets.filter(p => p.product).length;
            }, 0);
            
            // DYNAMIC: Calculate total slots for this cluster
            let totalCount = 0;
            for (let lorong = 1; lorong <= clusterConfig.defaultLorongCount; lorong++) {
              const barisCount = getBarisCountForLorong(cluster, lorong);
              for (let baris = 1; baris <= barisCount; baris++) {
                const palletCapacity = getPalletCapacityForCell(cluster, lorong, baris);
                totalCount += palletCapacity;
              }
            }
            
            return (
              <div key={cluster} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Cluster Header - Clickable */}
                <button
                  onClick={() => toggleCluster(cluster)}
                  className="w-full px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="bg-blue-500 text-white w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-base sm:text-lg font-bold">
                      {cluster}
                    </span>
                    <div className="text-left">
                      <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                        Cluster {cluster}
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500">
                        {filledCount} dari {totalCount} slot di Lorong L1-L{clusterConfig.defaultLorongCount} terisi
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isOpen ? (
                      <span className="text-slate-400">▲</span>
                    ) : (
                      <span className="text-slate-400">▼</span>
                    )}
                  </div>
                </button>
                
                {/* Cluster Content - Collapsible */}
                {isOpen && (
                  <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-slate-200">
                    <div className="mt-4">
                      <div className="overflow-x-auto">
                        <div className="inline-block min-w-full">
                          {(() => {
                            // DYNAMIC: Get max baris for this cluster (across all lorong)
                            const maxBaris = Math.max(
                              ...Array.from({ length: clusterConfig.defaultLorongCount }, (_, i) => i + 1)
                                .map(lorong => getBarisCountForLorong(cluster, lorong))
                            );
                            
                            return (
                              <>
                                {/* Header Baris (DYNAMIC) */}
                                <div className="flex mb-2">
                                  <div className="w-16 sm:w-20 shrink-0" /> 
                                  {Array.from({ length: maxBaris }, (_, i) => i + 1).map((barisNum) => (
                                    <div key={barisNum} className="w-20 sm:w-24 text-center shrink-0">
                                      <div className="text-xs font-semibold text-slate-600 bg-slate-100 rounded px-2 py-1">
                                        B{barisNum}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                
                                {/* Lorong Rows (DYNAMIC based on cluster config) */}
                                {Array.from({ length: clusterConfig.defaultLorongCount }, (_, i) => i + 1).map((lorongNum) => {
                                  const barisCountForThisLorong = getBarisCountForLorong(cluster, lorongNum);
                                  const isInTransitLorong = isInTransitLocation(cluster, lorongNum);
                                  
                                  return (
                                    <div key={lorongNum} className="flex mb-2">
                                      {/* Lorong Label */}
                                      <div className="w-16 sm:w-20 shrink-0 flex items-center">
                                        <div className={`text-xs font-semibold rounded px-2 py-1 ${
                                          isInTransitLorong 
                                            ? "text-red-700 bg-red-100 border border-red-300" 
                                            : "text-slate-600 bg-slate-100"
                                        }`}>
                                          L{lorongNum}
                                          {isInTransitLorong && (
                                            <div className="text-[8px] text-red-600">IN TRANSIT</div>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {/* Baris Cells (DYNAMIC for each lorong) */}
                                      {Array.from({ length: maxBaris }, (_, i) => i + 1).map((barisNum) => {
                                        // If this baris doesn't exist for this lorong, render empty spacer
                                        if (barisNum > barisCountForThisLorong) {
                                          return (
                                            <div key={barisNum} className="w-20 sm:w-24 shrink-0 px-1">
                                              <div className="flex gap-0.5 h-12 sm:h-14 items-center justify-center">
                                                <span className="text-xs text-slate-300">-</span>
                                              </div>
                                            </div>
                                          );
                                        }
                                        
                                        const group = cellsByCluster[cluster]?.find(
                                          (g) => g.lorong === lorongNum && g.baris === barisNum
                                        );
                                        
                                        // DYNAMIC: Get actual pallet capacity for this cell
                                        const palletCapacity = getPalletCapacityForCell(cluster, lorongNum, barisNum);
                                        const palletNumbers = Array.from({ length: palletCapacity }, (_, i) => palletCapacity - i); // Reverse order: P3, P2, P1
                                        
                                        return (
                                          <div key={barisNum} className="w-20 sm:w-24 shrink-0 px-1">
                                            <div className="flex gap-0.5">
                                              {/* DYNAMIC Pallets (quantity based on config) */}
                                              {palletNumbers.map((palletNum) => {
                                                // Cari cell di filteredCells
                                                const cell = group?.pallets.find((p) => p.pallet === palletNum) || 
                                                  warehouseCells.find(c => c.cluster === cluster && c.lorong === lorongNum && c.baris === barisNum && c.pallet === palletNum) || 
                                                  {id: `${cluster}-L${lorongNum}-B${barisNum}-P${palletNum}`, cluster, lorong: lorongNum, baris: barisNum, pallet: palletNum, colorCode: "empty"} as WarehouseCell;
                                                
                                                return (
                                                  <PalletComponent key={palletNum} cell={cell} />
                                                );
                                              })}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    
                    {/* Info untuk cluster ini */}
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-green-500" />
                          <span>Release (Expired dekat)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-yellow-400" />
                          <span>Hold (Expired jauh)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-blue-500" />
                          <span>Receh (Ada sisa)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-red-500" />
                          <span>Salah Cluster</span>
                        </div>
                        {getInTransitRange(cluster) && (
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-red-100 border border-red-400" />
                            <span className="font-semibold text-red-700">In Transit (Buffer/Overflow Area)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <PalletInfoModal
        cell={selectedCell}
        open={!!selectedCell}
        onClose={() => setSelectedCell(null)}
      />
    </div>
  );
}