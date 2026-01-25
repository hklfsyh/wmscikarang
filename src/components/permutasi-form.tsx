// File: src/components/permutasi-form.tsx
// Permutasi - Relokasi Stock yang Salah Cluster / Di In Transit

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { moveStockAction, getCurrentStockAction } from "@/app/permutasi/actions";
import { CheckCircle, XCircle, ArrowRightLeft, MapPin } from "lucide-react";

interface WrongLocationStock {
  id: string;
  cluster: string;
  lorong: number;
  baris: number;
  level: number;
  qty_carton: number;
  bb_produk: string;
  products: {
    id: string;
    product_code: string;
    product_name: string;
    default_cluster: string;
  };
  homeCluster: string;
  reason: "salah-cluster" | "in-transit";
}

interface RecommendedLocation {
  clusterChar: string;
  lorong: string;
  baris: string;
  level: string;
}

interface BatchMoveItem {
  stockId: string;
  productCode: string;
  productName: string;
  fromLocation: string;
  recommendedLocation: RecommendedLocation | null;
  useAutoRecommend: boolean;
  manualLocation: { clusterChar: string; lorong: string; baris: string; pallet: string };
  reason: string;
  isValid: boolean;
  warningMessage?: string;
}

interface PermutasiFormProps {
  warehouseId: string;
  initialStocks: any[];
  clusterConfigs: any[];
  productHomes: any[];
  clusterCellOverrides: any[];
  initialHistory: any[];
}

export function PermutasiForm({ 
  warehouseId, 
  initialStocks, 
  clusterConfigs, 
  productHomes,
  clusterCellOverrides,
  initialHistory 
}: PermutasiFormProps) {
  const router = useRouter();
  const [currentWarehouseId, setCurrentWarehouseId] = useState<string | null>(warehouseId);
  const [realtimeStock, setRealtimeStock] = useState<any[]>(initialStocks); // Start with initial, will fetch real-time when needed
  const [activeTab, setActiveTab] = useState<"salah-cluster" | "in-transit" | "free-move" | "history">("salah-cluster");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [itemToMove, setItemToMove] = useState<WrongLocationStock | null>(null);
  const [recommendedLocation, setRecommendedLocation] = useState<RecommendedLocation | null>(null);
  const [autoRecommend, setAutoRecommend] = useState(true);
  const [forceManualMode, setForceManualMode] = useState(false); // TRUE jika dipanggil dari Free Move
  const [manualLocation, setManualLocation] = useState({ clusterChar: "", lorong: "", baris: "", pallet: "" });
  const [moveReason, setMoveReason] = useState("");

  // Batch move states
  const [showBatchPlanModal, setShowBatchPlanModal] = useState(false);
  const [batchMoveItems, setBatchMoveItems] = useState<BatchMoveItem[]>([]);

  // Free move states (Tab 3)
  const [freeMoveSearch, setFreeMoveSearch] = useState("");
  const [freeMoveFilterCluster, setFreeMoveFilterCluster] = useState("");
  const [freeMoveFilterLorong, setFreeMoveFilterLorong] = useState("");
  const [freeMoveMode, setFreeMoveMode] = useState<"single" | "range">("single");
  
  // Single mode
  const [freeMoveTargetSingle, setFreeMoveTargetSingle] = useState({
    cluster: "",
    lorong: "",
    baris: "",
    pallet: ""
  });
  
  // Range mode (like NPL)
  const [freeMoveTargetRange, setFreeMoveTargetRange] = useState({
    clusterChar: "",
    lorong: "",
    barisStart: "",
    barisEnd: "",
    palletStart: "",
    palletEnd: ""
  });

  // Modal states
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState<"success" | "error" | "warning">("success");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<any>(null);

  const showNotification = (title: string, message: string, type: "success" | "error" | "warning") => {
    setNotificationTitle(title);
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotificationModal(true);
  };

  const success = (message: string) => showNotification("✅ Berhasil", message, "success");
  const error = (message: string) => showNotification("❌ Error", message, "error");

  // Helper functions untuk dynamic dropdown berdasarkan cluster_cell_overrides
  // LOGIC 100% IDENTIK DENGAN INBOUND-FORM.TSX
  
  // Helper: Dapatkan jumlah baris maksimal untuk lorong tertentu
  const getBarisCountForLorong = (clusterChar: string, lorongNum: number): number => {
    const config = clusterConfigs.find((c: any) => c.cluster_char === clusterChar);
    if (!config) return 9;

    // Cari override yang mencakup lorong ini (Logic Range)
    const override = clusterCellOverrides.find(
      (o: any) =>
        o.cluster_config_id === config.id &&
        lorongNum >= o.lorong_start &&
        lorongNum <= o.lorong_end &&
        o.custom_baris_count !== null &&
        !o.is_disabled
    );

    return override ? override.custom_baris_count : (config.default_baris_count ?? 9);
  };

  // Helper: Dapatkan kapasitas pallet level untuk sel spesifik
  const getPalletCapacityForCell = (clusterChar: string, lorongNum: number, barisNum: number): number => {
    const config = clusterConfigs.find((c: any) => c.cluster_char === clusterChar);
    if (!config) return 3;

    // Cari override: lorong di dalam range DAN (baris di dalam range ATAU baris range null/berlaku semua)
    const override = clusterCellOverrides.find(
      (o: any) =>
        o.cluster_config_id === config.id &&
        lorongNum >= o.lorong_start &&
        lorongNum <= o.lorong_end &&
        (o.baris_start === null || (barisNum >= o.baris_start && barisNum <= (o.baris_end || o.baris_start))) &&
        o.custom_pallet_level !== null &&
        !o.is_disabled
    );

    return override ? override.custom_pallet_level : (config.default_pallet_level ?? 3);
  };

  // Get wrong location stocks from database
  const wrongLocationStocks = useMemo((): WrongLocationStock[] => {
    const result: WrongLocationStock[] = [];

    initialStocks.forEach((stock) => {
      const lorongNum = stock.lorong;
      const cluster = stock.cluster;

      // Check if In Transit (Cluster C, Lorong 8-11)
      const inTransit = cluster === "C" && lorongNum >= 8 && lorongNum <= 11;

      // Get product info
      const homeCluster = stock.products?.default_cluster || "?";

      if (inTransit) {
        result.push({
          id: stock.id,
          cluster: stock.cluster,
          lorong: stock.lorong,
          baris: stock.baris,
          level: stock.level,
          qty_carton: stock.qty_carton,
          bb_produk: stock.bb_produk,
          products: stock.products,
          homeCluster,
          reason: "in-transit",
        });
      } else {
        // Check if wrong location (ENHANCED: Check against Product Home range!)
        // Priority 1: Check Product Home rules (lorong & baris range)
        const productHomeRules = productHomes.filter((h: any) => 
          h.product_id === stock.product_id && h.is_active
        );
        
        let isWrongLocation = false;
        
        if (productHomeRules.length > 0) {
          // Product has homes - check if current location is in ANY of them
          const isInAnyHome = productHomeRules.some((rule: any) =>
            rule.cluster_char === cluster &&
            lorongNum >= rule.lorong_start &&
            lorongNum <= rule.lorong_end &&
            stock.baris >= rule.baris_start &&
            stock.baris <= rule.baris_end
          );
          
          // If NOT in any home = wrong location
          isWrongLocation = !isInAnyHome;
        } else {
          // No product home rules - fallback to default cluster check
          const isWrongCluster = 
            stock.products?.default_cluster && 
            cluster !== stock.products?.default_cluster;
          isWrongLocation = isWrongCluster;
        }
        
        if (isWrongLocation) {
          result.push({
            id: stock.id,
            cluster: stock.cluster,
            lorong: stock.lorong,
            baris: stock.baris,
            level: stock.level,
            qty_carton: stock.qty_carton,
            bb_produk: stock.bb_produk,
            products: stock.products,
            homeCluster,
            reason: "salah-cluster",
          });
        }
      }
    });

    return result;
  }, [initialStocks, productHomes]);

  // Filter by tab
  const filteredStocks = useMemo(() => {
    if (activeTab === "salah-cluster") {
      return wrongLocationStocks.filter((s) => s.reason === "salah-cluster");
    } else if (activeTab === "in-transit") {
      return wrongLocationStocks.filter((s) => s.reason === "in-transit");
    }
    return [];
  }, [wrongLocationStocks, activeTab]);

  // Free move: All stocks with search and filter
  const freeMove_AllStocks = useMemo(() => {
    return initialStocks.map((s: any) => ({
      id: s.id,
      cluster: s.cluster,
      lorong: s.lorong,
      baris: s.baris,
      level: s.level,
      qty_carton: s.qty_carton,
      bb_produk: s.bb_produk,
      expired_date: s.expired_date,
      fefo_status: s.fefo_status,
      products: s.products,
      product_id: s.product_id
    }));
  }, [initialStocks]);

  const freeMove_FilteredStocks = useMemo(() => {
    let filtered = freeMove_AllStocks;

    // Filter by search (product code or name)
    if (freeMoveSearch) {
      const searchLower = freeMoveSearch.toLowerCase();
      filtered = filtered.filter((s: any) => 
        s.products?.product_code?.toLowerCase().includes(searchLower) ||
        s.products?.product_name?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by cluster
    if (freeMoveFilterCluster) {
      filtered = filtered.filter((s: any) => s.cluster === freeMoveFilterCluster);
    }

    // Filter by lorong
    if (freeMoveFilterLorong) {
      const lorongNum = parseInt(freeMoveFilterLorong.replace("L", ""));
      filtered = filtered.filter((s: any) => s.lorong === lorongNum);
    }

    return filtered;
  }, [freeMove_AllStocks, freeMoveSearch, freeMoveFilterCluster, freeMoveFilterLorong]);

  // Cluster & Location Options
  const clusterOptions = useMemo(() => clusterConfigs.filter((c: any) => c.is_active).map((c: any) => c.cluster_char), [clusterConfigs]);

  // Dynamic lorong options for Free Move filter based on selected cluster
  const freeMoveLorongFilterOptions = useMemo(() => {
    if (!freeMoveFilterCluster) return [];
    const config = clusterConfigs.find((c: any) => c.cluster_char === freeMoveFilterCluster);
    if (!config) return [];
    return Array.from({ length: config.default_lorong_count }, (_, i) => `L${i + 1}`);
  }, [freeMoveFilterCluster, clusterConfigs]);

  const lorongOptions = useMemo(() => {
    if (!manualLocation.clusterChar) return [];
    const config = clusterConfigs.find((c: any) => c.cluster_char === manualLocation.clusterChar);
    if (!config) return [];
    return Array.from({ length: config.default_lorong_count }, (_, i) => `L${i + 1}`);
  }, [manualLocation.clusterChar, clusterConfigs]);

  const barisOptions = useMemo(() => {
    if (!manualLocation.clusterChar || !manualLocation.lorong) return [];
    const lorongNum = parseInt(manualLocation.lorong.replace("L", ""));
    const barisCount = getBarisCountForLorong(manualLocation.clusterChar, lorongNum);
    return Array.from({ length: barisCount }, (_, i) => `B${i + 1}`);
  }, [manualLocation.clusterChar, manualLocation.lorong, clusterCellOverrides]);

  const palletOptions = useMemo(() => {
    if (!manualLocation.clusterChar || !manualLocation.lorong || !manualLocation.baris) return [];
    const lorongNum = parseInt(manualLocation.lorong.replace("L", ""));
    const barisNum = parseInt(manualLocation.baris.replace("B", ""));
    const palletCapacity = getPalletCapacityForCell(manualLocation.clusterChar, lorongNum, barisNum);
    return Array.from({ length: palletCapacity }, (_, i) => `P${i + 1}`);
  }, [manualLocation.clusterChar, manualLocation.lorong, manualLocation.baris, clusterCellOverrides]);

  // Free Move Single Mode - Dropdown Options
  const freeMoveLorongOptions = useMemo(() => {
    if (!freeMoveTargetSingle.cluster) return [];
    const config = clusterConfigs.find((c: any) => c.cluster_char === freeMoveTargetSingle.cluster);
    if (!config) return [];
    return Array.from({ length: config.default_lorong_count }, (_, i) => `L${i + 1}`);
  }, [freeMoveTargetSingle.cluster, clusterConfigs]);

  const freeMoveBarisOptions = useMemo(() => {
    if (!freeMoveTargetSingle.cluster || !freeMoveTargetSingle.lorong) return [];
    const lorongNum = parseInt(freeMoveTargetSingle.lorong.replace("L", ""));
    const barisCount = getBarisCountForLorong(freeMoveTargetSingle.cluster, lorongNum);
    return Array.from({ length: barisCount }, (_, i) => `B${i + 1}`);
  }, [freeMoveTargetSingle.cluster, freeMoveTargetSingle.lorong, clusterCellOverrides]);

  const freeMovePalletOptions = useMemo(() => {
    if (!freeMoveTargetSingle.cluster || !freeMoveTargetSingle.lorong || !freeMoveTargetSingle.baris) return [];
    const lorongNum = parseInt(freeMoveTargetSingle.lorong.replace("L", ""));
    const barisNum = parseInt(freeMoveTargetSingle.baris.replace("B", ""));
    const palletCapacity = getPalletCapacityForCell(freeMoveTargetSingle.cluster, lorongNum, barisNum);
    return Array.from({ length: palletCapacity }, (_, i) => `P${i + 1}`);
  }, [freeMoveTargetSingle.cluster, freeMoveTargetSingle.lorong, freeMoveTargetSingle.baris, clusterCellOverrides]);

  // Free Move Range Mode - Dropdown Options
  const freeMoveRangeLorongOptions = useMemo(() => {
    if (!freeMoveTargetRange.clusterChar) return [];
    const config = clusterConfigs.find((c: any) => c.cluster_char === freeMoveTargetRange.clusterChar);
    if (!config) return [];
    return Array.from({ length: config.default_lorong_count }, (_, i) => `L${i + 1}`);
  }, [freeMoveTargetRange.clusterChar, clusterConfigs]);

  const freeMoveRangeBarisOptions = useMemo(() => {
    if (!freeMoveTargetRange.clusterChar || !freeMoveTargetRange.lorong) return [];
    const lorongNum = parseInt(freeMoveTargetRange.lorong.replace("L", ""));
    const barisCount = getBarisCountForLorong(freeMoveTargetRange.clusterChar, lorongNum);
    return Array.from({ length: barisCount }, (_, i) => `B${i + 1}`);
  }, [freeMoveTargetRange.clusterChar, freeMoveTargetRange.lorong, clusterCellOverrides]);

  const freeMoveRangePalletOptions = useMemo(() => {
    if (!freeMoveTargetRange.clusterChar || !freeMoveTargetRange.lorong || !freeMoveTargetRange.barisStart) return [];
    const lorongNum = parseInt(freeMoveTargetRange.lorong.replace("L", ""));
    const barisNum = parseInt(freeMoveTargetRange.barisStart.replace("B", ""));
    const palletCapacity = getPalletCapacityForCell(freeMoveTargetRange.clusterChar, lorongNum, barisNum);
    return Array.from({ length: palletCapacity }, (_, i) => `P${i + 1}`);
  }, [freeMoveTargetRange.clusterChar, freeMoveTargetRange.lorong, freeMoveTargetRange.barisStart, clusterCellOverrides]);

  // Find recommended location for a product using database
  // excludeLocations: array of location strings "A-L1-B8-P1" yang sudah reserved dalam batch
  const findRecommendedLocation = (productId: string, productCode: string, stockData: any[], excludeLocations: Set<string> = new Set()): RecommendedLocation | null => {
    // Cari SEMUA product homes untuk produk ini (bisa ada multiple homes!)
    const productHomesForProduct = productHomes.filter((h: any) => h.product_id === productId && h.is_active);
    
    // Cari produk untuk mendapatkan default cluster
    const product = stockData.find((s: any) => s.product_id === productId)?.products;
    
    // PHASE 1: Coba cari di semua product homes yang terdaftar
    if (productHomesForProduct.length > 0) {
      for (const productHome of productHomesForProduct) {
        const cluster = productHome.cluster_char;
        const clusterConfig = clusterConfigs.find((c: any) => c.cluster_char === cluster);
        if (!clusterConfig) continue;

        const lorongStart = productHome.lorong_start;
        const lorongEnd = productHome.lorong_end;

        for (let lorongNum = lorongStart; lorongNum <= lorongEnd; lorongNum++) {
      // Skip In Transit area (Cluster C, Lorong 8-11)
      if (cluster === "C" && lorongNum >= 8 && lorongNum <= 11) continue;

      // DINAMIS: Ambil batas baris lorong ini
      const currentMaxBaris = getBarisCountForLorong(cluster, lorongNum);
      const barisStart = productHome ? productHome.baris_start : 1;
      const barisEnd = productHome ? Math.min(productHome.baris_end, currentMaxBaris) : currentMaxBaris;

      for (let barisNum = barisStart; barisNum <= barisEnd; barisNum++) {
        // DINAMIS: Ambil kapasitas level rak ini
        const currentMaxPallet = getPalletCapacityForCell(cluster, lorongNum, barisNum);
        const productMaxRule = productHome?.max_pallet_per_location || 999;
        const effectiveMaxPallet = Math.min(currentMaxPallet, productMaxRule);

        for (let palletNum = 1; palletNum <= effectiveMaxPallet; palletNum++) {
          const lorong = `L${lorongNum}`;
          const baris = `B${barisNum}`;
          const level = `P${palletNum}`;
          const locationKey = `${cluster}-${lorong}-${baris}-${level}`;

          // Cek apakah lokasi ini sudah direserve dalam batch saat ini
          if (excludeLocations.has(locationKey)) continue;

          const locationExists = stockData.some(
            (item: any) =>
              item.warehouse_id === warehouseId &&
              item.cluster === cluster &&
              item.lorong === lorongNum &&
              item.baris === barisNum &&
              item.level === palletNum
          );

          if (!locationExists) {
            return { clusterChar: cluster, lorong, baris, level };
          }
        } // close for palletNum
      } // close for barisNum
    } // close for lorongNum
  } // close for productHome
} else {
  // PHASE 2: FALLBACK - Produk tidak punya product home, gunakan default cluster
  const cluster = product?.default_cluster || "";
  if (!cluster) return null;

  const clusterConfig = clusterConfigs.find((c: any) => c.cluster_char === cluster);
  if (!clusterConfig) return null;

  const lorongStart = 1;
  const lorongEnd = clusterConfig.default_lorong_count;

  for (let lorongNum = lorongStart; lorongNum <= lorongEnd; lorongNum++) {
    // Skip In Transit area (Cluster C, Lorong 8-11)
    if (cluster === "C" && lorongNum >= 8 && lorongNum <= 11) continue;

    // DINAMIS: Ambil batas baris lorong ini
    const currentMaxBaris = getBarisCountForLorong(cluster, lorongNum);
    const barisStart = 1;
    const barisEnd = currentMaxBaris;

    for (let barisNum = barisStart; barisNum <= barisEnd; barisNum++) {
      // DINAMIS: Ambil kapasitas pallet level untuk sel ini
      const maxPallet = getPalletCapacityForCell(cluster, lorongNum, barisNum);
      const effectiveMaxPallet = maxPallet;

      for (let palletNum = 1; palletNum <= effectiveMaxPallet; palletNum++) {
        const lorong = `L${lorongNum}`;
        const baris = `B${barisNum}`;
        const level = `P${palletNum}`;

        const locationKey = `${cluster}-${lorong}-${baris}-${level}`;
        if (excludeLocations.has(locationKey)) continue;

        const occupied = isLocationOccupied(cluster, lorongNum, barisNum, palletNum, stockData);
        if (!occupied) {
          return { clusterChar: cluster, lorong, baris, level };
        }
      }
    }
  }
}

return null;
  };

  // Check if target location is already occupied
  const isLocationOccupied = (cluster: string, lorong: number, baris: number, level: number, stockData: any[]): boolean => {
    return stockData.some(
      (s: any) =>
        s.warehouse_id === warehouseId &&
        s.cluster === cluster &&
        s.lorong === lorong &&
        s.baris === baris &&
        s.level === level
    );
  };

  // Check if target location is outside product home
  const isOutsideProductHome = (productId: string, cluster: string, lorong: number, baris: number): { isOutside: boolean; message: string } => {
    // Cari SEMUA product homes untuk produk ini
    const rules = productHomes.filter((h: any) => h.product_id === productId && h.is_active);
    
    if (rules.length === 0) {
      // Tidak ada aturan, berarti bebas (tapi warning)
      return {
        isOutside: false,
        message: "⚠️ Produk ini tidak memiliki aturan Product Home"
      };
    }

    // Check apakah lokasi ada di SALAH SATU dari semua product homes
    const isInAnyHome = rules.some((rule: any) => 
      rule.cluster_char === cluster &&
      lorong >= rule.lorong_start &&
      lorong <= rule.lorong_end &&
      baris >= rule.baris_start &&
      baris <= rule.baris_end
    );

    if (!isInAnyHome) {
      // Build daftar semua homes untuk pesan error
      const homesList = rules.map((r: any) => 
        `${r.cluster_char}-L${r.lorong_start}-${r.lorong_end}, B${r.baris_start}-${r.baris_end}`
      ).join(" ATAU ");
      
      return {
        isOutside: true,
        message: `⚠️ PERINGATAN: Lokasi ini di luar Product Home (seharusnya: ${homesList})`
      };
    }

    return { isOutside: false, message: "" };
  };

  // Handle select item
  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedItems.size === filteredStocks.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredStocks.map((s) => s.id)));
    }
  };

  // Toggle batch item auto/manual
  const toggleBatchItemMode = (stockId: string) => {
    setBatchMoveItems(prev => 
      prev.map(item => 
        item.stockId === stockId 
          ? { ...item, useAutoRecommend: !item.useAutoRecommend }
          : item
      )
    );
  };

  // Update batch item manual location
  const updateBatchItemLocation = (stockId: string, field: string, value: string) => {
    setBatchMoveItems(prev => 
      prev.map(item => {
        if (item.stockId === stockId) {
          const newManual = { ...item.manualLocation, [field]: value };
          
          // Reset dependent fields
          if (field === "clusterChar") {
            newManual.lorong = "";
            newManual.baris = "";
            newManual.pallet = "";
          } else if (field === "lorong") {
            newManual.baris = "";
            newManual.pallet = "";
          } else if (field === "baris") {
            newManual.pallet = "";
          }
          
          return { ...item, manualLocation: newManual };
        }
        return item;
      })
    );
  };

  // Update batch item reason
  const updateBatchItemReason = (stockId: string, reason: string) => {
    setBatchMoveItems(prev => 
      prev.map(item => 
        item.stockId === stockId 
          ? { ...item, reason }
          : item
      )
    );
  };

  // Open move modal for single item
  // forceManual = true untuk Free Move Tab (user hanya boleh manual)
  const openMoveModal = (stock: WrongLocationStock, forceManual: boolean = false) => {
    setItemToMove(stock);
    setForceManualMode(forceManual);
    setAutoRecommend(!forceManual); // Jika force manual, set ke manual
    setManualLocation({ clusterChar: stock.homeCluster, lorong: "", baris: "", pallet: "" });
    setMoveReason(stock.reason === "in-transit" ? "Relokasi dari In Transit" : "Koreksi cluster");
    setRecommendedLocation(null);
    setShowMoveModal(true);
  };

  // Handle recommend button
  const handleRecommend = async () => {
    if (!itemToMove) return;

    // Fetch real-time stock data
    const stockResult = await getCurrentStockAction(warehouseId);
    if (!stockResult.success || !stockResult.stock) {
      error("Gagal mengambil data stok terkini: " + (stockResult.error || "Unknown error"));
      return;
    }

    const freshStock: any[] = stockResult.stock;
    setRealtimeStock(freshStock); // Update state for other functions

    const productId = itemToMove.products.id;
    const productCode = itemToMove.products.product_code;
    const recommended = findRecommendedLocation(productId, productCode, freshStock);
    if (recommended) {
      // Verify it's not occupied
      const isOccupied = freshStock.some(
        (s: any) =>
          s.warehouse_id === warehouseId &&
          s.cluster === recommended.clusterChar &&
          s.lorong === parseInt(recommended.lorong.replace('L', '')) &&
          s.baris === parseInt(recommended.baris.replace('B', '')) &&
          s.level === parseInt(recommended.level.replace('P', ''))
      );
      if (isOccupied) {
        error("Lokasi yang ditemukan sudah terisi. Coba lagi.");
        setRecommendedLocation(null);
      } else {
        setRecommendedLocation(recommended);
        success(`Lokasi ditemukan: ${recommended.clusterChar}-${recommended.lorong}-${recommended.baris}-${recommended.level}`);
      }
    } else {
      error("Tidak ada lokasi kosong yang sesuai dengan product home.");
      setRecommendedLocation(null);
    }
  };

  // Open confirm modal before move
  const handleMoveClick = () => {
    if (!itemToMove) return;

    if (!moveReason.trim()) {
      error("Alasan pemindahan wajib diisi.");
      return;
    }

    if (autoRecommend) {
      if (!recommendedLocation) {
        error("Mohon cari rekomendasi lokasi terlebih dahulu.");
        return;
      }
    } else {
      if (!manualLocation.clusterChar || !manualLocation.lorong || !manualLocation.baris || !manualLocation.pallet) {
        error("Mohon lengkapi lokasi tujuan.");
        return;
      }
      // Check if manual location is occupied using real-time stock
      const isOccupied = realtimeStock.some(
        (s: any) =>
          s.warehouse_id === warehouseId &&
          s.cluster === manualLocation.clusterChar &&
          s.lorong === parseInt(manualLocation.lorong.replace('L', '')) &&
          s.baris === parseInt(manualLocation.baris.replace('B', '')) &&
          s.level === parseInt(manualLocation.pallet.replace('P', ''))
      );
      if (isOccupied) {
        error("Lokasi tujuan sudah terisi!");
        return;
      }
    }

    setShowConfirmModal(true);
  };

  // Confirm move dengan server action
  const confirmMove = async () => {
    if (!itemToMove) return;

    const target = autoRecommend ? recommendedLocation! : {
      clusterChar: manualLocation.clusterChar,
      lorong: manualLocation.lorong,
      baris: manualLocation.baris,
      level: manualLocation.pallet,
    };

    const lorongNum = parseInt(target.lorong.replace('L', ''));
    const barisNum = parseInt(target.baris.replace('B', ''));
    const levelNum = parseInt(target.level.replace('P', ''));

    // Note: Tidak ada blocking validation - Permutasi Bebas memang bebas!
    // Validasi hanya untuk informasi di UI (badge, warning), bukan untuk blocking

    setIsSubmitting(true);
    try {
      const res = await moveStockAction(
        warehouseId,
        itemToMove.id,
        { 
          cluster: target.clusterChar, 
          lorong: lorongNum, 
          baris: barisNum, 
          level: levelNum
        },
        moveReason
      );

      if (res.success) {
        success("Stock berhasil direlokasi.");
        router.refresh(); // Sinkronisasi Data
        setShowConfirmModal(false);
        setShowMoveModal(false);
        setItemToMove(null);
        setRecommendedLocation(null);
        setMoveReason("");
        setSelectedItems(new Set());
      } else {
        error(res.message || "Gagal memindahkan stok.");
      }
    } catch (err) {
      error("Kesalahan sistem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open batch plan modal (Prepare locations first, don't execute blindly!)
  const handleBatchMoveClick = async () => {
    if (selectedItems.size === 0) {
      error("Pilih minimal 1 item untuk dipindahkan.");
      return;
    }

    // Fetch real-time stock data first
    const stockResult = await getCurrentStockAction(warehouseId);
    if (!stockResult.success || !stockResult.stock) {
      error("Gagal mengambil data stok terkini: " + (stockResult.error || "Unknown error"));
      return;
    }

    const freshStock: any[] = stockResult.stock;
    setRealtimeStock(freshStock); // Update state

    // PENTING: Track locations yang sudah direserve dalam batch ini
    const reservedLocations = new Set<string>();
    
    // Prepare batch move plan dengan rekomendasi untuk setiap item
    const items: BatchMoveItem[] = [];
    for (const id of Array.from(selectedItems)) {
      const stock = filteredStocks.find((s) => s.id === id);
      if (!stock) continue;

      const productId = stock.products.id;
      const productCode = stock.products.product_code;
      
      // Pass freshStock and reservedLocations agar tidak ada duplikasi
      const rec = findRecommendedLocation(productId, productCode, freshStock, reservedLocations);
      
      // Jika dapat rekomendasi, reserve lokasi tersebut untuk item berikutnya
      if (rec) {
        const locationKey = `${rec.clusterChar}-${rec.lorong}-${rec.baris}-${rec.level}`;
        reservedLocations.add(locationKey);
      }
      
      const fromLoc = `${stock.cluster}-L${stock.lorong}-B${stock.baris}-P${stock.level}`;
      
      items.push({
        stockId: id,
        productCode: stock.products.product_code,
        productName: stock.products.product_name,
        fromLocation: fromLoc,
        recommendedLocation: rec,
        useAutoRecommend: true,
        manualLocation: { clusterChar: "", lorong: "", baris: "", pallet: "" },
        reason: "Relokasi Masal (Batch Move)",
        isValid: rec !== null,
        warningMessage: rec === null ? "⚠️ Tidak ada lokasi tersedia" : undefined
      });
    }

    setBatchMoveItems(items);
    setShowBatchPlanModal(true);
  };

  // Execute batch move after user review and confirm
  const confirmBatchMove = async () => {
    setIsSubmitting(true);
    let successCount = 0;
    let failedCount = 0;
    const failedItems: string[] = [];

    for (const item of batchMoveItems) {
      const stock = filteredStocks.find((s) => s.id === item.stockId);
      if (!stock) continue;

      let targetLoc;
      if (item.useAutoRecommend && item.recommendedLocation) {
        targetLoc = {
          cluster: item.recommendedLocation.clusterChar,
          lorong: parseInt(item.recommendedLocation.lorong.replace('L', '')),
          baris: parseInt(item.recommendedLocation.baris.replace('B', '')),
          level: parseInt(item.recommendedLocation.level.replace('P', ''))
        };
      } else {
        targetLoc = {
          cluster: item.manualLocation.clusterChar,
          lorong: parseInt(item.manualLocation.lorong.replace('L', '')),
          baris: parseInt(item.manualLocation.baris.replace('B', '')),
          level: parseInt(item.manualLocation.pallet.replace('P', ''))
        };
      }

      // Note: Tidak ada blocking validation - Permutasi Bebas memang bebas!
      // User sudah review di modal, langsung execute saja

      const res = await moveStockAction(
        warehouseId,
        item.stockId,
        targetLoc,
        item.reason
      );
      
      if (res.success) {
        successCount++;
      } else {
        failedItems.push(stock.products.product_name);
        failedCount++;
      }
    }

    if (successCount > 0) {
      success(`${successCount} item berhasil dipindahkan.${failedCount > 0 ? ` ${failedCount} item gagal.` : ""}`);
    } else {
      error(`Tidak ada item yang berhasil dipindahkan. ${failedItems.length > 0 ? `Gagal: ${failedItems.join(", ")}` : ""}`);
    }

    router.refresh();
    setSelectedItems(new Set());
    setShowBatchPlanModal(false);
    setBatchMoveItems([]);
    setIsSubmitting(false);
  };

  // Today's history from database
  const todayHistory = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return initialHistory.filter((h: any) => h.moved_at.startsWith(todayStr));
  }, [initialHistory]);

  // Modal backdrop click handler
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>, closeModal: () => void) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-violet-500 rounded-xl flex items-center justify-center">
                <ArrowRightLeft className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Permutasi Stock</h1>
                <p className="text-sm text-gray-600">Relokasi produk yang salah cluster atau berada di In Transit</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
            <button
              onClick={() => setActiveTab("salah-cluster")}
              className={`px-4 md:px-6 py-2 md:py-3 rounded-xl font-semibold transition-all text-sm md:text-base ${
                activeTab === "salah-cluster"
                  ? "bg-red-500 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              🔴 Salah Cluster
              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {wrongLocationStocks.filter((s) => s.reason === "salah-cluster").length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("in-transit")}
              className={`px-4 md:px-6 py-2 md:py-3 rounded-xl font-semibold transition-all text-sm md:text-base ${
                activeTab === "in-transit"
                  ? "bg-amber-500 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              🟡 Di In Transit
              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {wrongLocationStocks.filter((s) => s.reason === "in-transit").length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("free-move")}
              className={`px-4 md:px-6 py-2 md:py-3 rounded-xl font-semibold transition-all text-sm md:text-base ${
                activeTab === "free-move"
                  ? "bg-blue-500 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              🔵 Permutasi Bebas
              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {freeMove_AllStocks.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 md:px-6 py-2 md:py-3 rounded-xl font-semibold transition-all text-sm md:text-base ${
                activeTab === "history"
                  ? "bg-violet-500 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              📋 Riwayat Hari Ini
              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">{todayHistory.length}</span>
            </button>
          </div>

          {/* Content */}
          {activeTab === "free-move" ? (
            <>
              {/* Free Move Tab - Search & Filter Bar */}
              <div className="mb-6 space-y-4">
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="🔍 Cari produk (kode atau nama)..."
                    value={freeMoveSearch}
                    onChange={(e) => setFreeMoveSearch(e.target.value)}
                    className="w-full px-4 py-3 pl-12 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    value={freeMoveFilterCluster}
                    onChange={(e) => setFreeMoveFilterCluster(e.target.value)}
                    className="px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Semua Cluster</option>
                    {clusterOptions.map((c) => (
                      <option key={c} value={c}>Cluster {c}</option>
                    ))}
                  </select>

                  <select
                    value={freeMoveFilterLorong}
                    onChange={(e) => setFreeMoveFilterLorong(e.target.value)}
                    className="px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:outline-none"
                    disabled={!freeMoveFilterCluster}
                  >
                    <option value="">Semua Lorong</option>
                    {freeMoveLorongFilterOptions.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                <div className="text-sm text-gray-600">
                  Menampilkan <span className="font-bold text-blue-600">{freeMove_FilteredStocks.length}</span> dari{" "}
                  <span className="font-bold">{freeMove_AllStocks.length}</span> stock
                </div>
              </div>

              {/* Stock Table */}
              {freeMove_FilteredStocks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📦</div>
                  <p className="text-gray-500 font-medium">
                    {freeMoveSearch || freeMoveFilterCluster 
                      ? "Tidak ada stock yang sesuai dengan filter"
                      : "Tidak ada stock"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-blue-500 text-white">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-bold uppercase">Produk</th>
                        <th className="px-3 py-3 text-center text-xs font-bold uppercase">Qty</th>
                        <th className="px-3 py-3 text-center text-xs font-bold uppercase">BB Produk</th>
                        <th className="px-3 py-3 text-center text-xs font-bold uppercase">Status FEFO</th>
                        <th className="px-3 py-3 text-center text-xs font-bold uppercase">Lokasi</th>
                        <th className="px-3 py-3 text-center text-xs font-bold uppercase">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {freeMove_FilteredStocks.slice(0, 50).map((stock: any) => {
                        // For Free Move tab, don't show wrong cluster warning
                        // This is "Permutasi Bebas" - truly free movement
                        const isWrongCluster = false; // Always false for free move
                        
                        return (
                          <tr key={stock.id} className="hover:bg-blue-50 transition-colors">
                            <td className="px-3 py-3">
                              <div className="font-medium text-gray-900 text-sm">{stock.products?.product_code}</div>
                              <div className="text-gray-500 text-xs truncate max-w-[200px]">{stock.products?.product_name}</div>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="font-bold text-gray-900">{stock.qty_carton}</span>
                              <span className="text-gray-500 text-xs ml-1">ctn</span>
                            </td>
                            <td className="px-3 py-3 text-center text-xs font-mono text-gray-600">
                              {stock.bb_produk}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span
                                className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                                  stock.fefo_status === "release"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {stock.fefo_status === "release" ? "🟢 Release" : "🟡 Hold"}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="inline-block px-2 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-800">
                                {stock.cluster}-L{stock.lorong}-B{stock.baris}-P{stock.level}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <button
                                onClick={() => {
                                  // Convert to WrongLocationStock format for reuse modal
                                  const item: WrongLocationStock = {
                                    id: stock.id,
                                    cluster: stock.cluster,
                                    lorong: stock.lorong,
                                    baris: stock.baris,
                                    level: stock.level,
                                    qty_carton: stock.qty_carton,
                                    bb_produk: stock.bb_produk,
                                    products: stock.products,
                                    homeCluster: stock.products?.default_cluster || "?",
                                    reason: "salah-cluster"
                                  };
                                  // PENTING: Force manual mode untuk Free Move Tab
                                  openMoveModal(item, true);
                                }}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
                              >
                                <MapPin className="w-3 h-3 inline mr-1" />
                                Pindah
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {freeMove_FilteredStocks.length > 50 && (
                    <div className="text-center py-4 text-sm text-gray-600">
                      Menampilkan 50 dari {freeMove_FilteredStocks.length} hasil. Gunakan filter untuk mempersempit pencarian.
                    </div>
                  )}
                </div>
              )}
            </>
          ) : activeTab !== "history" ? (
            <>
              {/* Action Bar */}
              {filteredStocks.length > 0 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedItems.size === filteredStocks.length && filteredStocks.length > 0}
                        onChange={handleSelectAll}
                        className="w-5 h-5 text-violet-600 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Pilih Semua ({selectedItems.size}/{filteredStocks.length})
                      </span>
                    </label>
                  </div>
                  {selectedItems.size > 0 && (
                    <button
                      onClick={handleBatchMoveClick}
                      className="w-full sm:w-auto px-6 py-2 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors shadow-lg"
                    >
                      🚚 Review & Pindahkan {selectedItems.size} Item
                    </button>
                  )}
                </div>
              )}

              {/* Table */}
              {filteredStocks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">{activeTab === "salah-cluster" ? "✅" : "📭"}</div>
                  <p className="text-gray-500 font-medium">
                    {activeTab === "salah-cluster" ? "Tidak ada produk yang salah cluster" : "Tidak ada produk di In Transit"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className={`text-white ${activeTab === "salah-cluster" ? "bg-red-500" : "bg-amber-500"}`}>
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-bold">
                          <input
                            type="checkbox"
                            checked={selectedItems.size === filteredStocks.length && filteredStocks.length > 0}
                            onChange={handleSelectAll}
                            className="w-4 h-4"
                          />
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-bold uppercase">Produk</th>
                        <th className="px-3 py-3 text-left text-xs font-bold uppercase hidden md:table-cell">BB Pallet</th>
                        <th className="px-3 py-3 text-center text-xs font-bold uppercase">Qty</th>
                        <th className="px-3 py-3 text-center text-xs font-bold uppercase">Lokasi</th>
                        <th className="px-3 py-3 text-center text-xs font-bold uppercase hidden sm:table-cell">Seharusnya</th>
                        <th className="px-3 py-3 text-center text-xs font-bold uppercase">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredStocks.map((stock) => (
                        <tr
                          key={stock.id}
                          className={`hover:bg-gray-50 transition-colors ${selectedItems.has(stock.id) ? "bg-violet-50" : ""}`}
                        >
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={selectedItems.has(stock.id)}
                              onChange={() => handleSelectItem(stock.id)}
                              className="w-4 h-4 text-violet-600 rounded"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <div className="font-medium text-gray-900 text-sm">{stock.products.product_code}</div>
                            <div className="text-gray-500 text-xs truncate max-w-[150px] md:max-w-[200px]">{stock.products.product_name}</div>
                          </td>
                          <td className="px-3 py-3 text-xs font-mono text-gray-600 hidden md:table-cell">
                            {stock.bb_produk}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="font-bold text-gray-900">{stock.qty_carton}</span>
                            <span className="text-gray-500 text-xs ml-1">ctn</span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span
                              className={`inline-block px-2 py-1 rounded-lg text-xs font-bold ${
                                stock.reason === "in-transit" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
                              }`}
                            >
                              {stock.cluster}-L{stock.lorong}-B{stock.baris}-P{stock.level}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center hidden sm:table-cell">
                            <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-lg text-xs font-bold">
                              Cluster {stock.homeCluster}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <button
                              onClick={() => openMoveModal(stock)}
                              className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-semibold hover:bg-violet-700 transition-colors"
                            >
                              <MapPin className="w-3 h-3 inline mr-1" />
                              Pindah
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            // History Tab
            <>
              {todayHistory.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-gray-500 font-medium">Belum ada permutasi hari ini</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-violet-500 text-white">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-bold uppercase">Waktu</th>
                        <th className="px-3 py-3 text-left text-xs font-bold uppercase">Produk</th>
                        <th className="px-3 py-3 text-center text-xs font-bold uppercase">Qty</th>
                        <th className="px-3 py-3 text-center text-xs font-bold uppercase">Status FEFO</th>
                        <th className="px-3 py-3 text-center text-xs font-bold uppercase">Dari</th>
                        <th className="px-3 py-3 text-center text-xs font-bold uppercase">Ke</th>
                        <th className="px-3 py-3 text-left text-xs font-bold uppercase">Alasan</th>
                        <th className="px-3 py-3 text-center text-xs font-bold uppercase">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {todayHistory.map((h: any) => {
                        const product = h.products;
                        const fromLocation = `${h.from_cluster}-L${h.from_lorong}-B${h.from_baris}-P${h.from_level}`;
                        const toLocation = `${h.to_cluster}-L${h.to_lorong}-B${h.to_baris}-P${h.to_level}`;
                        const fefoStatus = h.stock_list?.fefo_status || "unknown";
                        return (
                        <tr key={h.id} className="hover:bg-violet-50 transition-colors">
                          <td className="px-3 py-3 text-sm text-gray-900">
                            {new Date(h.moved_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="px-3 py-3">
                            <div className="font-medium text-gray-900 text-sm">{product?.product_code || "UNKNOWN"}</div>
                            <div className="text-gray-500 text-xs truncate max-w-[150px]">{product?.product_name || "Unknown Product"}</div>
                          </td>
                          <td className="px-3 py-3 text-center font-bold text-gray-900">{h.qty_carton} ctn</td>
                          <td className="px-3 py-3 text-center">
                            <span
                              className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                                fefoStatus === "release"
                                  ? "bg-green-100 text-green-800"
                                  : fefoStatus === "hold"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {fefoStatus === "release" ? "🟢 Release" : fefoStatus === "hold" ? "🟡 Hold" : "⚪ Unknown"}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="inline-block px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-mono">
                              {fromLocation}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-mono">
                              {toLocation}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600">{h.reason}</td>
                          <td className="px-3 py-3 text-center">
                            <button
                              onClick={() => {
                                setSelectedHistory(h);
                                setShowDetailModal(true);
                              }}
                              className="px-3 py-1 bg-violet-100 text-violet-700 rounded-lg text-xs font-semibold hover:bg-violet-200 transition-colors"
                            >
                              📋 Detail
                            </button>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Summary Cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🔴</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Salah Cluster</p>
                <p className="text-2xl font-bold text-red-600">
                  {wrongLocationStocks.filter((s) => s.reason === "salah-cluster").length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🟡</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Di In Transit</p>
                <p className="text-2xl font-bold text-amber-600">
                  {wrongLocationStocks.filter((s) => s.reason === "in-transit").length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📋</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Permutasi Hari Ini</p>
                <p className="text-2xl font-bold text-violet-600">{todayHistory.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Move Modal */}
      {showMoveModal && itemToMove && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => handleBackdropClick(e, () => setShowMoveModal(false))}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-4 rounded-t-2xl">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Pindahkan Stock
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Stock Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 mb-3">📦 Informasi Stock:</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Produk:</span>
                    <span className="font-semibold text-gray-900">{itemToMove.products.product_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nama:</span>
                    <span className="font-semibold text-gray-900 text-right max-w-[200px] truncate">{itemToMove.products.product_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Qty:</span>
                    <span className="font-semibold text-gray-900">{itemToMove.qty_carton} karton</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Lokasi Saat Ini:</span>
                    <span className="font-semibold text-red-600">
                      {itemToMove.cluster}-L{itemToMove.lorong}-B{itemToMove.baris}-P{itemToMove.level}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Home Cluster:</span>
                    <span className="font-semibold text-green-600">Cluster {itemToMove.homeCluster}</span>
                  </div>
                </div>
              </div>

              {/* Reason Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Alasan Pemindahan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={moveReason}
                  onChange={(e) => setMoveReason(e.target.value)}
                  placeholder="Masukkan alasan pemindahan..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                />
              </div>

              {/* Location Mode */}
              <div className="bg-violet-50 border-2 border-violet-200 rounded-xl p-4">
                <h3 className="font-semibold text-violet-900 mb-3">📍 Lokasi Tujuan</h3>
                
                {/* Hide toggle jika forceManualMode (Free Move Tab) */}
                {!forceManualMode && (
                  <div className="flex gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={autoRecommend}
                        onChange={() => setAutoRecommend(true)}
                        className="w-4 h-4 text-violet-600"
                      />
                      <span className="text-sm font-medium text-violet-800">Auto Recommend</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!autoRecommend}
                        onChange={() => setAutoRecommend(false)}
                        className="w-4 h-4 text-violet-600"
                      />
                      <span className="text-sm font-medium text-violet-800">Manual</span>
                    </label>
                  </div>
                )}

                {autoRecommend ? (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleRecommend}
                      className="w-full px-4 py-2 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors"
                    >
                      🔍 Cari Rekomendasi
                    </button>

                    {recommendedLocation && (
                      <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                        <p className="text-sm text-green-800">
                          <strong>Lokasi Tersedia:</strong>{" "}
                          <span className="font-mono">
                            {recommendedLocation.clusterChar}-{recommendedLocation.lorong}-{recommendedLocation.baris}-{recommendedLocation.level}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Cluster</label>
                      <select
                        value={manualLocation.clusterChar}
                        onChange={(e) => setManualLocation({ ...manualLocation, clusterChar: e.target.value, lorong: "", baris: "", pallet: "" })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                      >
                        <option value="">Pilih</option>
                        {clusterOptions.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Lorong</label>
                      <select
                        value={manualLocation.lorong}
                        onChange={(e) => setManualLocation({ ...manualLocation, lorong: e.target.value, baris: "", pallet: "" })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                      >
                        <option value="">Pilih</option>
                        {lorongOptions.map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Baris</label>
                      <select
                        value={manualLocation.baris}
                        onChange={(e) => setManualLocation({ ...manualLocation, baris: e.target.value, pallet: "" })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                      >
                        <option value="">Pilih</option>
                        {barisOptions.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Pallet</label>
                      <select
                        value={manualLocation.pallet}
                        onChange={(e) => setManualLocation({ ...manualLocation, pallet: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                      >
                        <option value="">Pilih</option>
                        {palletOptions.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowMoveModal(false);
                    setItemToMove(null);
                    setRecommendedLocation(null);
                    setMoveReason("");
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300"
                >
                  Batal
                </button>
                <button onClick={handleMoveClick} className="flex-1 bg-violet-600 text-white py-3 rounded-xl font-semibold hover:bg-violet-700">
                  Pindahkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Plan Modal - Review locations before execute */}
      {showBatchPlanModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => handleBackdropClick(e, () => setShowBatchPlanModal(false))}
        >
          <div className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-6">
              <h3 className="text-xl font-bold text-white">📋 Review Batch Permutasi ({batchMoveItems.length} items)</h3>
              <p className="text-white/80 text-sm mt-1">Periksa dan konfirmasi lokasi tujuan sebelum pemindahan</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {batchMoveItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Tidak ada item yang dipilih</div>
              ) : (
                <div className="space-y-4">
                  {batchMoveItems.map((item, idx) => {
                    const stock = filteredStocks.find(s => s.id === item.stockId);
                    if (!stock) return null;

                    return (
                      <div key={item.stockId} className="border-2 border-gray-200 rounded-xl p-4 hover:border-violet-300 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="font-bold text-gray-900">{idx + 1}. {item.productCode}</div>
                            <div className="text-sm text-gray-600">{item.productName}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Dari: <span className="font-mono text-red-600">{item.fromLocation}</span>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleBatchItemMode(item.stockId)}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                item.useAutoRecommend
                                  ? "bg-green-100 text-green-800 hover:bg-green-200"
                                  : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                              }`}
                            >
                              {item.useAutoRecommend ? "🤖 Auto" : "✋ Manual"}
                            </button>
                          </div>
                        </div>

                        {item.useAutoRecommend ? (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            {item.recommendedLocation ? (
                              <div className="text-sm">
                                <span className="text-green-700 font-semibold">✅ Rekomendasi:</span>
                                <span className="ml-2 font-mono text-green-800 font-bold">
                                  {item.recommendedLocation.clusterChar}-{item.recommendedLocation.lorong}-
                                  {item.recommendedLocation.baris}-{item.recommendedLocation.level}
                                </span>
                              </div>
                            ) : (
                              <div className="text-sm text-red-600">
                                ⚠️ Tidak ada lokasi kosong yang tersedia. Ubah ke Manual.
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="text-sm text-blue-700 font-semibold mb-2">✋ Manual Location:</div>
                            <div className="grid grid-cols-4 gap-2">
                              <select
                                value={item.manualLocation.clusterChar}
                                onChange={(e) => updateBatchItemLocation(item.stockId, "clusterChar", e.target.value)}
                                className="px-2 py-1 rounded border text-sm"
                              >
                                <option value="">Cluster</option>
                                {clusterOptions.map((c) => (
                                  <option key={c} value={c}>Cluster {c}</option>
                                ))}
                              </select>
                              
                              <select
                                value={item.manualLocation.lorong}
                                onChange={(e) => updateBatchItemLocation(item.stockId, "lorong", e.target.value)}
                                className="px-2 py-1 rounded border text-sm"
                                disabled={!item.manualLocation.clusterChar}
                              >
                                <option value="">Lorong</option>
                                {item.manualLocation.clusterChar && lorongOptions.map((l) => (
                                  <option key={l} value={l}>{l}</option>
                                ))}
                              </select>
                              
                              <select
                                value={item.manualLocation.baris}
                                onChange={(e) => updateBatchItemLocation(item.stockId, "baris", e.target.value)}
                                className="px-2 py-1 rounded border text-sm"
                                disabled={!item.manualLocation.lorong}
                              >
                                <option value="">Baris</option>
                                {item.manualLocation.lorong && barisOptions.map((b) => (
                                  <option key={b} value={b}>{b}</option>
                                ))}
                              </select>
                              
                              <select
                                value={item.manualLocation.pallet}
                                onChange={(e) => updateBatchItemLocation(item.stockId, "pallet", e.target.value)}
                                className="px-2 py-1 rounded border text-sm"
                                disabled={!item.manualLocation.baris}
                              >
                                <option value="">Pallet</option>
                                {item.manualLocation.baris && palletOptions.map((p) => (
                                  <option key={p} value={p}>{p}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}

                        {item.warningMessage && (
                          <div className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                            {item.warningMessage}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 p-6 bg-gray-50 flex gap-3">
              <button
                onClick={() => setShowBatchPlanModal(false)}
                className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-400 transition-colors"
              >
                ❌ Batal
              </button>
              <button
                onClick={() => {
                  setShowBatchPlanModal(false);
                  confirmBatchMove();
                }}
                disabled={batchMoveItems.every(item => !item.isValid && !item.useAutoRecommend)}
                className="flex-1 px-6 py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                ✅ Konfirmasi & Pindahkan ({batchMoveItems.length} items)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Move Modal */}
      {showConfirmModal && itemToMove && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => handleBackdropClick(e, () => setShowConfirmModal(false))}
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-6">
              <h3 className="text-xl font-bold text-white text-center">Konfirmasi Pemindahan</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700 text-center mb-4">Yakin ingin memindahkan stock ini?</p>
              <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm space-y-1">
                <p>
                  <strong>Produk:</strong> {itemToMove.products.product_code}
                </p>
                <p>
                  <strong>Dari:</strong>{" "}
                  <span className="text-red-600">
                    {itemToMove.cluster}-L{itemToMove.lorong}-B{itemToMove.baris}-P{itemToMove.level}
                  </span>
                </p>
                <p>
                  <strong>Ke:</strong>{" "}
                  <span className="text-green-600">
                    {autoRecommend
                      ? `${recommendedLocation?.clusterChar}-${recommendedLocation?.lorong}-${recommendedLocation?.baris}-${recommendedLocation?.level}`
                      : `${manualLocation.clusterChar}-${manualLocation.lorong}-${manualLocation.baris}-${manualLocation.pallet}`}
                  </span>
                </p>
                <p>
                  <strong>Alasan:</strong> {moveReason}
                </p>
              </div>
              
              {/* Warning jika bukan cluster yang seharusnya */}
              {(() => {
                const targetCluster = autoRecommend ? recommendedLocation?.clusterChar : manualLocation.clusterChar;
                const homeCluster = itemToMove.products.default_cluster;
                
                // Cek menggunakan function isOutsideProductHome yang sudah support multiple homes
                const targetLorong = autoRecommend 
                  ? parseInt(recommendedLocation?.lorong.replace('L', '') || '0')
                  : parseInt(manualLocation.lorong.replace('L', ''));
                const targetBaris = autoRecommend
                  ? parseInt(recommendedLocation?.baris.replace('B', '') || '0')
                  : parseInt(manualLocation.baris.replace('B', ''));
                
                if (!targetCluster || !targetLorong || !targetBaris) return null;
                
                const homeCheckResult = isOutsideProductHome(itemToMove.products.id, targetCluster, targetLorong, targetBaris);
                
                // FIXED: Check if target cluster exists in ANY product home rules (not just default_cluster)
                const productHomeRules = productHomes.filter((h: any) => h.product_id === itemToMove.products.id && h.is_active);
                const hasHomeInTargetCluster = productHomeRules.some((rule: any) => rule.cluster_char === targetCluster);
                const isWrongCluster = homeCluster && targetCluster !== homeCluster && !hasHomeInTargetCluster;
                
                if (homeCheckResult.isOutside || isWrongCluster) {
                  return (
                    <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3 mb-4">
                      <div className="flex items-start gap-2">
                        <span className="text-2xl">⚠️</span>
                        <div className="flex-1 text-sm">
                          <p className="font-bold text-amber-800 mb-1">Peringatan:</p>
                          {isWrongCluster && (
                            <p className="text-amber-700">
                              • Lokasi tujuan di <strong>Cluster {targetCluster}</strong>, sedangkan home cluster produk ini adalah <strong>Cluster {homeCluster}</strong>
                            </p>
                          )}
                          {homeCheckResult.isOutside && (
                            <p className="text-amber-700 mt-1">
                              • {homeCheckResult.message}
                            </p>
                          )}
                          <p className="text-amber-600 font-semibold mt-2">
                            Yakin tetap ingin memindahkan?
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              
              <div className="flex gap-3">
                <button onClick={() => setShowConfirmModal(false)} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300">
                  Batal
                </button>
                <button onClick={confirmMove} className="flex-1 bg-violet-600 text-white py-3 rounded-xl font-semibold hover:bg-violet-700">
                  Ya, Pindahkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      {showNotificationModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => handleBackdropClick(e, () => setShowNotificationModal(false))}
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div
              className={`p-6 ${
                notificationType === "success"
                  ? "bg-gradient-to-r from-violet-500 to-purple-600"
                  : notificationType === "error"
                  ? "bg-gradient-to-r from-red-500 to-pink-600"
                  : "bg-gradient-to-r from-amber-500 to-orange-600"
              }`}
            >
              <div className="flex flex-col items-center text-center">
                {notificationType === "success" ? (
                  <CheckCircle className="h-16 w-16 text-white mb-3" />
                ) : (
                  <XCircle className="h-16 w-16 text-white mb-3" />
                )}
                <h3 className="text-xl font-bold text-white">{notificationTitle}</h3>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-700 text-center whitespace-pre-line">{notificationMessage}</p>
              <button
                onClick={() => setShowNotificationModal(false)}
                className="w-full mt-4 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedHistory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => handleBackdropClick(e, () => setShowDetailModal(false))}
        >
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-4">
              <h3 className="text-xl font-bold text-white">Detail Permutasi</h3>
              <p className="text-violet-100 text-sm mt-1">{selectedHistory.transaction_code}</p>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Product Info */}
              <div className="bg-violet-50 rounded-xl p-4">
                <h4 className="font-bold text-violet-900 mb-3 flex items-center gap-2">
                  <span className="text-xl">📦</span> Informasi Produk
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Kode Produk:</span>
                    <p className="font-bold text-gray-900">{selectedHistory.products?.product_code || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Nama Produk:</span>
                    <p className="font-bold text-gray-900">{selectedHistory.products?.product_name || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Jumlah:</span>
                    <p className="font-bold text-violet-700">{selectedHistory.qty_carton} Carton</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Status FEFO:</span>
                    <p className="font-bold text-gray-900">
                      {selectedHistory.stock_list?.fefo_status === 'release' ? '🟢 Release' : 
                       selectedHistory.stock_list?.fefo_status === 'hold' ? '🟡 Hold' : '⚪ Unknown'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Location Movement */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-xl">📍</span> Perpindahan Lokasi
                </h4>
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-red-50 border-2 border-red-200 rounded-lg p-3">
                    <p className="text-xs text-red-600 font-semibold mb-1">DARI</p>
                    <p className="font-mono font-bold text-red-700">
                      {selectedHistory.from_cluster}-L{selectedHistory.from_lorong}-B{selectedHistory.from_baris}-P{selectedHistory.from_level}
                    </p>
                  </div>
                  <span className="text-2xl">➡️</span>
                  <div className="flex-1 bg-green-50 border-2 border-green-200 rounded-lg p-3">
                    <p className="text-xs text-green-600 font-semibold mb-1">KE</p>
                    <p className="font-mono font-bold text-green-700">
                      {selectedHistory.to_cluster}-L{selectedHistory.to_lorong}-B{selectedHistory.to_baris}-P{selectedHistory.to_level}
                    </p>
                  </div>
                </div>
              </div>

              {/* Transaction Info */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <span className="text-xl">ℹ️</span> Informasi Transaksi
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Kode Transaksi:</span>
                    <span className="font-mono font-bold text-gray-900">{selectedHistory.transaction_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Waktu Pemindahan:</span>
                    <span className="font-bold text-gray-900">
                      {new Date(selectedHistory.moved_at).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Alasan:</span>
                    <span className="font-semibold text-gray-900">{selectedHistory.reason}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-2 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
