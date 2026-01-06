"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Navigation } from "@/components/navigation";

// --- TYPES ---
interface StockItem {
  id: string;
  cluster: string;
  lorong: number;
  baris: number;
  level: number;
  qty_pallet: number;
  qty_carton: number;
  expired_date: string;
  status: string;
  is_receh: boolean;
  bb_produk: string;
  fefo_status: string;
  products: {
    id: string;
    product_code: string;
    product_name: string;
    default_cluster: string;
  };
}

export type WarehouseCell = {
  id: string;
  clusterChar: string;
  lorong: number;
  baris: number;
  pallet: number;
  productCode?: string;
  product?: string;
  bbPallet?: string;
  qtyPallet?: number;
  qtyCarton?: number;
  status?: string;
  fefoStatus?: string;
  isReceh?: boolean;
  colorCode: "green" | "yellow" | "blue" | "red" | "empty";
  isInTransit?: boolean;
};

const colorMap = {
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  blue: "bg-blue-500",
  red: "bg-red-500",
  empty: "bg-white border border-slate-300",
};

export default function WarehouseLayoutClient({
  userProfile,
  initialStocks,
  clusterConfigs,
  clusterCellOverrides,
  productHomes,
}: {
  userProfile: any;
  initialStocks: any[];
  clusterConfigs: any[];
  clusterCellOverrides: any[];
  productHomes: any[];
}) {


  const [selectedCell, setSelectedCell] = useState<WarehouseCell | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "normal" | "receh" | "salah-cluster" | "expired">("all");
  const [filterFefoStatus, setFilterFefoStatus] = useState<"all" | "release" | "hold">("all");
  const [clusterFilter, setClusterFilter] = useState<string>("ALL");
  const [productFilter, setProductFilter] = useState<string>("ALL");
  const [lorongFilter, setLorongFilter] = useState<string>("ALL");
  const [barisFilter, setBarisFilter] = useState<string>("ALL");
  const [openClusters, setOpenClusters] = useState<Set<string>>(new Set());

  const toggleCluster = (cluster: string) => {
    setOpenClusters((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(cluster)) newSet.delete(cluster);
      else newSet.add(cluster);
      return newSet;
    });
  };

  // Helper functions for badges (matching Stock List)
  const getConditionBadges = (cell: WarehouseCell) => {
    const badges = [];
    
    // Physical condition badges
    if (cell.status === "salah-cluster" || cell.status === "wrong_cluster") {
      badges.push(
        <span key="salah-cluster" className="px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-600">
          Salah Cluster
        </span>
      );
    }
    if (cell.status === "receh" || cell.isReceh) {
      badges.push(
        <span key="receh" className="px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-600">
          Receh
        </span>
      );
    }
    if (cell.status === "expired") {
      badges.push(
        <span key="expired" className="px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-600">
          Expired
        </span>
      );
    }
    
    // If no special condition, show normal
    if (badges.length === 0) {
      badges.push(
        <span key="normal" className="px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
          Normal
        </span>
      );
    }
    
    return badges;
  };

  const getFefoBadge = (fefoStatus: string) => {
    if (fefoStatus === "release") {
      return (
        <span className="px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-600">
          Release
        </span>
      );
    } else if (fefoStatus === "hold") {
      return (
        <span className="px-2 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-600">
          Hold
        </span>
      );
    }
    return null;
  };

  const warehouseCells = useMemo(() => {
    const cells: WarehouseCell[] = [];
    const locationMap = new Map<string, StockItem>();

    // Simpan data dengan level asli dari database
    initialStocks.forEach((stock: StockItem) => {
      const key = `${stock.cluster}-${stock.lorong}-${stock.baris}-${stock.level}`;
      locationMap.set(key, stock);
    });

    // Loop through all cluster configs (sort by cluster_char for alphabetical order)
    const sortedConfigs = [...clusterConfigs].sort((a, b) => 
      a.cluster_char.localeCompare(b.cluster_char)
    );

    sortedConfigs.forEach((config) => {
      const cluster = config.cluster_char;
      
      // Calculate max lorong including overrides that extend beyond default
      const overridesForCluster = clusterCellOverrides.filter((o: any) => o.cluster_config_id === config.id);
      const maxLorongFromOverrides = overridesForCluster.length > 0
        ? Math.max(...overridesForCluster.map((o: any) => o.lorong_end || 0))
        : 0;
      const maxLorong = Math.max(config.default_lorong_count, maxLorongFromOverrides);

      for (let lorong = 1; lorong <= maxLorong; lorong++) {
        // Find all overrides that apply to this lorong
        const applicableOverrides = clusterCellOverrides.filter((o: any) => 
          o.cluster_config_id === config.id &&
          o.lorong_start <= lorong &&
          o.lorong_end >= lorong
        );

        // Check if this lorong is in transit area (check any override)
        const isTransitLorong = applicableOverrides.some((o: any) => o.is_transit_area === true);

        // Determine max baris for this lorong
        // Find override with custom_baris_count (if any)
        const barisCountOverride = applicableOverrides.find((o: any) => 
          o.custom_baris_count !== null && o.custom_baris_count !== undefined
        );
        const maxBaris = barisCountOverride?.custom_baris_count ?? config.default_baris_count;

        for (let baris = 1; baris <= maxBaris; baris++) {
          // Find the most specific override for this baris
          // Priority: override with baris range that includes this baris
          const specificOverride = applicableOverrides.find((o: any) => 
            o.baris_start !== null && o.baris_start !== undefined &&
            o.baris_end !== null && o.baris_end !== undefined &&
            baris >= o.baris_start && baris <= o.baris_end &&
            o.custom_pallet_level !== null && o.custom_pallet_level !== undefined
          );

          // If no specific override, check for general override (no baris range)
          const generalOverride = applicableOverrides.find((o: any) =>
            (o.baris_start === null || o.baris_start === undefined) &&
            (o.baris_end === null || o.baris_end === undefined) &&
            o.custom_pallet_level !== null && o.custom_pallet_level !== undefined
          );

          // Determine max pallet for this location
          const maxPallet = specificOverride?.custom_pallet_level 
            ?? generalOverride?.custom_pallet_level 
            ?? config.default_pallet_level;

          // Render pallets from P3 to P1 (reverse order for display)
          for (let pallet = maxPallet; pallet >= 1; pallet--) {
            const key = `${cluster}-${lorong}-${baris}-${pallet}`;
            const stock = locationMap.get(key);

            if (stock) {
              let color: "green" | "yellow" | "blue" | "red" = "green";
              
              // Get product home rule
              const homeRule = productHomes.find((h: any) => h.product_id === stock.products?.id);
              
              // Check if product is in wrong cluster
              const isWrongCluster = stock.cluster !== stock.products?.default_cluster;

              // PRIORITY LOGIC: salah-cluster > receh > expired > release/hold
              if (isTransitLorong) {
                color = "red"; // In Transit always red
              } else if (isWrongCluster || stock.status === "salah-cluster") {
                color = "red"; // Wrong cluster or salah-cluster status
              } else if (stock.status === "receh" || stock.is_receh) {
                color = "blue"; // Receh
              } else if (stock.status === "expired") {
                color = "red"; // Expired
              } else if (stock.fefo_status === "release") {
                color = "green"; // Release
              } else if (stock.fefo_status === "hold") {
                color = "yellow"; // Hold
              }

              cells.push({
                id: key,
                clusterChar: cluster,
                lorong,
                baris,
                pallet,
                productCode: stock.products?.product_code,
                product: stock.products?.product_name,
                bbPallet: stock.bb_produk,
                qtyPallet: stock.qty_pallet,
                qtyCarton: stock.qty_carton,
                status: isWrongCluster ? "wrong_cluster" : stock.status,
                fefoStatus: stock.fefo_status,
                isReceh: stock.is_receh,
                colorCode: color,
                isInTransit: isTransitLorong,
              });
            } else {
              // Empty cell
              cells.push({
                id: key,
                clusterChar: cluster,
                lorong,
                baris,
                pallet,
                colorCode: "empty",
                isInTransit: isTransitLorong,
              });
            }
          }
        }
      }
    });
    return cells;
  }, [initialStocks, clusterConfigs, clusterCellOverrides, productHomes]);

  const filteredCells = useMemo(() => {
    return warehouseCells.filter((cell) => {
      // Filter by cluster
      if (clusterFilter !== "ALL" && cell.clusterChar !== clusterFilter) {
        return false;
      }
      
      // Filter by lorong
      if (lorongFilter !== "ALL" && cell.lorong !== parseInt(lorongFilter)) {
        return false;
      }
      
      // Filter by baris
      if (barisFilter !== "ALL" && cell.baris !== parseInt(barisFilter)) {
        return false;
      }
      
      // Filter by product
      if (productFilter !== "ALL" && cell.product !== productFilter) {
        return false;
      }
      
      // Filter by Status Kondisi (physical status)
      if (filterStatus !== "all") {
        if (filterStatus === "receh") {
          if (cell.status !== "receh" && !cell.isReceh) return false;
        } else if (filterStatus === "normal") {
          if (cell.status === "receh" || cell.isReceh || cell.status === "salah-cluster" || cell.status === "expired" || cell.status === "wrong_cluster") return false;
        } else {
          if (cell.status !== filterStatus && (filterStatus !== "salah-cluster" || cell.status !== "wrong_cluster")) return false;
        }
      }
      
      // Filter by Status FEFO (queue status)
      if (filterFefoStatus !== "all") {
        if (cell.fefoStatus !== filterFefoStatus) return false;
      }
      
      // Filter by search query (product name, product code, BB pallet, or location)
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        
        // Search in product name
        const productMatch = cell.product?.toLowerCase().includes(query);
        
        // Search in product code
        const productCodeMatch = cell.productCode?.toLowerCase().includes(query);
        
        // Search in BB pallet
        const bbPalletMatch = cell.bbPallet?.toLowerCase().includes(query);
        
        // Search in location (e.g., "A-L1-B2-P3" or "A L1 B2 P3")
        const locationString = `${cell.clusterChar} L${cell.lorong} B${cell.baris} P${cell.pallet}`.toLowerCase();
        const locationMatch = locationString.includes(query) || 
                             locationString.replace(/ /g, '-').includes(query);
        
        return productMatch || productCodeMatch || bbPalletMatch || locationMatch;
      }
      
      return true;
    });
  }, [warehouseCells, clusterFilter, lorongFilter, barisFilter, productFilter, filterStatus, filterFefoStatus, searchQuery]);

  // Get unique products for filter
  const uniqueProducts = useMemo(() => {
    const products = new Set<string>();
    warehouseCells.forEach((cell) => {
      if (cell.product) products.add(cell.product);
    });
    return Array.from(products).sort();
  }, [warehouseCells]);

  // Get unique lorongs for filter (based on selected cluster)
  const uniqueLorongs = useMemo(() => {
    const lorongs = new Set<number>();
    warehouseCells.forEach((cell) => {
      if (clusterFilter === "ALL" || cell.clusterChar === clusterFilter) {
        lorongs.add(cell.lorong);
      }
    });
    return Array.from(lorongs).sort((a, b) => a - b);
  }, [warehouseCells, clusterFilter]);

  // Get unique baris for filter (based on selected cluster and lorong)
  const uniqueBaris = useMemo(() => {
    const baris = new Set<number>();
    warehouseCells.forEach((cell) => {
      if ((clusterFilter === "ALL" || cell.clusterChar === clusterFilter) &&
          (lorongFilter === "ALL" || cell.lorong === parseInt(lorongFilter))) {
        baris.add(cell.baris);
      }
    });
    return Array.from(baris).sort((a, b) => a - b);
  }, [warehouseCells, clusterFilter, lorongFilter]);

  // TIPE DATA DIDEFINISIKAN DI SINI UNTUK MENGHINDARI ERROR 'ANY'
  const groupedCells = useMemo(() => {
    const grouped: Record<
      string,
      { lorong: number; baris: number; pallets: WarehouseCell[] }[]
    > = {};
    
    filteredCells.forEach((cell) => {
      if (!grouped[cell.clusterChar]) {
        grouped[cell.clusterChar] = [];
      }
      
      let group = grouped[cell.clusterChar].find(
        (g) => g.lorong === cell.lorong && g.baris === cell.baris
      );
      
      if (!group) {
        group = { lorong: cell.lorong, baris: cell.baris, pallets: [] };
        grouped[cell.clusterChar].push(group);
      }
      
      group.pallets.push(cell);
    });
    
    // Sort pallets within each group - DESCENDING (P3 -> P2 -> P1)
    Object.keys(grouped).forEach((cluster) => {
      grouped[cluster].forEach((group) => {
        group.pallets.sort((a, b) => b.pallet - a.pallet); // Ubah ke descending
      });
      // Sort groups by lorong and baris
      grouped[cluster].sort((a, b) => {
        if (a.lorong !== b.lorong) return a.lorong - b.lorong;
        return a.baris - b.baris;
      });
    });
    
    return grouped;
  }, [filteredCells]);

  // Komponen Pallet untuk di-render di grid
  const PalletComponent = ({ cell }: { cell: WarehouseCell }) => {
    const isFilled = cell.colorCode !== "empty";
    const colorKey = cell.colorCode;

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
        title={`${cell.clusterChar}-L${cell.lorong}-B${cell.baris}-P${cell.pallet} - ${isFilled ? cell.product : 'Kosong'}`}
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
    <>
      <Navigation userProfile={userProfile} />
      <div className="min-h-screen bg-slate-50 lg:pl-8">
        <div className="w-full max-w-full p-4">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4 mb-3">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 mb-1">
              Warehouse Layout
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-600">
              Peta lokasi stok produk (Cluster × Lorong × Baris × Pallet)
            </p>
          </div>

          {/* Quick Filter & Search */}
          <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 mb-3">
            <h2 className="text-sm sm:text-base font-bold text-gray-800 mb-2">🔍 Pencarian & Filter</h2>

            {/* Search Bar */}
            <div className="mb-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Cari Lokasi, Produk, atau BB Pallet..."
                  className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-1"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Advanced Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {/* Cluster Filter */}
              <div>
                <label className="block text-[10px] sm:text-xs font-semibold text-gray-700 mb-1">
                  Cluster
                </label>
                <select
                  value={clusterFilter}
                  onChange={(e) => {
                    setClusterFilter(e.target.value);
                    setLorongFilter("ALL");
                    setBarisFilter("ALL");
                  }}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all bg-white"
                >
                  <option value="ALL">Semua</option>
                  {clusterConfigs.map((c: any) => (
                    <option key={c.cluster_char} value={c.cluster_char}>
                      Cluster {c.cluster_char}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lorong Filter */}
              <div>
                <label className="block text-[10px] sm:text-xs font-semibold text-gray-700 mb-1">
                  Lorong
                </label>
                <select
                  value={lorongFilter}
                  onChange={(e) => {
                    setLorongFilter(e.target.value);
                    setBarisFilter("ALL");
                  }}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all bg-white"
                >
                  <option value="ALL">Semua</option>
                  {uniqueLorongs.map((l) => (
                    <option key={l} value={l}>L{l}</option>
                  ))}
                </select>
              </div>

              {/* Baris Filter */}
              <div>
                <label className="block text-[10px] sm:text-xs font-semibold text-gray-700 mb-1">
                  Baris
                </label>
                <select
                  value={barisFilter}
                  onChange={(e) => setBarisFilter(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all bg-white"
                >
                  <option value="ALL">Semua</option>
                  {uniqueBaris.map((b) => (
                    <option key={b} value={b}>B{b}</option>
                  ))}
                </select>
              </div>

              {/* Product Filter */}
              <div>
                <label className="block text-[10px] sm:text-xs font-semibold text-gray-700 mb-1">
                  Produk
                </label>
                <select
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all bg-white"
                >
                  <option value="ALL">Semua</option>
                  {uniqueProducts.map((p) => (
                    <option key={p} value={p}>
                      {p.length > 15 ? p.substring(0, 15) + '...' : p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Kondisi Filter */}
              <div>
                <label className="block text-[10px] sm:text-xs font-semibold text-gray-700 mb-1">
                  Status Kondisi
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as "all" | "normal" | "receh" | "salah-cluster" | "expired")}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all bg-white"
                >
                  <option value="all">Semua</option>
                  <option value="normal">Normal</option>
                  <option value="receh">Receh</option>
                  <option value="salah-cluster">Salah Cluster</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              {/* Status FEFO Filter */}
              <div>
                <label className="block text-[10px] sm:text-xs font-semibold text-gray-700 mb-1">
                  Status FEFO
                </label>
                <select
                  value={filterFefoStatus}
                  onChange={(e) => setFilterFefoStatus(e.target.value as "all" | "release" | "hold")}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all bg-white"
                >
                  <option value="all">Semua</option>
                  <option value="release">Release</option>
                  <option value="hold">Hold</option>
                </select>
              </div>
            </div>

            {/* Reset All Filters Button */}
            <div className="mt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <p className="text-[10px] sm:text-xs text-gray-600">
                {filteredCells.length} dari {warehouseCells.length} lokasi
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setClusterFilter("ALL");
                  setLorongFilter("ALL");
                  setBarisFilter("ALL");
                  setProductFilter("ALL");
                  setFilterStatus("all");
                  setFilterFefoStatus("all");
                }}
                className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold flex items-center gap-1"
              >
                <X size={12} />
                Reset
              </button>
            </div>
          </div>

          {/* Warehouse View */}
          <div className="space-y-3">
            {[...clusterConfigs]
              .sort((a, b) => a.cluster_char.localeCompare(b.cluster_char))
              .map((clusterConfig: any) => {
              const cluster = clusterConfig.cluster_char;
              const clusterCells = groupedCells[cluster] || [];
              
              if (clusterCells.length === 0) {
                return null;
              }
              
              const isOpen = openClusters.has(cluster);
              const filledCount = clusterCells.reduce((sum, group) => {
                return sum + group.pallets.filter(p => p.product).length;
              }, 0);
              
              const totalCount = clusterCells.reduce((sum, group) => {
                return sum + group.pallets.length;
              }, 0);
              
              return (
                <div key={cluster} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  {/* Cluster Header */}
                  <button
                    onClick={() => toggleCluster(cluster)}
                    className="w-full px-3 sm:px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="bg-blue-500 text-white w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-sm sm:text-base font-bold">
                        {cluster}
                      </span>
                      <div className="text-left">
                        <h2 className="text-sm sm:text-base font-bold text-slate-900">
                          Cluster {cluster}
                        </h2>
                        <p className="text-[10px] sm:text-xs text-slate-500">
                          {filledCount} dari {totalCount} slot di L1-L{clusterConfig.default_lorong_count} terisi
                        </p>
                      </div>
                    </div>
                    <span className="text-slate-400 text-sm">
                      {isOpen ? "▲" : "▼"}
                    </span>
                  </button>
                  
                  {/* Cluster Content */}
                  {isOpen && (
                    <div className="px-2 sm:px-4 pb-3 sm:pb-4 border-t border-slate-200">
                      <div className="mt-3">
                        <div className="overflow-x-auto">
                          <div className="inline-block min-w-full">
                            {(() => {
                              // Get unique lorong and baris
                              const matchingLorongs = new Set<number>();
                              const matchingBaris = new Set<number>();
                              
                              clusterCells.forEach((group) => {
                                matchingLorongs.add(group.lorong);
                                matchingBaris.add(group.baris);
                              });
                              
                              const sortedLorongs = Array.from(matchingLorongs).sort((a, b) => a - b);
                              const sortedBaris = Array.from(matchingBaris).sort((a, b) => a - b);
                              
                              if (sortedLorongs.length === 0 || sortedBaris.length === 0) {
                                return (
                                  <div className="text-center py-8 text-gray-500">
                                    Tidak ada lokasi yang cocok dengan filter di cluster ini
                                  </div>
                                );
                              }
                              
                              return (
                                <>
                                  {/* Header Baris */}
                                  <div className="flex mb-2">
                                    <div className="w-16 sm:w-20 shrink-0" /> 
                                    {sortedBaris.map((barisNum) => (
                                      <div key={barisNum} className="w-20 sm:w-24 text-center shrink-0">
                                        <div className="text-xs font-semibold text-slate-600 bg-slate-100 rounded px-2 py-1">
                                          B{barisNum}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  
                                  {/* Lorong Rows */}
                                  {sortedLorongs.map((lorongNum) => {
                                    // Check if this lorong is in transit based on cluster_cell_overrides
                                    const override = clusterCellOverrides.find((o: any) => 
                                      o.cluster_config_id === clusterConfig.id &&
                                      o.lorong_start <= lorongNum &&
                                      o.lorong_end >= lorongNum &&
                                      o.is_transit_area === true
                                    );
                                    const isInTransitLorong = !!override;
                                    
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
                                        
                                        {/* Baris Cells */}
                                        {sortedBaris.map((barisNum) => {
                                          const group = clusterCells.find(
                                            (g) => g.lorong === lorongNum && g.baris === barisNum
                                          );
                                          
                                          if (!group) {
                                            return (
                                              <div key={barisNum} className="w-20 sm:w-24 shrink-0 px-1">
                                                <div className="flex gap-0.5 h-12 sm:h-14 items-center justify-center">
                                                  <span className="text-xs text-slate-300">-</span>
                                                </div>
                                              </div>
                                            );
                                          }
                                          
                                          return (
                                            <div key={barisNum} className="w-20 sm:w-24 shrink-0 px-1">
                                              <div className="flex gap-0.5">
                                                {group.pallets.map((cell) => (
                                                  <PalletComponent key={cell.id} cell={cell} />
                                                ))}
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
                      
                        {/* Legend */}
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <p className="text-xs font-semibold text-slate-700 mb-2">Kode Warna</p>
                          <div className="flex flex-wrap gap-2 sm:gap-3 text-[10px] sm:text-xs text-slate-600">
                            <div className="flex items-center gap-1">
                              <div className="w-2.5 h-2.5 rounded bg-red-500" />
                              <span>Salah Cluster / Expired</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-2.5 h-2.5 rounded bg-blue-500" />
                              <span>Receh</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-2.5 h-2.5 rounded bg-green-500" />
                              <span>Release</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-2.5 h-2.5 rounded bg-yellow-400" />
                              <span>Hold</span>
                            </div>
                            {/* Check if this cluster has any in-transit overrides */}
                            {clusterCellOverrides.some((o: any) => 
                              o.cluster_config_id === clusterConfig.id && o.is_transit_area === true
                            ) && (
                              <div className="flex items-center gap-1">
                                <div className="w-2.5 h-2.5 rounded bg-red-100 border border-red-400" />
                                <span className="font-semibold text-red-700">In Transit</span>
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
      </div>

      {/* Detail Modal */}
      {selectedCell && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setSelectedCell(null)}
        >
          <div 
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-blue-500 px-4 sm:px-6 py-4 sm:py-5 rounded-t-2xl sticky top-0">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Detail Pallet
                </h2>
                <button
                  onClick={() => setSelectedCell(null)}
                  className="text-white/80 hover:text-white text-2xl font-light transition-colors w-8 h-8 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
              {/* Kode Produk & Nama Produk */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 sm:p-4 border border-blue-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-medium text-blue-600 mb-1">Kode Produk</p>
                    <p className="font-mono font-bold text-blue-900 text-xs sm:text-sm">
                      {selectedCell.productCode || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-blue-600 mb-1">Nama Produk</p>
                    <p className="font-semibold text-blue-900 text-xs sm:text-sm">
                      {selectedCell.product || "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* BB Pallet */}
              <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
                <p className="text-xs font-medium text-slate-500 mb-1">BB Pallet</p>
                <p className="font-semibold text-slate-900 text-xs sm:text-sm font-mono">
                  {selectedCell.bbPallet || "-"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-emerald-50 rounded-lg p-3 sm:p-4 border border-emerald-200">
                  <p className="text-xs font-medium text-emerald-700 mb-1">
                    Qty Pallet (Tumpukan)
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-emerald-600">
                    {selectedCell.qtyPallet || 0}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border border-blue-200">
                  <p className="text-xs font-medium text-blue-700 mb-1">
                    Qty Carton (Kardus)
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-blue-600">
                    {selectedCell.qtyCarton || 0}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
                  <p className="text-xs font-medium text-slate-500 mb-1">Cluster</p>
                  <p className="font-semibold text-slate-900">{selectedCell.clusterChar}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
                  <p className="text-xs font-medium text-slate-500 mb-1">Lokasi Rak</p>
                  <p className="font-semibold text-slate-900 text-xs sm:text-sm">
                    L{selectedCell.lorong}-B{selectedCell.baris}-P{selectedCell.pallet}
                  </p>
                </div>
              </div>
              
              {/* Status Kondisi & Status FEFO */}
              <div className="space-y-3">
                {/* Status Kondisi (Physical Status) */}
                <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
                  <p className="text-xs font-medium text-slate-500 mb-2">Status Kondisi</p>
                  <div className="flex flex-wrap gap-2">
                    {getConditionBadges(selectedCell)}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {(() => {
                      if (selectedCell.status === "salah-cluster" || selectedCell.status === "wrong_cluster") 
                        return "Produk berada di cluster yang salah";
                      if (selectedCell.status === "receh" || selectedCell.isReceh) 
                        return "Pallet tidak penuh, ada sisa";
                      if (selectedCell.status === "expired") 
                        return "Produk sudah expired";
                      return "Kondisi pallet normal";
                    })()}
                  </p>
                </div>

                {/* Status FEFO (Queue Status) */}
                {selectedCell.fefoStatus && (
                  <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
                    <p className="text-xs font-medium text-slate-500 mb-2">Status FEFO</p>
                    <div className="flex flex-wrap gap-2">
                      {getFefoBadge(selectedCell.fefoStatus)}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {(() => {
                        if (selectedCell.fefoStatus === "release") 
                          return "Prioritas untuk dikeluarkan (BB Produk terdekat)";
                        if (selectedCell.fefoStatus === "hold") 
                          return "Ditahan, belum waktunya keluar";
                        return "";
                      })()}
                    </p>
                  </div>
                )}
              </div>
                
              {selectedCell.isInTransit && (
                <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs">
                  <p className="font-bold">⚠️ IN TRANSIT AREA</p>
                  <p>Lokasi buffer sementara untuk barang yang akan dipindahkan.</p>
                </div>
              )}
            </div>

            <div className="px-4 sm:px-6 pb-4 sm:pb-6">
              <button
                onClick={() => setSelectedCell(null)}
                className="w-full rounded-lg bg-blue-500 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-600 transition-all shadow-lg hover:shadow-xl active:scale-98"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
