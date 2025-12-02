"use client";

import { useMemo, useState } from "react";
import { stockListData, type StockItem } from "@/lib/mock/stocklistmock";

type StatusColor =
  | "green"  // RELEASE (produk yang expired date paling dekat)
  | "yellow" // HOLD (produk yang expired date lebih lama)
  | "blue"   // RECEH (produk sisa/sebagian diambil)
  | "red"    // WRONG_CLUSTER (produk lain yang tidak sesuai clusternya)
  | "empty";

type WarehouseCellStatus = "RELEASE" | "HOLD" | "RECEH" | "WRONG_CLUSTER";

export type WarehouseCell = {
  id: string;
  cluster: "A" | "B" | "C" | "D" | "E";
  lorong: number; // L1, L2, ... L11
  baris: number;  // B1, B2, ... B9
  pallet: number; // P1, P2, P3
  product?: string;
  bbPallet?: string;
  qtyPallet?: number;
  qtyCarton?: number;
  status?: WarehouseCellStatus;
  colorCode?: StatusColor;
  assignedCluster?: string; // cluster yang seharusnya untuk produk ini
};

const colorMap: Record<StatusColor, string> = {
  green: "bg-green-500",    // RGB green untuk RELEASE
  yellow: "bg-yellow-400",  // RGB yellow untuk HOLD
  blue: "bg-blue-500",      // RGB blue untuk RECEH
  red: "bg-red-500",        // RGB red untuk WRONG_CLUSTER
  empty: "bg-white border border-slate-300",
};

// 👉 Generate warehouse cells: 5 clusters × 11 lorong × 9 baris × 3 pallet
function generateWarehouseCells(): WarehouseCell[] {
  const cells: WarehouseCell[] = [];
  const clusters: Array<"A" | "B" | "C" | "D" | "E"> = ["A", "B", "C", "D", "E"];
  
  // Buat map dari stock mock untuk akses cepat
  // Key: cluster-lorong-baris-pallet (format: A-L1-B1-P1)
  const locationMap = new Map<string, StockItem>();
  
  stockListData.forEach((stock: StockItem) => {
    // Parse lorong, baris, dan pallet dari format location
    // Format sekarang: lorong = "L1", baris = "B1", level = "P1"
    const lorongNum = parseInt(stock.location.lorong.replace("L", ""));
    const barisNum = parseInt(stock.location.baris.replace("B", ""));
    const palletNum = parseInt(stock.location.level.replace("P", ""));
    
    // Create key untuk mapping
    const key = `${stock.location.cluster}-${lorongNum}-${barisNum}-${palletNum}`;
    locationMap.set(key, stock);
  });
  
  // Generate semua sel warehouse
  clusters.forEach((cluster) => {
    for (let lorong = 1; lorong <= 11; lorong++) {
      for (let baris = 1; baris <= 9; baris++) {
        for (let pallet = 1; pallet <= 3; pallet++) {
          // Cek apakah ada stock di lokasi ini
          const key = `${cluster}-${lorong}-${baris}-${pallet}`;
          const stock = locationMap.get(key);
          
          if (stock) {
            // Ada produk di lokasi ini
            let colorCode: StatusColor = "green";
            let status: WarehouseCellStatus = "RELEASE";
            
            // Cluster to Product mapping untuk validasi
            const clusterProductMap: Record<string, string> = {
              "A": "AQ-200ML-48",
              "B": "AQ-600ML-24",
              "C": "AQ-1500ML-12",
              "D": "AQ-330ML-24",
            };
            
            const expectedProduct = clusterProductMap[cluster];
            const isWrongCluster = expectedProduct && stock.productCode !== expectedProduct;
            
            // Tentukan warna berdasarkan kondisi dengan prioritas:
            // 1. RED - Wrong cluster (produk tidak sesuai dengan cluster)
            if (isWrongCluster) {
              colorCode = "red";
              status = "WRONG_CLUSTER";
            }
            // 2. GREEN - Near expiry (10-90 hari) - prioritas FEFO
            else {
              const today = new Date();
              const expDate = new Date(stock.expiredDate);
              const daysToExpiry = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              
              if (daysToExpiry <= 90) {
                colorCode = "green";
                status = "RELEASE";
              }
              // 3. YELLOW - Medium to long expiry (91+ hari)
              else {
                colorCode = "yellow";
                status = "HOLD";
              }
            }
            
            cells.push({
              id: `${cluster}-L${lorong}-B${baris}-P${pallet}`,
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
            });
          } else {
            // Sel kosong
            cells.push({
              id: `${cluster}-L${lorong}-B${baris}-P${pallet}`,
              cluster,
              lorong,
              baris,
              pallet,
              colorCode: "empty",
            });
          }
        }
      }
    }
  });
  
  return cells;
}

type PalletInfoModalProps = {
  cell: WarehouseCell | null;
  open: boolean;
  onClose: () => void;
};

function PalletInfoModal({ cell, open, onClose }: PalletInfoModalProps) {
  if (!open || !cell) return null;

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
                {cell.bbPallet ?? "-"}
              </p>
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
  const [statusFilter, setStatusFilter] = useState<"ALL" | "RELEASE" | "HOLD" | "RECEH" | "WRONG_CLUSTER">("ALL");
  const [clusterFilter, setClusterFilter] = useState<"ALL" | "A" | "B" | "C" | "D" | "E">("ALL");
  const [productFilter, setProductFilter] = useState<string>("ALL");
  const [openClusters, setOpenClusters] = useState<Set<string>>(new Set());

  // Generate cells from mock data
  const warehouseCells = useMemo(() => generateWarehouseCells(), []);

  // Get unique products for filter
  const uniqueProducts = useMemo(() => {
    const products = new Set<string>();
    stockListData.forEach((stock: StockItem) => {
      if (stock.productName) products.add(stock.productName);
    });
    return Array.from(products).sort();
  }, []);

  // Toggle cluster open/close
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
        const bbPalletMatch = cell.bbPallet?.toLowerCase().includes(query);
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

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
          Layout Gudang
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          Peta lokasi stok produk dengan struktur 5 Cluster × 11 Lorong × 9 Baris × 3 Pallet (Slot Rak).
        </p>
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-slate-700">
            <span className="font-semibold">📍 Catatan:</span> Pallet di sini adalah <strong>slot rak</strong> (lokasi fisik: L-B-P). 
            Sedangkan <strong>Qty Pallet</strong> adalah jumlah tumpukan barang yang disimpan di slot tersebut.
          </p>
        </div>
      </div>

      {/* Quick Filter & Search */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              🔍 Search Produk / Batch
            </label>
            <input
              type="text"
              placeholder="Cari nama produk atau batch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border-2 border-slate-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              📦 Filter Cluster
            </label>
            <select
              value={clusterFilter}
              onChange={(e) => setClusterFilter(e.target.value as "ALL" | "A" | "B" | "C" | "D" | "E")}
              className="w-full rounded-lg border-2 border-slate-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            >
              <option value="ALL">Semua Cluster</option>
              <option value="A">Cluster A</option>
              <option value="B">Cluster B</option>
              <option value="C">Cluster C</option>
              <option value="D">Cluster D</option>
              <option value="E">Cluster E</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              🏷️ Filter Produk
            </label>
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="w-full rounded-lg border-2 border-slate-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            >
              <option value="ALL">Semua Produk</option>
              {uniqueProducts.map((product) => (
                <option key={product} value={product}>
                  {product}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              📊 Filter Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "ALL" | "RELEASE" | "HOLD" | "RECEH" | "WRONG_CLUSTER")}
              className="w-full rounded-lg border-2 border-slate-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            >
              <option value="ALL">Semua Status</option>
              <option value="RELEASE">Release (Hijau)</option>
              <option value="HOLD">Hold (Kuning)</option>
              <option value="RECEH">Receh/Sisa (Biru)</option>
              <option value="WRONG_CLUSTER">Salah Cluster (Merah)</option>
            </select>
          </div>
        </div>
        
        {(searchQuery || statusFilter !== "ALL" || clusterFilter !== "ALL" || productFilter !== "ALL") && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-slate-600">
              Menampilkan <span className="font-semibold text-blue-600">{filteredCells.length}</span> dari {warehouseCells.length} lokasi
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("ALL");
                setClusterFilter("ALL");
                setProductFilter("ALL");
              }}
              className="rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all"
            >
              🔄 Reset Filter
            </button>
          </div>
        )}
        
        {filteredCells.length === 0 && (
          <div className="mt-4 text-center py-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-900 font-medium">
              ⚠️ Tidak ada pallet yang sesuai dengan filter
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Coba ubah kata kunci atau filter
            </p>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Main Grid Area */}
        <div className="space-y-4">
          {/* Toggle All Clusters Button */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                if (openClusters.size === 5) {
                  setOpenClusters(new Set());
                } else {
                  setOpenClusters(new Set(["A", "B", "C", "D", "E"]));
                }
              }}
              className="px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              {openClusters.size === 5 ? "🔽 Tutup Semua Cluster" : "🔼 Buka Semua Cluster"}
            </button>
          </div>
          
          {(["A", "B", "C", "D", "E"] as const).map((cluster) => {
            const isOpen = openClusters.has(cluster);
            const clusterCells = cellsByCluster[cluster] || [];
            const filledCount = clusterCells.reduce((sum, group) => {
              return sum + group.pallets.filter(p => p.product).length;
            }, 0);
            const totalCount = 11 * 9 * 3; // 11 lorong × 9 baris × 3 pallet
            
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
                        {filledCount} dari {totalCount} slot terisi
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
                      {/* Grid: Lorong (rows) × Baris (columns) */}
                      <div className="overflow-x-auto">
                        <div className="inline-block min-w-full">
                          {/* Header Baris */}
                          <div className="flex mb-2">
                            <div className="w-16 sm:w-20 shrink-0" /> {/* Space for lorong labels */}
                            {Array.from({ length: 9 }, (_, i) => i + 1).map((barisNum) => (
                              <div key={barisNum} className="w-20 sm:w-24 text-center shrink-0">
                                <div className="text-xs font-semibold text-slate-600 bg-slate-100 rounded px-2 py-1">
                                  B{barisNum}
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* Lorong Rows */}
                          {Array.from({ length: 11 }, (_, i) => i + 1).map((lorongNum) => (
                            <div key={lorongNum} className="flex mb-2">
                              {/* Lorong Label */}
                              <div className="w-16 sm:w-20 shrink-0 flex items-center">
                                <div className="text-xs font-semibold text-slate-600 bg-slate-100 rounded px-2 py-1">
                                  L{lorongNum}
                                </div>
                              </div>
                              
                              {/* Baris Cells (each with 3 pallets) */}
                              {Array.from({ length: 9 }, (_, i) => i + 1).map((barisNum) => {
                                const group = clusterCells.find(
                                  (g) => g.lorong === lorongNum && g.baris === barisNum
                                );
                                
                                return (
                                  <div key={barisNum} className="w-20 sm:w-24 shrink-0 px-1">
                                    <div className="flex gap-0.5">
                                      {/* 3 Pallets Horizontal */}
                                      {[1, 2, 3].map((palletNum) => {
                                        const cell = group?.pallets.find((p) => p.pallet === palletNum);
                                        const isFilled = !!cell?.product;
                                        const colorKey: StatusColor = isFilled
                                          ? cell.colorCode ?? "green"
                                          : "empty";

                                        return (
                                          <button
                                            key={palletNum}
                                            type="button"
                                            onClick={() =>
                                              cell?.product ? setSelectedCell(cell) : null
                                            }
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
                                            title={isFilled ? `${cell.product} - P${palletNum}` : `Kosong - P${palletNum}`}
                                          >
                                            {isFilled ? (
                                              <>
                                                <div className="font-bold text-[9px] sm:text-[10px]">
                                                  P{palletNum}
                                                </div>
                                              </>
                                            ) : (
                                              <div className="text-slate-400 font-medium text-[8px]">
                                                P{palletNum}
                                              </div>
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ))}
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
