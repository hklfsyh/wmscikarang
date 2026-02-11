// File: src/components/npl-form.tsx
// NPL (Nota Pengembalian Lapangan) - Inbound Secondary untuk return stock dari lapangan

"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { submitNplAction, getCurrentStockAction } from "@/app/npl/actions";
import { CheckCircle, XCircle, RotateCcw, Package, Truck } from "lucide-react";

// --- CONSTANTS ---
const RECEH_THRESHOLD = 5;

// --- INTERFACES ---
interface RecommendedLocation {
  clusterChar: string;
  lorong: string;
  baris: string;
  level: string;
  qtyCarton: number;
  isReceh: boolean;
}

interface MultiLocationRecommendation {
  locations: RecommendedLocation[];
  totalPalletsPlaced: number;
  needsMultipleLocations: boolean;
}

interface ManualLocationInput {
  clusterChar: string;
  lorong: string;
  baris: string;
  pallet: string;
}

interface ManualLocationRange {
  clusterChar: string;
  lorong: string;
  barisStart: string;
  barisEnd: string;
  palletStart: string;
  palletEnd: string;
}

interface LocationAvailability {
  location: string;
  isOccupied: boolean;
  occupiedBy?: string;
}

// --- BB PRODUK PARSING ---
// Format: YYMMDDXXXX (6 digit angka untuk tanggal + 4 karakter alphanumeric untuk kode plant)
const parseBBProduk = (bb: string): { expiredDate: string; kdPlant: string; isValid: boolean } => {
  if (bb.length !== 10) {
    return { expiredDate: "", kdPlant: "", isValid: false };
  }

  const expiredDateStr = bb.substring(0, 6);
  const kdPlantStr = bb.substring(6, 10);

  // Validasi 6 digit pertama harus angka
  if (!/^\d{6}$/.test(expiredDateStr)) {
    return { expiredDate: "", kdPlant: "", isValid: false };
  }

  // Validasi 4 digit terakhir bisa alphanumeric
  if (!/^[A-Za-z0-9]{4}$/.test(kdPlantStr)) {
    return { expiredDate: "", kdPlant: "", isValid: false };
  }

  const yearPrefix = new Date().getFullYear() < 2050 && Number(expiredDateStr.substring(0, 2)) > 50 ? "19" : "20";
  const year = `${yearPrefix}${expiredDateStr.substring(0, 2)}`;
  const month = expiredDateStr.substring(2, 4);
  const day = expiredDateStr.substring(4, 6);

  const dateObj = new Date(`${year}-${month}-${day}`);
  const validDate =
    !isNaN(dateObj.getTime()) && dateObj.getMonth() + 1 === Number(month) && Number(day) >= 1 && Number(day) <= 31;

  return {
    expiredDate: validDate ? `${year}-${month}-${day}` : "",
    kdPlant: kdPlantStr.toUpperCase(),
    isValid: validDate,
  };
};

interface NplFormProps {
  warehouseId: string;
  products: any[];
  initialStocks: any[];
  clusterConfigs: any[];
  productHomes: any[];
  initialHistory: any[];
  clusterCellOverrides: any[];
}

export function NplForm({ 
  warehouseId, 
  products, 
  initialStocks, 
  clusterConfigs, 
  productHomes, 
  initialHistory,
  clusterCellOverrides
}: NplFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Form state
  const [namaPengemudi, setNamaPengemudi] = useState("");
  const [nomorPolisi, setNomorPolisi] = useState("");
  const [productCode, setProductCode] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [bbProduk, setBbProduk] = useState("");
  const [kdPlant, setKdPlant] = useState("");
  const [expiredDate, setExpiredDate] = useState("");
  const [qtyPalletInput, setQtyPalletInput] = useState("");
  const [qtyCartonInput, setQtyCartonInput] = useState("");
  const [notes, setNotes] = useState("");

  // Location state
  const [autoRecommend, setAutoRecommend] = useState(true);
  const [multiLocationRec, setMultiLocationRec] = useState<MultiLocationRecommendation | null>(null);
  const [manualCluster, setManualCluster] = useState("");
  const [manualLorong, setManualLorong] = useState("");
  const [manualBaris, setManualBaris] = useState("");
  const [manualPallet, setManualPallet] = useState("");
  
  // Range mode state
  const [useRangeMode, setUseRangeMode] = useState(false);
  const [manualRange, setManualRange] = useState<ManualLocationRange>({
    clusterChar: "",
    lorong: "",
    barisStart: "",
    barisEnd: "",
    palletStart: "",
    palletEnd: "",
  });
  const [manualLocations, setManualLocations] = useState<ManualLocationInput[]>([]);
  const [locationAvailability, setLocationAvailability] = useState<LocationAvailability[]>([]);
  const [occupiedLocations, setOccupiedLocations] = useState<LocationAvailability[]>([]);

  // Edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [originalLocations, setOriginalLocations] = useState<any[]>([]);  // Simpan lokasi asli dengan original_created_at

  // Modal states
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState<"success" | "error" | "warning">("success");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false);
  const [showBatalConfirmModal, setShowBatalConfirmModal] = useState(false);
  const [selectedNplForAction, setSelectedNplForAction] = useState<any | null>(null);

  // Notification helpers
  const showNotification = (title: string, message: string, type: "success" | "error" | "warning") => {
    setNotificationTitle(title);
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotificationModal(true);
  };

  const success = (message: string) => showNotification("✅ Berhasil", message, "success");
  const error = (message: string) => showNotification("❌ Error", message, "error");

  // Helper functions untuk dinamis baris dan pallet capacity (HARUS SEBELUM useMemo!)
  const getBarisCountForLorong = (clusterChar: string, lorongNum: number): number => {
    const config = clusterConfigs.find((c: any) => c.cluster_char === clusterChar);
    if (!config) return 9;

    const override = clusterCellOverrides.find(
      (o: any) =>
        o.cluster_config_id === config.id &&
        lorongNum >= o.lorong_start &&
        lorongNum <= o.lorong_end &&
        o.custom_baris_count !== null
    );

    return override?.custom_baris_count || 9;
  };

  const getPalletCapacityForCell = (clusterChar: string, lorongNum: number, barisNum: number): number => {
    const config = clusterConfigs.find((c: any) => c.cluster_char === clusterChar);
    if (!config) return 3;

    const override = clusterCellOverrides.find(
      (o: any) => {
        // Harus match cluster config ID
        if (o.cluster_config_id !== config.id) return false;
        
        // Cek apakah lorongNum berada di range lorong_start sampai lorong_end
        const inLorongRange = lorongNum >= o.lorong_start && lorongNum <= o.lorong_end;
        if (!inLorongRange) return false;
        
        // Cek baris_start dan baris_end:
        // - Jika keduanya null → berlaku untuk SEMUA baris di lorong tersebut
        // - Jika ada nilai → cek apakah barisNum di dalam range
        if (o.baris_start !== null && o.baris_end !== null) {
          const inBarisRange = barisNum >= o.baris_start && barisNum <= o.baris_end;
          if (!inBarisRange) return false;
        }
        
        // Harus punya custom_pallet_level
        return o.custom_pallet_level !== null;
      }
    );

    return override?.custom_pallet_level || 3;
  };

  // Get selected product
  const selectedProduct = useMemo(() => {
    return productCode ? products.find(p => p.product_code === productCode) : null;
  }, [productCode, products]);

  // Product search filter
  const filteredProducts = useMemo(() => {
    if (!productSearch) return products.slice(0, 10);
    const search = productSearch.toLowerCase();
    return products
      .filter((p) => 
        p.product_code.toLowerCase().includes(search) || 
        p.product_name.toLowerCase().includes(search)
      )
      .slice(0, 10);
  }, [productSearch, products]);

  // Qty calculation (same as inbound)
  const qtyPerPalletStd = selectedProduct?.qty_carton_per_pallet || 0;

  const { totalPallets, remainingCartons, totalCartons, shouldAttachReceh } = useMemo(() => {
    const palletInput = Number(qtyPalletInput) || 0;
    const cartonInput = Number(qtyCartonInput) || 0;

    const total = palletInput * qtyPerPalletStd + cartonInput;

    if (qtyPerPalletStd === 0) {
      return { totalPallets: 0, remainingCartons: total, totalCartons: total, shouldAttachReceh: false };
    }

    const calculatedPallets = Math.floor(total / qtyPerPalletStd);
    const remaining = total % qtyPerPalletStd;
    const shouldAttach = remaining > 0 && remaining <= RECEH_THRESHOLD && calculatedPallets > 0;

    return {
      totalPallets: calculatedPallets,
      remainingCartons: remaining,
      totalCartons: total,
      shouldAttachReceh: shouldAttach,
    };
  }, [qtyPalletInput, qtyCartonInput, qtyPerPalletStd]);

  const isReceh = remainingCartons > 0;
  const totalPalletsNeeded = shouldAttachReceh ? totalPallets : totalPallets + (remainingCartons > 0 ? 1 : 0);

  // Cluster & Location Options
  const clusterOptions = useMemo(() => clusterConfigs.filter((c: any) => c.is_active).map((c: any) => c.cluster_char), [clusterConfigs]);

  const lorongOptions = useMemo(() => {
    if (!manualCluster) return [];
    const config = clusterConfigs.find((c: any) => c.cluster_char === manualCluster);
    if (!config) return [];
    return Array.from({ length: config.default_lorong_count }, (_, i) => `L${i + 1}`);
  }, [manualCluster, clusterConfigs]);

  const barisOptions = useMemo(() => {
    if (!manualCluster || !manualLorong) return [];
    const lorongNum = parseInt(manualLorong.replace("L", ""));
    const barisCount = getBarisCountForLorong(manualCluster, lorongNum);
    return Array.from({ length: barisCount }, (_, i) => `B${i + 1}`);
  }, [manualCluster, manualLorong]);

  const palletOptions = useMemo(() => {
    if (!manualCluster || !manualLorong || !manualBaris) return [];
    const lorongNum = parseInt(manualLorong.replace("L", ""));
    const barisNum = parseInt(manualBaris.replace("B", ""));
    const palletCapacity = getPalletCapacityForCell(manualCluster, lorongNum, barisNum);
    return Array.from({ length: palletCapacity }, (_, i) => `P${i + 1}`);
  }, [manualCluster, manualLorong, manualBaris]);

  // Range mode dropdown options
  const manualRangeLorongOptions = useMemo(() => {
    if (!manualRange.clusterChar) return [];
    const config = clusterConfigs.find((c: any) => c.cluster_char === manualRange.clusterChar);
    if (!config) return [];
    return Array.from({ length: config.default_lorong_count }, (_, i) => `L${i + 1}`);
  }, [manualRange.clusterChar, clusterConfigs]);

  const manualRangeBarisOptions = useMemo(() => {
    if (!manualRange.clusterChar || !manualRange.lorong) return [];
    const lorongNum = parseInt(manualRange.lorong.replace("L", ""));
    const barisCount = getBarisCountForLorong(manualRange.clusterChar, lorongNum);
    return Array.from({ length: barisCount }, (_, i) => `B${i + 1}`);
  }, [manualRange.clusterChar, manualRange.lorong]);

  const manualRangePalletOptions = useMemo(() => {
    if (!manualRange.clusterChar || !manualRange.lorong || (!manualRange.barisStart && !manualRange.barisEnd)) return [];
    const lorongNum = parseInt(manualRange.lorong.replace("L", ""));
    const barisNumSample = manualRange.barisStart
      ? parseInt(manualRange.barisStart.replace("B", ""))
      : manualRange.barisEnd
      ? parseInt(manualRange.barisEnd.replace("B", ""))
      : 1;
    const palletCapacity = getPalletCapacityForCell(manualRange.clusterChar, lorongNum, barisNumSample);
    return Array.from({ length: palletCapacity }, (_, i) => `P${i + 1}`);
  }, [manualRange.clusterChar, manualRange.lorong, manualRange.barisStart, manualRange.barisEnd]);

  // Today's NPL history
  const todayNplHistory = useMemo(() => {
    return initialHistory; // Data sudah difilter 'today' di page.tsx
  }, [initialHistory]);

  // Parse BB Produk on change
  useEffect(() => {
    if (bbProduk.length === 10) {
      const parsed = parseBBProduk(bbProduk);
      if (parsed.isValid) {
        setExpiredDate(parsed.expiredDate);
        setKdPlant(parsed.kdPlant);
      } else {
        setExpiredDate("");
        setKdPlant("");
      }
    } else {
      setExpiredDate("");
      setKdPlant("");
    }
  }, [bbProduk]);

  // Wrapper function that calls FEFO with real-time stock data
  const findMultipleRecommendedLocationsRealtime = (clusterChar: string, palletsNeeded: number, realtimeStock: any[]): MultiLocationRecommendation => {
    return findMultipleRecommendedLocationsWithStock(clusterChar, palletsNeeded, realtimeStock);
  };

  // Find multiple recommended locations (same logic as inbound)
  const findMultipleRecommendedLocationsWithStock = (clusterChar: string, palletsNeeded: number, stockData: any[]): MultiLocationRecommendation => {
    const locations: RecommendedLocation[] = [];
    let remainingPallets = palletsNeeded;

    const clusterConfig = clusterConfigs.find((c: any) => c.cluster_char === clusterChar);
    if (!clusterConfig) {
      return { locations: [], totalPalletsPlaced: 0, needsMultipleLocations: false };
    }

    // Get ALL product homes for this product in this cluster (can have multiple)
    const productHomesInCluster = selectedProduct 
      ? productHomes.filter((h: any) => h.product_id === selectedProduct.id && h.cluster_char === clusterChar)
      : [];

    // PHASE 1: Iterate through ALL product homes in this cluster
    if (productHomesInCluster.length > 0) {
      for (const productHome of productHomesInCluster) {
        if (remainingPallets === 0) break;

        const lorongStart = productHome.lorong_start;
        const lorongEnd = productHome.lorong_end;

        for (let lorongNum = lorongStart; lorongNum <= lorongEnd; lorongNum++) {
          if (remainingPallets === 0) break;
          // Skip In Transit area (Cluster C, Lorong 8-11)
          if (clusterChar === "C" && lorongNum >= 8 && lorongNum <= 11) continue;

          // Get baris count DINAMIS dari override
          const maxBaris = getBarisCountForLorong(clusterChar, lorongNum);
          const barisStart = productHome.baris_start;
          const barisEnd = Math.min(productHome.baris_end, maxBaris);

          for (let barisNum = barisStart; barisNum <= barisEnd; barisNum++) {
            if (remainingPallets === 0) break;

            // Get pallet capacity DINAMIS dari override
            const maxPallet = getPalletCapacityForCell(clusterChar, lorongNum, barisNum);
            const productMaxPallet = productHome.max_pallet_per_location || 999;
            const effectiveMaxPallet = Math.min(maxPallet, productMaxPallet);

            for (let palletNum = 1; palletNum <= effectiveMaxPallet; palletNum++) {
              if (remainingPallets === 0) break;

              const lorong = `L${lorongNum}`;
              const baris = `B${barisNum}`;
              const level = `P${palletNum}`;

              const locationExists = stockData.some(
                (item: any) =>
              item.warehouse_id === warehouseId &&
              item.cluster === clusterChar &&
              item.lorong === lorongNum &&
              item.baris === barisNum &&
              item.level === palletNum
          );

          if (!locationExists) {
            const isLastPallet = remainingPallets === 1;
            const qtyForThisLocation =
              isLastPallet && shouldAttachReceh
                ? qtyPerPalletStd + remainingCartons
                : isLastPallet && remainingCartons > 0 && !shouldAttachReceh
                ? remainingCartons
                : qtyPerPalletStd;

            locations.push({
              clusterChar,
              lorong,
              baris,
              level,
              qtyCarton: qtyForThisLocation,
              isReceh: isLastPallet && remainingCartons > 0,
            });
            remainingPallets--;
          }
        } // close for palletNum
      } // close for barisNum
    } // close for lorongNum
  } // close for productHome
} else {
      // FALLBACK: Product has NO homes in this cluster - use entire cluster range
      const lorongStart = 1;
      const lorongEnd = clusterConfig.default_lorong_count;

      for (let lorongNum = lorongStart; lorongNum <= lorongEnd; lorongNum++) {
        if (remainingPallets === 0) break;
        // Skip In Transit area (Cluster C, Lorong 8-11)
        if (clusterChar === "C" && lorongNum >= 8 && lorongNum <= 11) continue;

        const maxBaris = getBarisCountForLorong(clusterChar, lorongNum);

        for (let barisNum = 1; barisNum <= maxBaris; barisNum++) {
          if (remainingPallets === 0) break;

          const maxPallet = getPalletCapacityForCell(clusterChar, lorongNum, barisNum);

          for (let palletNum = 1; palletNum <= maxPallet; palletNum++) {
            if (remainingPallets === 0) break;

            const lorong = `L${lorongNum}`;
            const baris = `B${barisNum}`;
            const level = `P${palletNum}`;

            const locationExists = stockData.some(
              (item: any) =>
                item.warehouse_id === warehouseId &&
                item.cluster === clusterChar &&
                item.lorong === lorongNum &&
                item.baris === barisNum &&
                item.level === palletNum
            );

            if (!locationExists) {
              const isLastPallet = remainingPallets === 1;
              const qtyForThisLocation =
                isLastPallet && shouldAttachReceh
                  ? qtyPerPalletStd + remainingCartons
                  : isLastPallet && remainingCartons > 0 && !shouldAttachReceh
                  ? remainingCartons
                  : qtyPerPalletStd;

              locations.push({
                clusterChar,
                lorong,
                baris,
                level,
                qtyCarton: qtyForThisLocation,
                isReceh: isLastPallet && remainingCartons > 0,
              });
              remainingPallets--;
            }
          }
        }
      }
    }

    // PHASE 2: Overflow ke In Transit (dinamis dari cluster_cell_overrides)
    if (remainingPallets > 0) {
      // Cari area transit dari clusterCellOverrides dengan is_transit_area = true
      const transitOverrides = clusterCellOverrides.filter((o: any) => o.is_transit_area === true);
      
      for (const transitOverride of transitOverrides) {
        if (remainingPallets === 0) break;

        // Cari cluster config untuk transit ini
        const transitConfig = clusterConfigs.find((c: any) => c.id === transitOverride.cluster_config_id);
        if (!transitConfig) continue;

        const transitCluster = transitConfig.cluster_char;
        const lorongStart = transitOverride.lorong_start;
        const lorongEnd = transitOverride.lorong_end;

        for (let lorongNum = lorongStart; lorongNum <= lorongEnd; lorongNum++) {
          if (remainingPallets === 0) break;

          // Cari baris count untuk lorong ini (bisa custom atau default 9)
          const barisOverride = clusterCellOverrides.find(
            (o: any) =>
              o.cluster_config_id === transitConfig.id &&
              lorongNum >= o.lorong_start &&
              lorongNum <= o.lorong_end &&
              o.custom_baris_count !== null
          );
          const maxBaris = barisOverride?.custom_baris_count || 9;

          for (let barisNum = 1; barisNum <= maxBaris; barisNum++) {
            if (remainingPallets === 0) break;

            // Cari pallet level untuk cell ini (bisa custom atau default 3)
            const palletOverride = clusterCellOverrides.find(
              (o: any) =>
                o.cluster_config_id === transitConfig.id &&
                lorongNum >= o.lorong_start &&
                lorongNum <= o.lorong_end &&
                (o.baris_start === null || (barisNum >= o.baris_start && barisNum <= (o.baris_end || barisNum))) &&
                o.custom_pallet_level !== null
            );
            const maxPallet = palletOverride?.custom_pallet_level || 3;

            for (let palletNum = 1; palletNum <= maxPallet; palletNum++) {
              if (remainingPallets === 0) break;

              const lorong = `L${lorongNum}`;
              const baris = `B${barisNum}`;
              const level = `P${palletNum}`;

              const locationExists = stockData.some(
                (item: any) =>
                  item.warehouse_id === warehouseId &&
                  item.cluster === transitCluster &&
                  item.lorong === lorongNum &&
                  item.baris === barisNum &&
                  item.level === palletNum
              );

              if (!locationExists) {
                const isLastPallet = remainingPallets === 1;
                locations.push({
                  clusterChar: transitCluster,
                  lorong,
                  baris,
                  level,
                  qtyCarton: isLastPallet && remainingCartons > 0 ? remainingCartons : qtyPerPalletStd,
                  isReceh: isLastPallet && remainingCartons > 0,
                });
                remainingPallets--;
              }
            }
          }
        }
      }
    }

    return {
      locations,
      totalPalletsPlaced: palletsNeeded - remainingPallets,
      needsMultipleLocations: locations.length > 1,
    };
  };

  // Expand range to individual locations (with real-time stock check)
  const expandRangeToLocations = async () => {
    const { clusterChar, lorong, barisStart, barisEnd, palletStart, palletEnd } = manualRange;

    if (!clusterChar || !lorong || !barisStart || !barisEnd || !palletStart || !palletEnd) {
      error("Semua field range harus diisi!");
      return;
    }

    const barisStartNum = parseInt(barisStart.replace(/[^0-9]/g, ""));
    const barisEndNum = parseInt(barisEnd.replace(/[^0-9]/g, ""));
    const palletStartNum = parseInt(palletStart.replace(/[^0-9]/g, ""));
    const palletEndNum = parseInt(palletEnd.replace(/[^0-9]/g, ""));
    const lorongNum = parseInt(lorong.replace("L", ""));

    if (isNaN(barisStartNum) || isNaN(barisEndNum) || isNaN(palletStartNum) || isNaN(palletEndNum) || isNaN(lorongNum)) {
      error("Format lorong/baris/pallet tidak valid! Contoh: L1, B1, P1");
      return;
    }

    if (barisStartNum > barisEndNum || palletStartNum > palletEndNum) {
      error("Range tidak valid! Start harus ≤ End");
      return;
    }

    // Fetch real-time stock data before filtering
    const stockResult = await getCurrentStockAction(warehouseId);
    if (!stockResult.success || !stockResult.stock) {
      error("Gagal mengambil data stok terkini: " + (stockResult.error || "Unknown error"));
      return;
    }

    const freshStock: any[] = stockResult.stock;

    // Generate all locations from range
    const allLocations: ManualLocationInput[] = [];
    for (let b = barisStartNum; b <= barisEndNum; b++) {
      for (let p = palletStartNum; p <= palletEndNum; p++) {
        allLocations.push({
          clusterChar,
          lorong,
          baris: `B${b}`,
          pallet: `P${p}`,
        });
      }
    }

    // Filter hanya lokasi yang KOSONG (using real-time stock)
    const availableLocations = allLocations.filter((loc) => {
      const lorongNumCheck = parseInt(loc.lorong.replace("L", ""));
      const barisNumCheck = parseInt(loc.baris.replace("B", ""));
      const palletNumCheck = parseInt(loc.pallet.replace("P", ""));

      const existingStock = freshStock.find(
        (s: any) =>
          s.cluster === loc.clusterChar &&
          s.lorong === lorongNumCheck &&
          s.baris === barisNumCheck &&
          s.level === palletNumCheck
      );

      return !existingStock;
    });

    const occupiedCount = allLocations.length - availableLocations.length;

    if (availableLocations.length < totalPalletsNeeded) {
      error(
        `Range menghasilkan ${allLocations.length} lokasi (${occupiedCount} terisi, ${availableLocations.length} kosong).\nButuh ${totalPalletsNeeded} lokasi kosong, hanya tersedia ${availableLocations.length}!`
      );
      return;
    }

    // Ambil lokasi kosong sesuai kebutuhan
    const locationsToUse = availableLocations.slice(0, totalPalletsNeeded);

    if (occupiedCount > 0) {
      success(
        `✅ Range diproses!\n\nTotal: ${allLocations.length} lokasi\n- Terisi: ${occupiedCount} lokasi (di-skip)\n- Kosong: ${availableLocations.length} lokasi\n- Digunakan: ${locationsToUse.length} lokasi`
      );
    } else {
      success(`✅ ${locationsToUse.length} lokasi kosong siap digunakan!`);
    }

    setManualLocations(locationsToUse);
    setLocationAvailability([]);
    setOccupiedLocations([]);
  };

  const resetManualRange = () => {
    setManualRange({
      clusterChar: "",
      lorong: "",
      barisStart: "",
      barisEnd: "",
      palletStart: "",
      palletEnd: "",
    });
    setManualLocations([]);
    setLocationAvailability([]);
    setOccupiedLocations([]);
  };

  // Handle recommend button
  const handleRecommend = async () => {
    if (!productCode) {
      error("Pilih produk terlebih dahulu.");
      return;
    }
    if (!bbProduk || bbProduk.length !== 10) {
      error("BB Produk harus diisi dengan format 10 digit (YYMMDDXXXX).");
      return;
    }
    if (totalPalletsNeeded === 0) {
      error("Qty harus lebih dari 0.");
      return;
    }

    // Fetch real-time stock data from database
    const stockResult = await getCurrentStockAction(warehouseId);
    if (!stockResult.success || !stockResult.stock) {
      error("Gagal mengambil data stok terkini: " + (stockResult.error || "Unknown error"));
      return;
    }

    const realtimeStock: any[] = stockResult.stock;
    const homeCluster = selectedProduct?.default_cluster || "A";

    // CRITICAL: Only prioritize RECEH if current input HAS remaining cartons (isReceh)
    let recommendations: RecommendedLocation[] = [];
    
    if (isReceh) {
      // Input is RECEH - prioritize existing RECEH locations for sharing
      if (selectedProduct) {
        const recehLocations = realtimeStock.filter(
          (s) => s.product_id === selectedProduct.id && s.status === "receh"
        );
        
        // Add existing RECEH locations first (for sharing)
        recehLocations.slice(0, totalPalletsNeeded).forEach(receh => {
          recommendations.push({
            clusterChar: receh.cluster,
            lorong: `L${receh.lorong}`,
            baris: `B${receh.baris}`,
            level: `P${receh.level}`,
            qtyCarton: 0, // Will be calculated later
            isReceh: true,
          });
        });
        
        // If still need more locations, use FEFO for empty spots
        const remainingNeeded = totalPalletsNeeded - recommendations.length;
        if (remainingNeeded > 0) {
          const multiRec = findMultipleRecommendedLocationsRealtime(
            homeCluster, 
            remainingNeeded, 
            realtimeStock
          );
          recommendations = [...recommendations, ...multiRec.locations];
        }
        
        // Show special message for RECEH sharing
        if (recehLocations.length > 0 && recommendations.length > 0) {
          success(`✅ Merekomendasikan RECEH sharing di ${recommendations[0].clusterChar}-${recommendations[0].lorong}-${recommendations[0].baris}-${recommendations[0].level} (existing: ${recehLocations[0].qty_carton} carton)`);
        }
      }
    } else {
      // Input is FULL PALLET - skip RECEH, go directly to empty locations
      const multiRec = findMultipleRecommendedLocationsRealtime(
        homeCluster, 
        totalPalletsNeeded, 
        realtimeStock
      );
      recommendations = multiRec.locations;
      success(`✅ Ditemukan ${recommendations.length} lokasi kosong yang sesuai!`);
    }

    if (recommendations.length === 0) {
      error("Tidak ada lokasi kosong yang tersedia.");
      setMultiLocationRec(null);
      return;
    }

    if (recommendations.length < totalPalletsNeeded) {
      error(
        `Hanya ditemukan ${recommendations.length} lokasi dari ${totalPalletsNeeded} yang dibutuhkan. Sebagian akan masuk In Transit.`
      );
    }

    setMultiLocationRec({
      locations: recommendations,
      totalPalletsPlaced: recommendations.length,
      needsMultipleLocations: recommendations.length > 1
    });
  };

  // Reset form
  const resetForm = () => {
    setNamaPengemudi("");
    setNomorPolisi("");
    setProductCode("");
    setProductSearch("");
    setBbProduk("");
    setKdPlant("");
    setExpiredDate("");
    setQtyPalletInput("");
    setQtyCartonInput("");
    setNotes("");
    setAutoRecommend(true);
    setMultiLocationRec(null);
    setManualCluster("");
    setManualLorong("");
    setManualBaris("");
    setManualPallet("");
    setIsEditMode(false);
    setEditId(null);
    setOriginalLocations([]);  // Clear original locations
    setUseRangeMode(false);
    resetManualRange();
  };

  // Validate form
  const validateForm = (): boolean => {
    if (!namaPengemudi.trim()) {
      error("Nama pengemudi wajib diisi.");
      return false;
    }
    if (!nomorPolisi.trim()) {
      error("Nomor polisi wajib diisi.");
      return false;
    }
    if (!productCode) {
      error("Pilih produk terlebih dahulu.");
      return false;
    }
    if (!bbProduk || bbProduk.length !== 10) {
      error("BB Produk harus diisi dengan format 10 digit (YYMMDDXXXX).");
      return false;
    }
    if (!expiredDate) {
      error("Format BB Produk tidak valid. Tidak dapat menentukan expired date.");
      return false;
    }
    if (totalCartons <= 0) {
      error("Qty karton harus lebih dari 0.");
      return false;
    }
    if (Number(qtyCartonInput) >= qtyPerPalletStd && qtyPerPalletStd > 0) {
      error(`Input Karton Sisa (${qtyCartonInput}) tidak boleh melebihi atau sama dengan kapasitas 1 pallet (${qtyPerPalletStd}). Gunakan input Pallet Utuh.`);
      return false;
    }
    if (autoRecommend && (!multiLocationRec || multiLocationRec.locations.length === 0)) {
      error("Cari rekomendasi lokasi terlebih dahulu atau pilih manual.");
      return false;
    }
    if (!autoRecommend) {
      // Range mode check
      if (useRangeMode) {
        if (manualLocations.length === 0) {
          error("Generate lokasi dari range terlebih dahulu.");
          return false;
        }
        if (manualLocations.length < totalPalletsNeeded) {
          error(`Lokasi yang tersedia (${manualLocations.length}) kurang dari yang dibutuhkan (${totalPalletsNeeded}).`);
          return false;
        }
      } else {
        // Single location mode check
        if (!manualCluster || !manualLorong || !manualBaris || !manualPallet) {
          error("Lengkapi lokasi manual.");
          return false;
        }
        // Check if manual location is occupied
        const isOccupied = initialStocks.some(
          (s: any) =>
            s.cluster === manualCluster &&
            s.lorong === parseInt(manualLorong.replace('L', '')) &&
            s.baris === parseInt(manualBaris.replace('B', '')) &&
            s.level === parseInt(manualPallet.replace('P', ''))
        );
        if (isOccupied) {
          error("Lokasi tujuan sudah terisi!");
          return false;
        }
      }
    }
    return true;
  };

  // Open confirm modal
  const handleSubmitClick = () => {
    if (!validateForm()) return;
    setShowConfirmModal(true);
  };

  // Confirm submit
  const confirmSubmit = async () => {
    if (!selectedProduct || !expiredDate) return;

    setIsSubmitting(true);
    setShowConfirmModal(false);

    // 1. Siapkan data penempatan untuk dikirim ke DB
    const placements = (autoRecommend && multiLocationRec) 
      ? multiLocationRec.locations.map((loc, idx) => {
          const placement: any = {
            cluster: loc.clusterChar,
            lorong: parseInt(loc.lorong.replace('L', '')),
            baris: parseInt(loc.baris.replace('B', '')),
            level: parseInt(loc.level.replace('P', '')),
            qtyCarton: loc.qtyCarton,
            isReceh: loc.isReceh
          };
          // PENTING: Jika edit mode, preserve original_created_at untuk menjaga urutan FEFO
          if (isEditMode && originalLocations[idx]?.original_created_at) {
            placement.original_created_at = originalLocations[idx].original_created_at;
          }
          return placement;
        })
      : useRangeMode
      ? manualLocations.slice(0, totalPalletsNeeded).map((loc, idx) => {
          const isLastLoc = idx === totalPalletsNeeded - 1;
          const qtyForThisLocation =
            isLastLoc && shouldAttachReceh
              ? qtyPerPalletStd + remainingCartons
              : isLastLoc && remainingCartons > 0 && !shouldAttachReceh
              ? remainingCartons
              : qtyPerPalletStd;
          const placement: any = {
            cluster: loc.clusterChar,
            lorong: parseInt(loc.lorong.replace('L', '')),
            baris: parseInt(loc.baris.replace('B', '')),
            level: parseInt(loc.pallet.replace('P', '')),
            qtyCarton: qtyForThisLocation,
            isReceh: isLastLoc && remainingCartons > 0,
            ...(isEditMode && originalLocations[0]?.original_created_at && {
              original_created_at: originalLocations[0].original_created_at
            })
          };
          return placement;
        })
      : [{
          cluster: manualCluster,
          lorong: parseInt(manualLorong.replace('L', '')),
          baris: parseInt(manualBaris.replace('B', '')),
          level: parseInt(manualPallet.replace('P', '')),
          qtyCarton: totalCartons,
          isReceh: totalCartons < qtyPerPalletStd,
          // Preserve untuk manual juga
          ...(isEditMode && originalLocations[0]?.original_created_at && {
            original_created_at: originalLocations[0].original_created_at
          })
        }];

    // 2. Siapkan formData (tanpa baseStatus manual - biarkan trigger database menentukan)
    const formData = {
      warehouseId,
      productId: selectedProduct.id,
      bbProduk,
      totalQty: totalCartons,
      expiredDate,
      driverName: namaPengemudi,
      vehicleNumber: nomorPolisi,
      notes
    };

    try {
      const res = await submitNplAction(formData, placements);

      if (res.success) {
        success(`NPL Berhasil disimpan dengan kode: ${res.transactionCode}`);
        resetForm();
        router.refresh(); // Sinkronisasi database ke UI
      } else {
        error(res.message || "Gagal menyimpan NPL");
      }
    } catch (err) {
      error("Terjadi kesalahan sistem saat submit NPL.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit NPL (Soft Delete - Hapus stok, populate form)
  const handleEditClick = (npl: any) => {
    setSelectedNplForAction(npl);
    setShowEditConfirmModal(true);
  };

  const confirmEdit = async () => {
    if (!selectedNplForAction) return;

    setShowEditConfirmModal(false);
    setIsSubmitting(true);

    try {
      // Import cancelNplAction
      const { cancelNplAction } = await import("@/app/npl/actions");
      const result = await cancelNplAction(selectedNplForAction.id);

      if (result.success) {
        // Populate form dengan data lama
        const npl = selectedNplForAction;
        const product = products.find(p => p.id === npl.product_id);
        
        if (product) {
          setProductCode(product.product_code);
          setProductSearch(product.product_name);
        }
        setBbProduk(npl.bb_produk);
        setNamaPengemudi(npl.driver_name);
        setNomorPolisi(npl.vehicle_number);
        setNotes(npl.notes || "");
        
        // Set qty dari total carton
        if (product) {
          const fullPallets = Math.floor(npl.qty_carton / product.qty_carton_per_pallet);
          const remaining = npl.qty_carton % product.qty_carton_per_pallet;
          setQtyPalletInput(fullPallets.toString());
          setQtyCartonInput(remaining.toString());
        }

        // PENTING: Simpan original locations untuk preserve created_at
        setOriginalLocations(npl.locations || []);

        setIsEditMode(true);
        setEditId(npl.id);

        success("Data NPL dimuat ke form. Silakan edit dan submit ulang.");
        router.refresh();
      } else {
        error(result.message || "Gagal memuat data NPL");
      }
    } catch (err) {
      error("Terjadi kesalahan saat memuat data NPL.");
    } finally {
      setIsSubmitting(false);
      setSelectedNplForAction(null);
    }
  };

  // Cancel NPL (Hard Delete)
  const handleCancelClick = (npl: any) => {
    setSelectedNplForAction(npl);
    setShowBatalConfirmModal(true);
  };

  const confirmBatal = async () => {
    if (!selectedNplForAction) return;

    setShowBatalConfirmModal(false);
    setIsSubmitting(true);

    try {
      const { cancelNplAction } = await import("@/app/npl/actions");
      const result = await cancelNplAction(selectedNplForAction.id);

      if (result.success) {
        success("Transaksi NPL berhasil dibatalkan.");
        router.refresh();
      } else {
        error(result.message || "Gagal membatalkan NPL");
      }
    } catch (err) {
      error("Terjadi kesalahan saat membatalkan NPL.");
    } finally {
      setIsSubmitting(false);
      setSelectedNplForAction(null);
    }
  };

  // Modal backdrop click handler
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>, closeModal: () => void) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-500 rounded-lg sm:rounded-xl flex items-center justify-center">
              <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{isEditMode ? "Edit NPL" : "NPL (Return)"}</h1>
              <p className="text-xs sm:text-sm text-gray-600">Nota Pengembalian Lapangan - Inbound Secondary</p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
                {/* Driver Info */}
                <div className="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4">
                  <h3 className="font-semibold text-gray-800 mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                    <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />
                    Informasi Pengemudi
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Nama Pengemudi <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={namaPengemudi}
                        onChange={(e) => setNamaPengemudi(e.target.value)}
                        placeholder="Masukkan nama pengemudi"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Nomor Polisi <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={nomorPolisi}
                        onChange={(e) => setNomorPolisi(e.target.value.toUpperCase())}
                        placeholder="B 1234 ABC"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-200 uppercase transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Product Info */}
                <div className="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4">
                  <h3 className="font-semibold text-gray-800 mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                    <Package className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />
                    Informasi Produk
                  </h3>
                  <div className="space-y-3 sm:space-y-4">
                    {/* Product Search */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Cari Produk <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Cari kode atau nama produk..."
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all"
                      />
                      {productSearch && (
                        <div className="mt-2 max-h-48 overflow-y-auto border-2 border-gray-100 rounded-xl bg-white">
                          {filteredProducts.map((p) => (
                            <button
                              key={p.product_code}
                              type="button"
                              onClick={() => {
                                setProductCode(p.product_code);
                                setProductSearch(p.product_name);
                                setMultiLocationRec(null);
                              }}
                              className={`w-full text-left px-4 py-2 hover:bg-teal-50 transition-colors ${
                                productCode === p.product_code ? "bg-teal-100" : ""
                              }`}
                            >
                              <span className="font-medium text-gray-900">{p.product_code}</span>
                              <span className="text-gray-500 text-sm ml-2">{p.product_name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedProduct && (
                      <div className="bg-teal-50 border border-teal-200 rounded-xl p-3">
                        <p className="text-sm text-teal-800">
                          <strong>Produk Terpilih:</strong> {selectedProduct.product_code} - {selectedProduct.product_name}
                        </p>
                        <p className="text-xs text-teal-600 mt-1">
                          Home Cluster: {selectedProduct.default_cluster || "N/A"} | Qty/Pallet:{" "}
                          {selectedProduct.qty_carton_per_pallet} | Qty/Carton: {selectedProduct.qty_per_carton}
                        </p>
                      </div>
                    )}

                    {/* BB Produk */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          BB Produk <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={bbProduk}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            // 6 digit pertama harus angka, 4 digit terakhir bisa alphanumeric
                            const first6 = val.substring(0, 6).replace(/\D/g, "");
                            const last4 = val.substring(6, 10).replace(/[^A-Z0-9]/g, "");
                            setBbProduk(first6 + last4);
                          }}
                          placeholder="YYMMDDXXXX (6 angka + 4 alphanumeric)"
                          maxLength={10}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-200 font-mono transition-all uppercase"
                        />
                        {bbProduk.length === 10 && expiredDate && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ Expired: {expiredDate} | Plant: {kdPlant}
                          </p>
                        )}
                        {bbProduk.length === 10 && !expiredDate && (
                          <p className="text-xs text-red-500 mt-1">✗ Format tidak valid</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Expired Date</label>
                        <input
                          type="text"
                          value={expiredDate}
                          readOnly
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-100 text-gray-600"
                        />
                      </div>
                    </div>

                    {/* Qty */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Qty Pallet Utuh</label>
                        <input
                          type="number"
                          value={qtyPalletInput}
                          onChange={(e) => {
                            setQtyPalletInput(e.target.value);
                            setMultiLocationRec(null);
                          }}
                          placeholder="0"
                          min="0"
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Qty Karton Sisa</label>
                        <input
                          type="number"
                          value={qtyCartonInput}
                          onChange={(e) => {
                            setQtyCartonInput(e.target.value);
                            setMultiLocationRec(null);
                          }}
                          placeholder="0"
                          min="0"
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all"
                        />
                      </div>
                    </div>

                    {/* Qty Summary */}
                    {selectedProduct && totalCartons > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                        <p className="text-sm text-blue-800 font-medium">Ringkasan Perhitungan:</p>
                        <div className="text-xs text-blue-700 mt-1 space-y-1">
                          <p>
                            Total Karton: <strong>{totalCartons}</strong> ({qtyPalletInput || 0} × {qtyPerPalletStd} +{" "}
                            {qtyCartonInput || 0})
                          </p>
                          <p>
                            Pallet Utuh: <strong>{totalPallets}</strong> | Sisa: <strong>{remainingCartons}</strong>{" "}
                            karton
                            {shouldAttachReceh && " (digabung ke pallet terakhir)"}
                          </p>
                          <p>
                            Total Lokasi Dibutuhkan: <strong>{totalPalletsNeeded}</strong>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Catatan (Opsional)</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Catatan tambahan..."
                        rows={2}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="bg-teal-50 border-2 border-teal-200 rounded-xl p-4">
                  <h3 className="font-semibold text-teal-900 mb-3">📍 Lokasi Penempatan</h3>
                  <div className="flex gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={autoRecommend}
                        onChange={() => setAutoRecommend(true)}
                        className="w-4 h-4 text-teal-600"
                      />
                      <span className="text-sm font-medium text-teal-800">Auto Recommend</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!autoRecommend}
                        onChange={() => setAutoRecommend(false)}
                        className="w-4 h-4 text-teal-600"
                      />
                      <span className="text-sm font-medium text-teal-800">Manual</span>
                    </label>
                  </div>

                  {autoRecommend ? (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={handleRecommend}
                        disabled={!productCode || totalPalletsNeeded === 0}
                        className="w-full px-4 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        🔍 Cari Rekomendasi Lokasi ({totalPalletsNeeded} lokasi)
                      </button>

                      {multiLocationRec && multiLocationRec.locations.length > 0 && (
                        <div className="bg-white border border-teal-300 rounded-xl p-3 max-h-48 overflow-y-auto">
                          <p className="text-sm font-medium text-teal-800 mb-2">
                            Lokasi Ditemukan ({multiLocationRec.locations.length}):
                          </p>
                          <div className="space-y-1">
                            {multiLocationRec.locations.map((loc, idx) => (
                              <div
                                key={idx}
                                className={`text-xs p-2 rounded ${loc.isReceh ? "bg-blue-50 text-blue-800" : "bg-green-50 text-green-800"}`}
                              >
                                <span className="font-mono">
                                  {loc.clusterChar}-{loc.lorong}-{loc.baris}-{loc.level}
                                </span>
                                <span className="ml-2">({loc.qtyCarton} karton)</span>
                                {loc.isReceh && <span className="ml-1 text-blue-600">🔵 Receh</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Toggle Single vs Range */}
                      <div className="flex gap-4 mb-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={!useRangeMode}
                            onChange={() => {
                              setUseRangeMode(false);
                              resetManualRange();
                            }}
                            className="w-4 h-4 text-orange-600"
                          />
                          <span className="text-xs font-medium text-gray-700">Single Location</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={useRangeMode}
                            onChange={() => {
                              setUseRangeMode(true);
                              setManualCluster("");
                              setManualLorong("");
                              setManualBaris("");
                              setManualPallet("");
                            }}
                            className="w-4 h-4 text-orange-600"
                          />
                          <span className="text-xs font-medium text-gray-700">Range Mode</span>
                        </label>
                      </div>

                      {!useRangeMode ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Cluster</label>
                            <select
                              value={manualCluster}
                              onChange={(e) => {
                                setManualCluster(e.target.value);
                                setManualLorong("");
                                setManualBaris("");
                                setManualPallet("");
                              }}
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
                              value={manualLorong}
                              onChange={(e) => {
                                setManualLorong(e.target.value);
                                setManualBaris("");
                                setManualPallet("");
                              }}
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
                              value={manualBaris}
                              onChange={(e) => {
                                setManualBaris(e.target.value);
                                setManualPallet("");
                              }}
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
                              value={manualPallet}
                              onChange={(e) => setManualPallet(e.target.value)}
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
                      ) : (
                        <div className="space-y-3">
                          {/* Range Input */}
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                            <div className="grid grid-cols-3 gap-3 mb-3">
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                  Cluster <span className="text-red-500">*</span>
                                </label>
                                <select
                                  value={manualRange.clusterChar}
                                  onChange={(e) =>
                                    setManualRange((prev) => ({
                                      ...prev,
                                      clusterChar: e.target.value,
                                      lorong: "",
                                      barisStart: "",
                                      barisEnd: "",
                                      palletStart: "",
                                      palletEnd: "",
                                    }))
                                  }
                                  className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-100 focus:border-orange-500 transition-all"
                                >
                                  <option value="">-- Pilih --</option>
                                  {clusterOptions.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                  Lorong <span className="text-red-500">*</span>
                                </label>
                                <select
                                  value={manualRange.lorong}
                                  onChange={(e) =>
                                    setManualRange((prev) => ({
                                      ...prev,
                                      lorong: e.target.value,
                                      barisStart: "",
                                      barisEnd: "",
                                      palletStart: "",
                                      palletEnd: "",
                                    }))
                                  }
                                  className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-100 focus:border-orange-500 transition-all"
                                  disabled={!manualRange.clusterChar}
                                >
                                  <option value="">-- Pilih --</option>
                                  {manualRangeLorongOptions.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">&nbsp;</label>
                                <button
                                  type="button"
                                  onClick={resetManualRange}
                                  className="w-full px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                >
                                  🔄 Reset
                                </button>
                              </div>
                            </div>

                            {/* Baris Range */}
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                  Baris Start <span className="text-red-500">*</span>
                                </label>
                                <select
                                  value={manualRange.barisStart}
                                  onChange={(e) =>
                                    setManualRange((prev) => ({
                                      ...prev,
                                      barisStart: e.target.value,
                                      palletStart: "",
                                      palletEnd: "",
                                    }))
                                  }
                                  className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-100 focus:border-orange-500 transition-all"
                                  disabled={!manualRange.clusterChar || !manualRange.lorong}
                                >
                                  <option value="">-- Pilih --</option>
                                  {manualRangeBarisOptions.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                  Baris End <span className="text-red-500">*</span>
                                </label>
                                <select
                                  value={manualRange.barisEnd}
                                  onChange={(e) =>
                                    setManualRange((prev) => ({
                                      ...prev,
                                      barisEnd: e.target.value,
                                    }))
                                  }
                                  className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-100 focus:border-orange-500 transition-all"
                                  disabled={!manualRange.clusterChar || !manualRange.lorong}
                                >
                                  <option value="">-- Pilih --</option>
                                  {manualRangeBarisOptions.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Pallet Range */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                  Pallet Start <span className="text-red-500">*</span>
                                </label>
                                <select
                                  value={manualRange.palletStart}
                                  onChange={(e) =>
                                    setManualRange((prev) => ({
                                      ...prev,
                                      palletStart: e.target.value,
                                    }))
                                  }
                                  className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-100 focus:border-orange-500 transition-all"
                                  disabled={
                                    !manualRange.clusterChar ||
                                    !manualRange.lorong ||
                                    !manualRange.barisStart
                                  }
                                >
                                  <option value="">-- Pilih --</option>
                                  {manualRangePalletOptions.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                  Pallet End <span className="text-red-500">*</span>
                                </label>
                                <select
                                  value={manualRange.palletEnd}
                                  onChange={(e) =>
                                    setManualRange((prev) => ({
                                      ...prev,
                                      palletEnd: e.target.value,
                                    }))
                                  }
                                  className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-100 focus:border-orange-500 transition-all"
                                  disabled={
                                    !manualRange.clusterChar ||
                                    !manualRange.lorong ||
                                    !manualRange.barisStart
                                  }
                                >
                                  <option value="">-- Pilih --</option>
                                  {manualRangePalletOptions.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={expandRangeToLocations}
                              disabled={totalPalletsNeeded === 0}
                              className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                              🔍 Generate & Cek Ketersediaan Lokasi ({totalPalletsNeeded} dibutuhkan)
                            </button>
                          </div>

                          {/* Preview Generated Locations */}
                          {manualLocations.length > 0 && (
                            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-green-900">
                                  ✅ {manualLocations.length} Lokasi Siap Digunakan
                                </h4>
                              </div>
                              <div className="max-h-48 overflow-y-auto space-y-1">
                                {manualLocations.slice(0, totalPalletsNeeded).map((loc, idx) => {
                                  const locationKey = `${loc.clusterChar}-${loc.lorong}-${loc.baris}-${loc.pallet}`;
                                  const isLastLoc = idx === totalPalletsNeeded - 1;
                                  const qtyForThisLocation =
                                    isLastLoc && shouldAttachReceh
                                      ? qtyPerPalletStd + remainingCartons
                                      : isLastLoc && remainingCartons > 0 && !shouldAttachReceh
                                      ? remainingCartons
                                      : qtyPerPalletStd;
                                  const isRecehLoc = isLastLoc && remainingCartons > 0;

                                  return (
                                    <div
                                      key={idx}
                                      className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                                        isRecehLoc ? "bg-blue-100 border border-blue-300" : "bg-white border border-green-200"
                                      }`}
                                    >
                                      <span className="font-semibold">
                                        #{idx + 1}: {locationKey}
                                      </span>
                                      <span className="text-xs font-semibold">
                                        {qtyForThisLocation} karton {isRecehLoc && "🔵 Receh"}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitClick}
                    disabled={isSubmitting}
                    className="flex-1 bg-teal-600 text-white py-3 rounded-xl font-semibold hover:bg-teal-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Menyimpan..." : (isEditMode ? "Update NPL" : "Simpan NPL")}
                  </button>
                </div>
              </div>
            </div>

        {/* Today's NPL History Table */}
        <div className="mt-8 bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-6 py-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-2xl">📋</span>
              Transaksi Hari Ini
            </h2>
            <p className="text-teal-100 text-sm mt-1">
              {new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          {todayNplHistory.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-500 font-medium">Belum ada transaksi NPL hari ini</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Waktu</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Pengemudi</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Produk</th>
                      <th className="px-2 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Lokasi</th>
                      <th className="px-2 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Carton</th>
                      <th className="px-2 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {todayNplHistory.map((npl: any) => {
                      const product = npl.products; // Hasil join di page.tsx
                      return (
                        <tr key={npl.id} className="hover:bg-teal-50 transition-colors">
                          <td className="px-3 py-3 text-sm text-gray-900 whitespace-nowrap">
                            {new Date(npl.return_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-900 max-w-[120px] truncate">
                            {npl.driver_name}
                          </td>
                          <td className="px-3 py-3 text-sm">
                            <div className="font-medium text-gray-900 text-sm">{product?.product_code || "UNKNOWN"}</div>
                            <div className="text-gray-500 text-xs truncate max-w-[150px]">{product?.product_name || "Unknown Product"}</div>
                          </td>
                          <td className="px-2 py-3 text-sm text-center font-bold text-green-600">
                            {Array.isArray(npl.locations) ? npl.locations.length : 0}
                          </td>
                          <td className="px-2 py-3 text-sm text-center font-bold text-blue-600">
                            {npl.qty_carton}
                          </td>
                          <td className="px-2 py-3 text-center">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              ✓ Completed
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleEditClick(npl)}
                                className="px-2 py-1 bg-amber-500 text-white text-xs font-semibold rounded hover:bg-amber-600 transition-colors"
                              >
                                Ubah
                              </button>
                              <button
                                onClick={() => handleCancelClick(npl)}
                                className="px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded hover:bg-red-600 transition-colors"
                              >
                                Batal
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                <p className="text-sm text-gray-600 text-center">
                  {todayNplHistory.length} transaksi hari ini
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Confirm Submit Modal */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => handleBackdropClick(e, () => setShowConfirmModal(false))}
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-600 p-6">
              <h3 className="text-xl font-bold text-white text-center">Konfirmasi Submit NPL</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700 text-center mb-4">Yakin ingin menyimpan transaksi NPL ini?</p>
              <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
                <p>
                  <strong>Produk:</strong> {selectedProduct?.product_name}
                </p>
                <p>
                  <strong>Qty:</strong> {totalCartons} karton ({totalPalletsNeeded} lokasi)
                </p>
                <p>
                  <strong>Driver:</strong> {namaPengemudi} ({nomorPolisi})
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300"
                >
                  Batal
                </button>
                <button
                  onClick={confirmSubmit}
                  className="flex-1 bg-teal-600 text-white py-3 rounded-xl font-semibold hover:bg-teal-700"
                >
                  Ya, Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Confirm Modal */}
      {showEditConfirmModal && selectedNplForAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => handleBackdropClick(e, () => setShowEditConfirmModal(false))}
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6">
              <h3 className="text-xl font-bold text-white text-center">Konfirmasi Edit</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700 text-center mb-4">
                Data transaksi akan dimuat ke form dan stock akan dihapus. Lanjutkan?
              </p>
              <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
                <p>
                  <strong>ID:</strong> {selectedNplForAction.transaction_code}
                </p>
                <p>
                  <strong>Produk:</strong> {selectedNplForAction.products?.product_name || "Unknown Product"}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditConfirmModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300"
                >
                  Batal
                </button>
                <button
                  onClick={confirmEdit}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700"
                >
                  Ya, Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batal Confirm Modal */}
      {showBatalConfirmModal && selectedNplForAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => handleBackdropClick(e, () => setShowBatalConfirmModal(false))}
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-6">
              <h3 className="text-xl font-bold text-white text-center">Konfirmasi Pembatalan</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700 text-center mb-4">
                Transaksi akan dibatalkan dan stock akan dihapus. Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
                <p>
                  <strong>ID:</strong> {selectedNplForAction.transaction_code}
                </p>
                <p>
                  <strong>Produk:</strong> {selectedNplForAction.products?.product_name || "Unknown Product"}
                </p>
                <p>
                  <strong>Qty:</strong> {selectedNplForAction.qty_carton} karton
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBatalConfirmModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300"
                >
                  Tidak
                </button>
                <button
                  onClick={confirmBatal}
                  className="flex-1 bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700"
                >
                  Ya, Batalkan
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
                  ? "bg-gradient-to-r from-teal-500 to-cyan-600"
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
    </div>
  );
}
