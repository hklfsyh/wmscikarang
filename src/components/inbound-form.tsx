// File: src/components/inbound-form.tsx (Langkah 14: Finalisasi Multi-Submission)

"use client";

import { useState, useEffect, useMemo } from "react"; 
import { 
  productMasterData, 
  getProductByCode,
  getExpeditionsByWarehouse,
  type Expedition
} from "@/lib/mock/product-master";
import { stockListData, StockItem } from "@/lib/mock/stocklistmock";
import {
  getClusterConfig,
  getBarisCountForLorong,
  getPalletCapacityForCell,
  validateProductLocation,
  getValidLocationsForProduct,
  getInTransitRange,
  isInTransitLocation,
  clusterConfigs,
} from "@/lib/mock/warehouse-config";
import { inboundHistoryData, InboundHistory } from "@/lib/mock/transaction-history";
import { QRScanner, QRData } from "./qr-scanner";
import { CheckCircle, XCircle } from "lucide-react";
import { useToast, ToastContainer } from "./toast";

interface RecommendedLocation {
  clusterChar: string;
  lorong: string;
  baris: string;
  level: string;
  palletsCanFit: number; 
}

interface MultiLocationRecommendation {
  locations: RecommendedLocation[];
  totalPalletsPlaced: number;
  needsMultipleLocations: boolean;
}

type InboundFormState = {
  ekspedisi: string;
  tanggal: string;
  namaPengemudi: string;
  noDN: string;
  nomorPolisi: string;
  productCode: string;
  bbProduk: string;
  kdPlant: string;
  expiredDate: string;
  qtyPalletInput: string; 
  qtyCartonInput: string;
  bbReceh: string[]; 
  clusterChar: string;
  lorong: string;
  baris: string;
  pallet: string;
};

// --- INTERFACE UNTUK OUTPUT FINAL (SUBMISSION BATCH) ---
interface FinalSubmission {
    productCode: string;
    location: string;
    qtyPallet: number; // Selalu 1
    qtyCarton: number; // Qty Karton Aktual per lokasi
    bbPallet: string | string[]; // BB Produk (string) atau BB Receh (string[])
    isReceh: boolean;
}
// --- AKHIR INTERFACE ---

const today = new Date().toISOString().slice(0, 10);

// --- CONSTANTS FOR RECEH LOGIC ---
const RECEH_THRESHOLD = 5; // If remaining cartons <= 5, attach to last full pallet instead of creating new pallet
// --- END CONSTANTS ---

// Interface untuk manual location input (multi-location)
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

const initialState: InboundFormState = {
  ekspedisi: "",
  tanggal: today,
  namaPengemudi: "",
  noDN: "",
  nomorPolisi: "",
  productCode: "",
  bbProduk: "", 
  kdPlant: "",
  expiredDate: "",
  qtyPalletInput: "", 
  qtyCartonInput: "",
  bbReceh: [], 
  clusterChar: "",
  lorong: "",
  baris: "",
  pallet: "",
};

// --- FUNGSI UTILITY: PARSING BB PRODUK ---
const parseBBProduk = (bb: string): { expiredDate: string, kdPlant: string, isValid: boolean } => {
  const expiredDateStr = bb.substring(0, 6); 
  const kdPlantStr = bb.substring(6, 10);    
  
  if (bb.length !== 10) {
    return { expiredDate: "", kdPlant: "", isValid: false };
  }

  const yearPrefix = (new Date().getFullYear() < 2050 && Number(expiredDateStr.substring(0, 2)) > 50) ? '19' : '20';
  const year = `${yearPrefix}${expiredDateStr.substring(0, 2)}`;
  const month = expiredDateStr.substring(2, 4);
  const day = expiredDateStr.substring(4, 6);
  
  const dateObj = new Date(`${year}-${month}-${day}`);
  const validDate = !isNaN(dateObj.getTime()) && dateObj.getMonth() + 1 === Number(month) && Number(day) >= 1 && Number(day) <= 31;

  return {
    expiredDate: validDate ? `${year}-${month}-${day}` : "",
    kdPlant: kdPlantStr,
    isValid: validDate,
  };
};

export function InboundForm() {
  const [currentWarehouseId, setCurrentWarehouseId] = useState<string | null>(null);
  const [warehouseExpeditions, setWarehouseExpeditions] = useState<Expedition[]>([]);
  const { toasts, removeToast } = useToast();
  
  // Modal notification helpers (pengganti toast)
  const showNotification = (title: string, message: string, type: 'success' | 'error' | 'warning') => {
    setNotificationTitle(title);
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotificationModal(true);
  };
  
  const success = (message: string) => {
    showNotification('✅ Berhasil', message, 'success');
  };
  
  const error = (message: string) => {
    showNotification('❌ Error', message, 'error');
  };
  
  const warning = (message: string) => {
    showNotification('⚠️ Peringatan', message, 'warning');
  };
  const [form, setForm] = useState<InboundFormState>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [recommendedLocation, setRecommendedLocation] = useState<RecommendedLocation | null>(null);
  const [multiLocationRec, setMultiLocationRec] = useState<MultiLocationRecommendation | null>(null);
  const [finalSubmissionData, setFinalSubmissionData] = useState<FinalSubmission[] | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [autoRecommend, setAutoRecommend] = useState(true);

  // --- INPUT HISTORY/AUTOCOMPLETE STATE ---
  const [driverHistory, setDriverHistory] = useState<string[]>([]);
  const [dnHistory, setDnHistory] = useState<string[]>([]);
  const [policeNoHistory, setPoliceNoHistory] = useState<string[]>([]);
  const [showDriverSuggestions, setShowDriverSuggestions] = useState(false);
  const [showDnSuggestions, setShowDnSuggestions] = useState(false);
  const [showPoliceNoSuggestions, setShowPoliceNoSuggestions] = useState(false);
  
  // --- HISTORY DETAIL MODAL STATE ---
  const [showHistoryDetailModal, setShowHistoryDetailModal] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<InboundHistory | null>(null);
  
  // --- EDIT & BATAL MODAL STATE ---
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false);
  const [showBatalConfirmModal, setShowBatalConfirmModal] = useState(false);
  const [selectedItemForAction, setSelectedItemForAction] = useState<InboundHistory | null>(null);

  // --- MANUAL MULTI-LOCATION INPUT STATE ---
  const [manualLocations, setManualLocations] = useState<ManualLocationInput[]>([]);
  const [manualRange, setManualRange] = useState<ManualLocationRange>({
    clusterChar: '',
    lorong: '',
    barisStart: '',
    barisEnd: '',
    palletStart: '',
    palletEnd: ''
  });
  const [expandedLocations, setExpandedLocations] = useState<ManualLocationInput[]>([]);
  const [locationAvailability, setLocationAvailability] = useState<LocationAvailability[]>([]);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [occupiedLocations, setOccupiedLocations] = useState<LocationAvailability[]>([]);
  
  // --- NOTIFICATION MODAL STATE (Pengganti Toast) ---
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'success' | 'error' | 'warning'>('success');

  // Load warehouse context and history from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentWarehouseId(user.warehouseId || null);
      }
      
      const savedDrivers = localStorage.getItem('wms_driver_history');
      const savedDNs = localStorage.getItem('wms_dn_history');
      const savedPoliceNos = localStorage.getItem('wms_police_no_history');
      
      if (savedDrivers) setDriverHistory(JSON.parse(savedDrivers));
      if (savedDNs) setDnHistory(JSON.parse(savedDNs));
      if (savedPoliceNos) setPoliceNoHistory(JSON.parse(savedPoliceNos));
    }
  }, []);

  // Load expeditions based on current warehouse
  useEffect(() => {
    if (currentWarehouseId) {
      const warehouseExpeditions = getExpeditionsByWarehouse(currentWarehouseId);
      setWarehouseExpeditions(warehouseExpeditions);
    }
  }, [currentWarehouseId]);

  // Filter products by warehouse
  const filteredProducts = useMemo(() => {
    if (!currentWarehouseId) return productMasterData;
    return productMasterData.filter(p => p.warehouseId === currentWarehouseId);
  }, [currentWarehouseId]);

  // Save to history helper
  const saveToHistory = (key: string, value: string, currentHistory: string[], setHistory: (val: string[]) => void) => {
    if (!value.trim()) return;
    
    const updated = [value, ...currentHistory.filter(v => v !== value)].slice(0, 10); // Keep last 10
    setHistory(updated);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(updated));
    }
  };
  // --- AKHIR INPUT HISTORY ---

  // --- LOGIKA QTY DINAMIS (CALCULATED VALUES) ---
  const selectedProduct = form.productCode ? getProductByCode(form.productCode) : null;
  const qtyPerPalletStd = selectedProduct?.qtyCartonPerPallet || 0; 
  
  const { totalPallets, remainingCartons, totalCartons, shouldAttachReceh } = useMemo(() => {
    const palletInput = Number(form.qtyPalletInput) || 0;
    const cartonInput = Number(form.qtyCartonInput) || 0;
    
    // Total Karton = (Input Pallet Utuh * Std Qty/Pallet) + Input Karton Sisa
    const totalCartons = (palletInput * qtyPerPalletStd) + cartonInput;
    
    if (qtyPerPalletStd === 0) {
      return { totalPallets: 0, remainingCartons: cartonInput, totalCartons: cartonInput, shouldAttachReceh: false };
    }

    const calculatedPallets = Math.floor(totalCartons / qtyPerPalletStd);
    const remaining = totalCartons % qtyPerPalletStd;
    
    // SMART RECEH LOGIC: If remaining ≤ RECEH_THRESHOLD, attach to last pallet
    const shouldAttach = remaining > 0 && remaining <= RECEH_THRESHOLD && calculatedPallets > 0;
    
    return {
      totalPallets: calculatedPallets,
      remainingCartons: remaining,
      totalCartons: totalCartons,
      shouldAttachReceh: shouldAttach,
    };
  }, [form.qtyPalletInput, form.qtyCartonInput, qtyPerPalletStd]);
  
  const isReceh = remainingCartons > 0;
  // Total Lokasi Dibutuhkan: 
  // - If shouldAttachReceh (≤5 cartons), keep same pallet count (attach to last pallet)
  // - Otherwise, add 1 extra pallet for receh
  const totalPalletsNeeded = shouldAttachReceh ? totalPallets : (totalPallets + (isReceh ? 1 : 0)); 
  
  // Initialize manual locations array when totalPalletsNeeded changes and auto recommend is OFF
  useEffect(() => {
    if (!autoRecommend && totalPalletsNeeded > 0) {
      const currentLength = manualLocations.length;
      
      if (currentLength !== totalPalletsNeeded) {
        const newLocations: ManualLocationInput[] = [];
        
        for (let i = 0; i < totalPalletsNeeded; i++) {
          if (i < currentLength) {
            // Keep existing values
            newLocations.push(manualLocations[i]);
          } else {
            // Add new empty location
            newLocations.push({ clusterChar: "", lorong: "", baris: "", pallet: "" });
          }
        }
        
        setManualLocations(newLocations);
      }
    }
  }, [totalPalletsNeeded, autoRecommend]);
  // --- AKHIR LOGIKA QTY DINAMIS ---

  // --- DYNAMIC OPTIONS & LOCATION RECOMMENDATION (USING CLUSTER CONFIG & PRODUCT HOME) ---
  const _autoCluster = selectedProduct?.defaultCluster || ""; 
  
  // Get valid locations for current product
  const productValidLocations = form.productCode ? getValidLocationsForProduct(form.productCode) : null;
  
  // Cluster options - ambil dari clusterConfigs yang aktif
  const clusterOptions = useMemo(() => {
    return clusterConfigs.filter(c => c.isActive).map(c => c.clusterChar);
  }, []);
  
  // Generate dynamic lorong options
  const lorongOptions = useMemo(() => {
    if (!form.clusterChar) {
      const config = getClusterConfig(form.clusterChar || _autoCluster);
      if (!config) return Array.from({ length: 11 }, (_, i) => `L${i + 1}`);
      return Array.from({ length: config.defaultLorongCount }, (_, i) => `L${i + 1}`);
    }
    const config = getClusterConfig(form.clusterChar);
    if (!config) return [];
    
    // MANUAL MODE: User bebas pilih semua lorong tanpa batasan product home
    if (!autoRecommend) {
      return Array.from({ length: config.defaultLorongCount }, (_, i) => `L${i + 1}`);
    }
    
    // AUTO MODE: If product has home assignment, limit to allowed lorong range
    if (productValidLocations && productValidLocations.clusterChar === form.clusterChar) {
      const [start, end] = productValidLocations.lorongRange;
      return Array.from({ length: end - start + 1 }, (_, i) => `L${start + i}`);
    }
    
    return Array.from({ length: config.defaultLorongCount }, (_, i) => `L${i + 1}`);
  }, [form.clusterChar, form.productCode, productValidLocations, _autoCluster, autoRecommend]);
  
  // Generate dynamic baris options
  const barisOptions = useMemo(() => {
    if (!form.clusterChar || !form.lorong) return Array.from({ length: 9 }, (_, i) => `B${i + 1}`);
    const lorongNum = parseInt(form.lorong.replace("L", ""));
    const barisCount = getBarisCountForLorong(form.clusterChar, lorongNum);
    
    // MANUAL MODE: User bebas pilih semua baris tanpa batasan product home
    if (!autoRecommend) {
      return Array.from({ length: barisCount }, (_, i) => `B${i + 1}`);
    }
    
    // AUTO MODE: If product has home assignment, limit to allowed baris range
    if (productValidLocations && productValidLocations.clusterChar === form.clusterChar) {
      const [start, end] = productValidLocations.barisRange;
      const maxBaris = Math.min(end, barisCount);
      return Array.from({ length: maxBaris - start + 1 }, (_, i) => `B${start + i}`);
    }
    
    return Array.from({ length: barisCount }, (_, i) => `B${i + 1}`);
  }, [form.clusterChar, form.lorong, form.productCode, productValidLocations, autoRecommend]);
  
  // Generate dynamic pallet options
  const palletOptions = useMemo(() => {
    if (!form.clusterChar || !form.lorong || !form.baris) return Array.from({ length: 3 }, (_, i) => `P${i + 1}`);
    const lorongNum = parseInt(form.lorong.replace("L", ""));
    const barisNum = parseInt(form.baris.replace("B", ""));
    const palletCapacity = getPalletCapacityForCell(form.clusterChar, lorongNum, barisNum);
    
    // MANUAL MODE: User bebas pilih semua pallet level tanpa batasan product max pallet
    if (!autoRecommend) {
      return Array.from({ length: palletCapacity }, (_, i) => `P${i + 1}`);
    }
    
    // AUTO MODE: If product has max pallet limit, use minimum
    const maxPallet = productValidLocations 
      ? Math.min(palletCapacity, productValidLocations.maxPalletPerLocation)
      : palletCapacity;
    
    return Array.from({ length: maxPallet }, (_, i) => `P${i + 1}`);
  }, [form.clusterChar, form.lorong, form.baris, form.productCode, productValidLocations, autoRecommend]); 

  const findMultipleRecommendedLocations = (
    clusterChar: string,
    palletsNeeded: number,
    warehouseId: string | null
  ): MultiLocationRecommendation => {
    const locations: RecommendedLocation[] = [];
    let remainingPallets = palletsNeeded;

    // Get cluster config untuk dynamic lorong/baris count
    const clusterConfig = getClusterConfig(clusterChar);
    if (!clusterConfig) {
      return { locations: [], totalPalletsPlaced: 0, needsMultipleLocations: false };
    }

    // Get valid locations for product (if exists)
    const validLocs = form.productCode ? getValidLocationsForProduct(form.productCode) : null;
    
    // PHASE 1: Try to fill primary product home locations
    const lorongStart = validLocs && validLocs.clusterChar === clusterChar ? validLocs.lorongRange[0] : 1;
    const lorongEnd = validLocs && validLocs.clusterChar === clusterChar 
      ? validLocs.lorongRange[1] 
      : clusterConfig.defaultLorongCount;
    
    for (let lorongNum = lorongStart; lorongNum <= lorongEnd; lorongNum++) {
      if (remainingPallets === 0) break;
      
      // Skip In Transit area in primary phase
      if (isInTransitLocation(clusterChar, lorongNum)) continue;
      
      // Get baris count for this lorong (dynamic)
      const maxBaris = getBarisCountForLorong(clusterChar, lorongNum);
      
      // Determine baris range
      const barisStart = validLocs && validLocs.clusterChar === clusterChar ? validLocs.barisRange[0] : 1;
      const barisEnd = validLocs && validLocs.clusterChar === clusterChar 
        ? Math.min(validLocs.barisRange[1], maxBaris)
        : maxBaris;
      
      for (let barisNum = barisStart; barisNum <= barisEnd; barisNum++) {
        if (remainingPallets === 0) break;
        
        // Get pallet capacity for this cell (dynamic)
        const maxPallet = getPalletCapacityForCell(clusterChar, lorongNum, barisNum);
        const productMaxPallet = validLocs ? validLocs.maxPalletPerLocation : 999;
        const effectiveMaxPallet = Math.min(maxPallet, productMaxPallet);
        
        // Find empty slots in this baris
        const emptySlotsInBaris: RecommendedLocation[] = [];
        for (let palletNum = 1; palletNum <= effectiveMaxPallet; palletNum++) {
          const lorong = `L${lorongNum}`;
          const baris = `B${barisNum}`;
          const level = `P${palletNum}`;
          
          // Validate product can be placed here
          if (form.productCode) {
            const validation = validateProductLocation(form.productCode, clusterChar, lorongNum, barisNum);
            if (!validation.isValid) continue;
          }
          
          // Check if location is empty (filter by current warehouse)
          const locationExists = stockListData.some(
            (item: StockItem) =>
              item.warehouseId === warehouseId && // Filter by current warehouse
              item.cluster === clusterChar &&
              item.lorong === parseInt(lorong.replace('L', '')) &&
              item.baris === parseInt(baris.replace('B', '')) &&
              item.level === parseInt(level.replace('P', ''))
          );
          
          if (!locationExists) {
            emptySlotsInBaris.push({
              clusterChar,
              lorong,
              baris,
              level,
              palletsCanFit: 1,
            });
          }
        }
        
        // Allocate empty slots
        for (const slot of emptySlotsInBaris) {
          if (remainingPallets === 0) break;
          locations.push(slot);
          remainingPallets--;
        }
      }
    }

    // PHASE 2: If still have remaining pallets, use In Transit area (overflow)
    // CROSS-CLUSTER IN TRANSIT: Search Cluster C In Transit for ALL products (global overflow buffer)
    if (remainingPallets > 0) {
      // First, try In Transit in the same cluster (if exists)
      const inTransitRange = getInTransitRange(clusterChar);
      
      if (inTransitRange) {
        const [transitStart, transitEnd] = inTransitRange;
        
        for (let lorongNum = transitStart; lorongNum <= transitEnd; lorongNum++) {
          if (remainingPallets === 0) break;
          
          const maxBaris = getBarisCountForLorong(clusterChar, lorongNum);
          
          for (let barisNum = 1; barisNum <= maxBaris; barisNum++) {
            if (remainingPallets === 0) break;
            
            const maxPallet = getPalletCapacityForCell(clusterChar, lorongNum, barisNum);
            
            for (let palletNum = 1; palletNum <= maxPallet; palletNum++) {
              if (remainingPallets === 0) break;
              
              const lorong = `L${lorongNum}`;
              const baris = `B${barisNum}`;
              const level = `P${palletNum}`;
              
              // Check if location is empty
              const locationExists = stockListData.some(
                (item: StockItem) =>
                  item.warehouseId === warehouseId && // Filter by current warehouse
                  item.cluster === clusterChar &&
                  item.lorong === parseInt(lorong.replace('L', '')) &&
                  item.baris === parseInt(baris.replace('B', '')) &&
                  item.level === parseInt(level.replace('P', ''))
              );
              
              if (!locationExists) {
                locations.push({
                  clusterChar: clusterChar,
                  lorong,
                  baris,
                  level,
                  palletsCanFit: 1,
                });
                remainingPallets--;
              }
            }
          }
        }
      }
      
      // PHASE 2B: If still have remaining pallets AND home cluster is NOT C, search Cluster C In Transit (cross-cluster overflow)
      if (remainingPallets > 0 && clusterChar !== "C") {
        const clusterCInTransitRange = getInTransitRange("C");
        
        if (clusterCInTransitRange) {
          const [transitStart, transitEnd] = clusterCInTransitRange;
          
          for (let lorongNum = transitStart; lorongNum <= transitEnd; lorongNum++) {
            if (remainingPallets === 0) break;
            
            const maxBaris = getBarisCountForLorong("C", lorongNum);
            
            for (let barisNum = 1; barisNum <= maxBaris; barisNum++) {
              if (remainingPallets === 0) break;
              
              const maxPallet = getPalletCapacityForCell("C", lorongNum, barisNum);
              
              for (let palletNum = 1; palletNum <= maxPallet; palletNum++) {
                if (remainingPallets === 0) break;
                
                const lorong = `L${lorongNum}`;
                const baris = `B${barisNum}`;
                const level = `P${palletNum}`;
                
                // Check if location is empty in Cluster C In Transit
                const locationExists = stockListData.some(
                  (item: StockItem) =>
                    item.warehouseId === warehouseId && // Filter by current warehouse
                    item.cluster === "C" &&
                    item.lorong === parseInt(lorong.replace('L', '')) &&
                    item.baris === parseInt(baris.replace('B', '')) &&
                    item.level === parseInt(level.replace('P', ''))
                );
                
                if (!locationExists) {
                  locations.push({
                    clusterChar: "C", // Cross-cluster overflow to Cluster C
                    lorong,
                    baris,
                    level,
                    palletsCanFit: 1,
                  });
                  remainingPallets--;
                }
              }
            }
          }
        }
      }
    }

    return {
      locations,
      totalPalletsPlaced: palletsNeeded - remainingPallets,
      needsMultipleLocations: palletsNeeded > 1 && locations.length > 1,
    };
  };

  // Helper function for finding single location (kept for potential future use)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _findRecommendedLocation = (clusterChar: string): RecommendedLocation | null => {
    const multiRec = findMultipleRecommendedLocations(clusterChar, 1, currentWarehouseId);
    if (multiRec.locations.length > 0) {
      return multiRec.locations[0];
    }
    return null;
  };
  // --- AKHIR LOGIKA REKOMENDASI LOKASI ---


  // --- EFFECT DAN HANDLER ---
  useEffect(() => {
    if (form.bbProduk.length === 10) {
      const { expiredDate, kdPlant, isValid } = parseBBProduk(form.bbProduk);
      if (isValid) {
        setForm(prev => ({ ...prev, expiredDate: expiredDate, kdPlant: kdPlant }));
        setErrors(prev => ({ ...prev, bbProduk: "" }));
      } else {
         setForm(prev => ({ ...prev, expiredDate: "", kdPlant: "" }));
         setErrors(prev => ({ ...prev, bbProduk: "Format Expired Date (YYMMDD) di BB Produk tidak valid." }));
      }
    } else {
      setForm(prev => ({ ...prev, expiredDate: "", kdPlant: "" }));
      if (form.bbProduk.length > 0 && form.bbProduk.length < 10) {
        setErrors(prev => ({ ...prev, bbProduk: "BB Produk harus 10 karakter (YYMMDDXXXX)." }));
      } else {
        setErrors(prev => ({ ...prev, bbProduk: "" }));
      }
    }
  }, [form.bbProduk]);
  
  const handleRecommend = () => {
    if (!form.productCode) { 
      error("Mohon pilih Produk terlebih dahulu."); 
      return; 
    }
    if (totalPalletsNeeded === 0) { 
      error("Total Pallet yang dibutuhkan adalah nol."); 
      return; 
    }

    const cluster = selectedProduct?.defaultCluster || "";
    if (!cluster) { 
      error("Produk ini tidak memiliki Cluster Default."); 
      return; 
    }
    
    const multiRec = findMultipleRecommendedLocations(cluster, totalPalletsNeeded, currentWarehouseId);
    
    if (multiRec.locations.length < totalPalletsNeeded) {
        error(`Gudang penuh! Hanya ditemukan ${multiRec.locations.length} dari ${totalPalletsNeeded} lokasi yang dibutuhkan.`);
        setMultiLocationRec(null);
        setRecommendedLocation(null);
        return;
    }
    
    setMultiLocationRec(multiRec);
    setRecommendedLocation(multiRec.locations.length === 1 ? multiRec.locations[0] : null);

    const firstLoc = multiRec.locations[0];
    setForm(prev => ({
        ...prev,
        clusterChar: firstLoc.clusterChar,
        lorong: firstLoc.lorong,
        baris: firstLoc.baris,
        pallet: firstLoc.level,
    }));
    
    // Check if any location is in In Transit area
    const hasInTransit = multiRec.locations.some(loc => 
      isInTransitLocation(loc.clusterChar, parseInt(loc.lorong.replace("L", "")))
    );
    
    // Check if cross-cluster In Transit (overflow from other cluster to Cluster C)
    const hasCrossClusterInTransit = multiRec.locations.some(loc => 
      loc.clusterChar !== cluster && isInTransitLocation(loc.clusterChar, parseInt(loc.lorong.replace("L", "")))
    );
    
    // Show success toast with In Transit info if applicable
    if (multiRec.locations.length === 1) {
      const isTransit = isInTransitLocation(firstLoc.clusterChar, parseInt(firstLoc.lorong.replace("L", "")));
      const isCrossCluster = firstLoc.clusterChar !== cluster;
      const transitMsg = isTransit ? (isCrossCluster ? " (In Transit Cluster C - Cross-Cluster Overflow)" : " (In Transit - Overflow)") : "";
      success(`Rekomendasi ditemukan!\nLokasi: ${firstLoc.clusterChar}-${firstLoc.lorong}-${firstLoc.baris}-${firstLoc.level}${transitMsg}`);
    } else {
      let transitInfo = "";
      if (hasCrossClusterInTransit) {
        const inTransitCount = multiRec.locations.filter(loc => 
          loc.clusterChar !== cluster && isInTransitLocation(loc.clusterChar, parseInt(loc.lorong.replace("L", "")))
        ).length;
        transitInfo = `\n⚠️ ${inTransitCount} pallet ditempatkan di Cluster C In Transit (cross-cluster overflow)`;
      } else if (hasInTransit) {
        transitInfo = " (Termasuk area In Transit untuk overflow)";
      }
      success(`${multiRec.locations.length} lokasi berhasil ditemukan untuk ${totalPalletsNeeded} pallet!${transitInfo}`);
    }
  };

  const handleChange = (field: keyof InboundFormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: "" }));
    setMultiLocationRec(null); 
    setRecommendedLocation(null);

    if (field === "productCode" && value) {
      const selectedProd = getProductByCode(value);
      const cluster = selectedProd?.defaultCluster || ""; 
      setForm(prev => ({ ...prev, cluster }));
    }
  };

  // Function to expand range into individual locations
  const expandRangeToLocations = () => {
    const { clusterChar, lorong, barisStart, barisEnd, palletStart, palletEnd } = manualRange;
    
    if (!clusterChar || !lorong || !barisStart || !barisEnd || !palletStart || !palletEnd) {
      error('Semua field range harus diisi!');
      return;
    }

    // Extract numbers from baris (e.g., "B1" -> 1)
    const barisStartNum = parseInt(barisStart.replace(/[^0-9]/g, ''));
    const barisEndNum = parseInt(barisEnd.replace(/[^0-9]/g, ''));
    const palletStartNum = parseInt(palletStart.replace(/[^0-9]/g, ''));
    const palletEndNum = parseInt(palletEnd.replace(/[^0-9]/g, ''));

    if (isNaN(barisStartNum) || isNaN(barisEndNum) || isNaN(palletStartNum) || isNaN(palletEndNum)) {
      error('Format baris/pallet tidak valid! Contoh: B1, P1');
      return;
    }

    if (barisStartNum > barisEndNum || palletStartNum > palletEndNum) {
      error('Range tidak valid! Start harus ≤ End');
      return;
    }

    // Generate all locations from range
    const allLocations: ManualLocationInput[] = [];
    for (let b = barisStartNum; b <= barisEndNum; b++) {
      for (let p = palletStartNum; p <= palletEndNum; p++) {
        allLocations.push({
          clusterChar,
          lorong,
          baris: `B${b}`,
          pallet: `P${p}`
        });
      }
    }

    // SMART FILTER: Filter hanya lokasi yang KOSONG
    const availableLocations = allLocations.filter(loc => {
      const existingStock = stockListData.find(
        s => s.warehouseId === currentWarehouseId &&
             s.cluster === loc.clusterChar && 
             s.lorong === parseInt(loc.lorong.replace('L', '')) && 
             s.baris === parseInt(loc.baris.replace('B', '')) && 
             s.level === parseInt(loc.pallet.replace('P', ''))
      );
      return !existingStock; // Hanya ambil yang kosong
    });

    // Count occupied locations for info
    const occupiedCount = allLocations.length - availableLocations.length;

    if (availableLocations.length < totalPalletsNeeded) {
      error(`Range menghasilkan ${allLocations.length} lokasi (${occupiedCount} terisi, ${availableLocations.length} kosong).\nButuh ${totalPalletsNeeded} lokasi kosong, hanya tersedia ${availableLocations.length}!`);
      return;
    }

    // SMART SELECTION: Ambil lokasi kosong sesuai kebutuhan
    const locationsToUse = availableLocations.slice(0, totalPalletsNeeded);
    
    if (occupiedCount > 0) {
      success(`✅ Range diproses!\n\nTotal: ${allLocations.length} lokasi\n- Terisi: ${occupiedCount} lokasi (di-skip)\n- Kosong: ${availableLocations.length} lokasi\n- Digunakan: ${locationsToUse.length} lokasi\n\nLokasi: ${locationsToUse[0].clusterChar}-${locationsToUse[0].lorong}-${locationsToUse[0].baris}-${locationsToUse[0].pallet} s/d ${locationsToUse[locationsToUse.length-1].clusterChar}-${locationsToUse[locationsToUse.length-1].lorong}-${locationsToUse[locationsToUse.length-1].baris}-${locationsToUse[locationsToUse.length-1].pallet}`);
    } else {
      success(`✅ ${locationsToUse.length} lokasi kosong siap digunakan!\n\nLokasi: ${locationsToUse[0].clusterChar}-${locationsToUse[0].lorong}-${locationsToUse[0].baris}-${locationsToUse[0].pallet} s/d ${locationsToUse[locationsToUse.length-1].clusterChar}-${locationsToUse[locationsToUse.length-1].lorong}-${locationsToUse[locationsToUse.length-1].baris}-${locationsToUse[locationsToUse.length-1].pallet}`);
    }

    // Set manual locations directly (no need for availability modal)
    setManualLocations(locationsToUse);
    setExpandedLocations(locationsToUse);
    setLocationAvailability([]);
    setOccupiedLocations([]);
  };

  // Check if locations are available (legacy function, now simplified)
  const checkLocationsAvailability = (locations: ManualLocationInput[]) => {
    // This function is now mainly for backward compatibility
    // The filtering is done in expandRangeToLocations
    setManualLocations(locations);
    setExpandedLocations(locations);
    success(`${locations.length} lokasi kosong siap digunakan!`);
  };

  // Confirm override occupied locations
  const confirmOverrideLocations = () => {
    setManualLocations(expandedLocations);
    setShowAvailabilityModal(false);
    success(`⚠️ ${expandedLocations.length} lokasi dipilih (termasuk ${occupiedLocations.length} yang sudah terisi)`);
  };

  // Reset manual range
  const resetManualRange = () => {
    setManualRange({
      clusterChar: '',
      lorong: '',
      barisStart: '',
      barisEnd: '',
      palletStart: '',
      palletEnd: ''
    });
    setExpandedLocations([]);
    setLocationAvailability([]);
    setManualLocations([]);
  };

  const validateTanggal = (tanggal: string): boolean => {
    const today = new Date().toISOString().slice(0, 10);
    return tanggal === today;
  };

  const handleQRScanSuccess = (data: QRData) => {
    // QR Format Baru: EKSPEDISI|PRODUK_CODE|QTY_PALLET|QTY_CARTON|BB_PRODUK
    // Contoh: HGS|AQ-1500ML|2|50|2509150067
    
    const selectedProd = getProductByCode(data.produkCode);
    
    if (!selectedProd) {
      error(`Produk dengan kode "${data.produkCode}" tidak ditemukan di database.`);
      return;
    }

    // Parse BB Produk untuk mendapatkan expired date dan kd plant
    const { expiredDate: parsedExpDate, kdPlant: parsedKdPlant, isValid } = parseBBProduk(data.bbProduk);
    
    if (!isValid) {
      error(`BB Produk "${data.bbProduk}" tidak valid. Format harus YYMMDDXXXX dengan tanggal valid.`);
      return;
    }

    // Set form dengan data dari QR
    const newForm: InboundFormState = {
        ekspedisi: data.ekspedisi, 
        tanggal: today,
        namaPengemudi: form.namaPengemudi,
        noDN: form.noDN,
        nomorPolisi: form.nomorPolisi,
        productCode: data.produkCode, 
        bbProduk: data.bbProduk, 
        kdPlant: parsedKdPlant, 
        expiredDate: parsedExpDate, 
        qtyPalletInput: data.qtyPallet, 
        qtyCartonInput: data.qtyCarton, 
        bbReceh: [], 
        clusterChar: selectedProd.defaultCluster || "", 
        lorong: "", 
        baris: "", 
        pallet: "",
    };

    setForm(newForm);
    setMultiLocationRec(null);
    setRecommendedLocation(null);
    setErrors({});
    
    // Show success notification
    success(`QR Scan Berhasil!\n\nData telah diisi:\n- Ekspedisi: ${data.ekspedisi}\n- Produk: ${selectedProd.productName}\n- Qty: ${data.qtyPallet} Pallet + ${data.qtyCarton} Karton\n- BB: ${data.bbProduk}`);
  };

  // Confirm submit after validation
  const confirmSubmit = () => {
    // Save input history to localStorage
    saveToHistory('wms_driver_history', form.namaPengemudi, driverHistory, setDriverHistory);
    saveToHistory('wms_dn_history', form.noDN, dnHistory, setDnHistory);
    saveToHistory('wms_police_no_history', form.nomorPolisi, policeNoHistory, setPoliceNoHistory);

    // Close confirmation modal
    setShowConfirmModal(false);
    
    // Show success modal
    setShowSuccess(true);
    
    // Reset only location-related fields, keep ALL input data for next submission
    setTimeout(() => {
      setShowSuccess(false);
      // Keep: ekspedisi, tanggal, namaPengemudi, noDN, nomorPolisi, productCode, bbProduk, qty
      // Reset: location only (cluster, lorong, baris, pallet) and recommendations
      setForm(prev => ({
        ...prev,
        clusterChar: prev.productCode ? getProductByCode(prev.productCode)?.defaultCluster || "" : "",
        lorong: "",
        baris: "",
        pallet: "",
      }));
      setMultiLocationRec(null);
      setRecommendedLocation(null);
      setFinalSubmissionData(null);
    }, 2000);
  };

  // --- FILTER TRANSAKSI HARI INI ---
  const todayTransactions = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return inboundHistoryData.filter(item => item.arrivalTime.startsWith(todayStr));
  }, []);

  // --- HANDLE EDIT TRANSAKSI ---
  const handleEditClick = (item: InboundHistory) => {
    setSelectedItemForAction(item);
    setShowEditConfirmModal(true);
  };

  const confirmEdit = () => {
    if (!selectedItemForAction) return;

    // 1. Access locations array directly (new structure)
    const locations = selectedItemForAction.locations;

    // 2. Hapus stock dari lokasi-lokasi tersebut (simulasi pembatalan inbound)
    locations.forEach(loc => {
      const stockIndex = stockListData.findIndex(
        s => s.cluster === loc.cluster &&
             s.lorong === loc.lorong &&
             s.baris === loc.baris &&
             s.level === loc.level &&
             s.productId === selectedItemForAction.productId
      );
      if (stockIndex !== -1) {
        stockListData.splice(stockIndex, 1);
      }
    });

    // 3. Hapus dari history
    const historyIndex = inboundHistoryData.findIndex(h => h.id === selectedItemForAction.id);
    if (historyIndex !== -1) {
      inboundHistoryData.splice(historyIndex, 1);
    }

    // 4. Load data ke form untuk di-edit
    const selectedProd = productMasterData.find(p => p.id === selectedItemForAction.productId);
    const qtyPerPallet = selectedProd?.qtyCartonPerPallet || 1;
    const totalCarton = selectedItemForAction.qtyCarton;
    const fullPallets = Math.floor(totalCarton / qtyPerPallet);
    const remainingCartons = totalCarton % qtyPerPallet;

    setForm({
      ekspedisi: selectedItemForAction.expeditionId || '',
      tanggal: selectedItemForAction.arrivalTime.slice(0, 10),
      namaPengemudi: selectedItemForAction.driverName,
      noDN: selectedItemForAction.dnNumber,
      nomorPolisi: selectedItemForAction.vehicleNumber,
      productCode: selectedProd?.productCode || '',
      bbProduk: selectedItemForAction.bbProduk,
      kdPlant: selectedItemForAction.bbProduk.substring(6, 10),
      expiredDate: selectedItemForAction.expiredDate,
      qtyPalletInput: String(fullPallets),
      qtyCartonInput: String(remainingCartons),
      bbReceh: [],
      clusterChar: locations[0]?.cluster || "",
      lorong: `L${locations[0]?.lorong || ''}`,
      baris: `B${locations[0]?.baris || ''}`,
      pallet: `P${locations[0]?.level || ''}`,
    });

    // 5. Reset state
    setShowEditConfirmModal(false);
    setSelectedItemForAction(null);
    setMultiLocationRec(null);
    setRecommendedLocation(null);

    success(`Data transaksi ${selectedItemForAction.transactionCode} telah dimuat ke form. Silakan edit dan submit ulang.`);
  };

  // --- HANDLE BATAL TRANSAKSI ---
  const handleBatalClick = (item: InboundHistory) => {
    setSelectedItemForAction(item);
    setShowBatalConfirmModal(true);
  };

  const confirmBatal = () => {
    if (!selectedItemForAction) return;

    // 1. Access locations array directly (new structure)
    const locations = selectedItemForAction.locations;

    // 2. Hapus stock dari lokasi-lokasi tersebut
    locations.forEach(loc => {
      const stockIndex = stockListData.findIndex(
        s => s.cluster === loc.cluster &&
             s.lorong === loc.lorong &&
             s.baris === loc.baris &&
             s.level === loc.level &&
             s.productId === selectedItemForAction.productId
      );
      if (stockIndex !== -1) {
        stockListData.splice(stockIndex, 1);
      }
    });

    // 3. Hapus dari history
    const historyIndex = inboundHistoryData.findIndex(h => h.id === selectedItemForAction.id);
    if (historyIndex !== -1) {
      inboundHistoryData.splice(historyIndex, 1);
    }

    // 4. Reset state
    setShowBatalConfirmModal(false);
    setSelectedItemForAction(null);

    success(`Transaksi ${selectedItemForAction.transactionCode} telah dibatalkan. Stock telah dikembalikan.`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    const errorList: string[] = [];
    
    if (!form.ekspedisi) { newErrors.ekspedisi = "Ekspedisi harus diisi"; errorList.push("Ekspedisi harus diisi"); }
    if (!validateTanggal(form.tanggal)) { newErrors.tanggal = "Tanggal harus hari ini"; errorList.push("Tanggal harus hari ini"); }
    if (!form.namaPengemudi.trim()) { newErrors.namaPengemudi = "Nama Pengemudi harus diisi"; errorList.push("Nama Pengemudi harus diisi"); }
    if (!form.noDN.trim()) { newErrors.noDN = "No DN/Surat Jalan harus diisi"; errorList.push("No DN/Surat Jalan harus diisi"); }
    if (!form.nomorPolisi.trim()) { newErrors.nomorPolisi = "Nomor Polisi harus diisi"; errorList.push("Nomor Polisi harus diisi"); }
    if (!form.productCode) { newErrors.productCode = "Produk harus dipilih"; errorList.push("Produk harus dipilih"); }

    if (!form.bbProduk || form.bbProduk.length !== 10 || errors.bbProduk) {
      newErrors.bbProduk = errors.bbProduk || "BB Produk harus 10 karakter (YYMMDDXXXX) dan format tanggal valid.";
      errorList.push(newErrors.bbProduk);
    }
    
    // Validasi Qty: Salah satu harus terisi
    if (totalCartons === 0) {
        newErrors.qtyPalletInput = "Total Qty (Pallet/Karton) tidak boleh nol.";
        errorList.push("Qty (Pallet/Karton) harus diisi.");
    }
    
    if (!form.clusterChar) { newErrors.clusterChar = "Cluster harus diisi"; errorList.push("Cluster harus diisi"); }
    
    // --- VALIDASI LOKASI FINAL SEBELUM SUBMISSION ---
    let locationsToSubmit: RecommendedLocation[] = [];
    
    // Case 1: Multi-pallet dengan auto recommend ON
    if (totalPalletsNeeded > 1 && autoRecommend) {
        if (!multiLocationRec || multiLocationRec.locations.length < totalPalletsNeeded) {
            newErrors.pallet = `Diperlukan ${totalPalletsNeeded} lokasi. Mohon klik tombol Rekomendasi Lokasi.`;
            errorList.push(newErrors.pallet);
        } else {
            // Validasi ketersediaan lokasi yang direkomendasikan
            const occupiedRecommendedLocs: string[] = [];
            multiLocationRec.locations.forEach(loc => {
              const existingStock = stockListData.find(
                s => s.cluster === loc.clusterChar && 
                     s.lorong === parseInt(loc.lorong.replace('L', '')) && 
                     s.baris === parseInt(loc.baris.replace('B', '')) && 
                     s.level === parseInt(loc.level.replace('P', ''))
              );
              if (existingStock) {
                const product = productMasterData.find(p => p.id === existingStock.productId);
                occupiedRecommendedLocs.push(`${loc.clusterChar}-${loc.lorong}-${loc.baris}-${loc.level} (${product?.productName || 'Unknown'})`);
              }
            });
            
            if (occupiedRecommendedLocs.length > 0) {
              newErrors.pallet = `Lokasi rekomendasi sudah terisi`;
              errorList.push(`Lokasi rekomendasi sudah terisi: ${occupiedRecommendedLocs.join(', ')}. Silakan klik 'Rekomendasi Lokasi' lagi untuk mendapat lokasi baru.`);
            } else {
              locationsToSubmit = multiLocationRec.locations;
            }
        }
    } 
    // Case 2: Multi-pallet dengan auto recommend OFF (manual input)
    else if (totalPalletsNeeded > 1 && !autoRecommend) {
        // Validasi semua manual locations harus diisi
        const locationSet = new Set<string>();
        let hasEmptyLocation = false;
        
        manualLocations.forEach((loc, index) => {
            if (!loc.clusterChar || !loc.lorong || !loc.baris || !loc.pallet) {
                hasEmptyLocation = true;
                newErrors[`manualLoc${index}`] = `Lokasi ${index + 1} belum lengkap`;
                errorList.push(`Lokasi ${index + 1} belum lengkap`);
                return;
            }
            
            const locationKey = `${loc.clusterChar}-${loc.lorong}-${loc.baris}-${loc.pallet}`;
            
            // Check duplikat
            if (locationSet.has(locationKey)) {
                newErrors[`manualLoc${index}`] = `Lokasi ${index + 1} duplikat`;
                errorList.push(`Lokasi ${index + 1} duplikat dengan lokasi sebelumnya`);
                return;
            }
            
            // Check apakah lokasi sudah terisi di stockList
            const locationIsOccupied = stockListData.some(
              (item) =>
                item.warehouseId === currentWarehouseId && // Filter by current warehouse
                item.cluster === loc.clusterChar &&
                item.lorong === parseInt(loc.lorong.replace('L', '')) &&
                item.baris === parseInt(loc.baris.replace('B', '')) &&
                item.level === parseInt(loc.pallet.replace('P', ''))
            );
            
            if (locationIsOccupied) {
                newErrors[`manualLoc${index}`] = `Lokasi ${locationKey} sudah terisi`;
                errorList.push(`Lokasi ${index + 1} (${locationKey}) sudah terisi`);
                return;
            }
            
            locationSet.add(locationKey);
            locationsToSubmit.push({
                clusterChar: loc.clusterChar,
                lorong: loc.lorong,
                baris: loc.baris,
                level: loc.pallet,
                palletsCanFit: 1,
            });
        });
        
        if (hasEmptyLocation || locationsToSubmit.length !== totalPalletsNeeded) {
            if (!hasEmptyLocation && locationsToSubmit.length === 0) {
                newErrors.pallet = `Mohon isi semua ${totalPalletsNeeded} lokasi penyimpanan`;
                errorList.push(`Mohon isi semua ${totalPalletsNeeded} lokasi penyimpanan`);
            }
        }
    }
    // Case 3: Single pallet (auto recommend ON atau OFF)
    else if (totalPalletsNeeded === 1) {
        const currentLoc = { clusterChar: form.clusterChar, lorong: form.lorong, baris: form.baris, level: form.pallet, palletsCanFit: 1 };
        
        if (!form.lorong || !form.baris || !form.pallet) {
             newErrors.lorong = "Lokasi (Lorong, Baris, Pallet) harus diisi.";
             errorList.push(newErrors.lorong);
        } else {
            const locationIsOccupied = stockListData.some(
              (item) =>
                item.warehouseId === currentWarehouseId && // Filter by current warehouse
                item.cluster === currentLoc.clusterChar &&
                item.lorong === parseInt(currentLoc.lorong.replace('L', '')) &&
                item.baris === parseInt(currentLoc.baris.replace('B', '')) &&
                item.level === parseInt(currentLoc.level.replace('P', ''))
            );
            if (locationIsOccupied) {
              newErrors.pallet = `Lokasi ${form.clusterChar}-${form.lorong}-${form.baris}-${form.pallet} sudah terisi.`;
              errorList.push(newErrors.pallet);
            } else {
                locationsToSubmit.push(currentLoc);
            }
        }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setErrorMessages(errorList);
      setShowErrorModal(true);
      return;
    }
    
    // --- FINAL LOGIC: MEMECAH DATA UNTUK SUBMISSION ---
    const finalSubmissions: FinalSubmission[] = [];
    const standardCartons = qtyPerPalletStd;
    
    locationsToSubmit.forEach((loc, index) => {
        const isLastPallet = index === locationsToSubmit.length - 1;
        
        // SMART RECEH LOGIC:
        // If shouldAttachReceh (≤5 cartons) AND this is the last pallet, attach receh to this pallet
        let qtyToRecord = standardCartons;
        let bbToRecord: string | string[] = form.bbProduk;
        let isRecehPallet = false;

        if (isLastPallet && isReceh) {
          if (shouldAttachReceh) {
            // Attach small receh (≤5) to last full pallet
            qtyToRecord = standardCartons + remainingCartons;
            bbToRecord = form.bbReceh.length > 0 ? form.bbReceh : form.bbProduk;
            isRecehPallet = true; // Mark as receh because it contains mixed qty
          } else {
            // Create separate receh pallet for larger remainders (>5)
            qtyToRecord = remainingCartons;
            bbToRecord = form.bbReceh.length > 0 ? form.bbReceh : form.bbProduk;
            isRecehPallet = true;
          }
        }

        finalSubmissions.push({
            productCode: form.productCode,
            location: `${loc.clusterChar}-${loc.lorong}-${loc.baris}-${loc.level}`,
            qtyPallet: 1, // Selalu 1 pallet stack per lokasi
            qtyCarton: qtyToRecord,
            bbPallet: bbToRecord,
            isReceh: isRecehPallet,
        });
    });

    setFinalSubmissionData(finalSubmissions);
    console.log("FINAL INBOUND BATCH SUBMISSION:", finalSubmissions);

    // Show confirmation modal first
    setShowConfirmModal(true);
    
    // TIDAK AUTO CLOSE - User harus klik tombol "Tutup"
  };
  // --- AKHIR EFFECT DAN HANDLER ---


  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          {/* Header with QR Scanner Button */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                📦 Form Inbound Produk
              </h1>
              <p className="text-sm text-gray-600">
                Lengkapi data inbound untuk pencatatan masuk barang
              </p>
            </div>
            <div>
              <QRScanner 
                onScanSuccess={handleQRScanSuccess}
                onScanError={(errorMsg) => {
                  error(errorMsg);
                }}
              />
            </div>
          </div>

          {/* Error Modal */}
          {showErrorModal && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
              onClick={() => setShowErrorModal(false)}
            >
              <div 
                className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-linear-to-r from-red-500 to-pink-600 p-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                      <XCircle className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1">
                      Validasi Gagal
                    </h3>
                    <p className="text-red-100 text-sm">
                      Periksa kembali data yang Anda masukkan
                    </p>
                  </div>
                </div>
                <div className="p-6">
                  <ul className="space-y-2 mb-4">
                    {errorMessages.map((msg, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-red-700">
                        <span className="text-red-500 font-bold">•</span>
                        <span>{msg}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => setShowErrorModal(false)}
                    className="w-full bg-linear-to-r from-red-500 to-pink-600 text-white py-3 rounded-xl font-semibold hover:from-red-600 hover:to-pink-700 transition-all shadow-lg"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Confirmation Modal */}
          {showConfirmModal && finalSubmissionData && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowConfirmModal(false)}
            >
              <div 
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">
                    Konfirmasi Penerimaan Barang
                  </h2>
                  
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-6">
                    <p className="text-amber-800 font-medium">
                      ⚠️ Pastikan data berikut sudah benar sebelum menyimpan ke sistem:
                    </p>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="font-semibold text-gray-800 mb-3">Informasi Pengiriman:</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Ekspedisi:</span>
                          <span className="font-semibold text-gray-800">{form.ekspedisi}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Nama Pengemudi:</span>
                          <span className="font-semibold text-gray-800">{form.namaPengemudi}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">No DN:</span>
                          <span className="font-semibold text-gray-800">{form.noDN}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Nomor Polisi:</span>
                          <span className="font-semibold text-gray-800">{form.nomorPolisi}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-xl p-4">
                      <h3 className="font-semibold text-gray-800 mb-3">Detail Barang & Lokasi:</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Produk:</span>
                          <span className="font-semibold text-gray-800">{selectedProduct?.productName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">BB Produk:</span>
                          <span className="font-semibold text-gray-800">{form.bbProduk}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Lokasi:</span>
                          <span className="font-semibold text-gray-800">{finalSubmissionData.length} lokasi</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <p className="text-xs text-gray-600 mb-2">Lokasi Penempatan:</p>
                        <div className="space-y-1">
                          {finalSubmissionData.map((item, idx) => (
                            <div key={idx} className={`flex justify-between text-sm p-2 rounded ${item.isReceh ? 'bg-blue-100' : 'bg-green-100'}`}>
                              <span className="font-semibold">{item.location}</span>
                              <span className={item.isReceh ? 'text-blue-700' : 'text-green-700'}>
                                {item.qtyCarton} Karton {item.isReceh ? '(RECEH)' : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowConfirmModal(false)}
                      type="button"
                      className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      onClick={confirmSubmit}
                      type="button"
                      className="flex-1 bg-green-500 text-white py-3 rounded-xl font-semibold hover:bg-green-600 transition-colors shadow-lg"
                    >
                      ✓ Konfirmasi & Simpan
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success Modal (Updated to display multi-submission) */}
          {showSuccess && finalSubmissionData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="bg-linear-to-r from-green-500 to-emerald-600 p-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                      <CheckCircle className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1">
                      Inbound {finalSubmissionData.length} Pallet Berhasil!
                    </h3>
                    <p className="text-green-100 text-sm">
                      Data berhasil dicatat ke sistem
                    </p>
                  </div>
                </div>
                <div className="p-6">
                  <div className="mb-4 space-y-2 text-sm">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-gray-600">Pengemudi:</span>
                      <span className="font-semibold text-gray-800">{form.namaPengemudi}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-gray-600">No DN/Surat Jalan:</span>
                      <span className="font-semibold text-gray-800">{form.noDN}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-gray-600">Nomor Polisi:</span>
                      <span className="font-semibold text-gray-800">{form.nomorPolisi}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 font-semibold mb-3">
                    Detail Lokasi Penempatan:
                  </p>
                  <div className="mb-4 space-y-2 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3">
                    {finalSubmissionData.map((item, idx) => (
                      <div key={idx} className={`flex justify-between rounded-md p-2 ${item.isReceh ? 'bg-blue-100' : 'bg-green-100'}`}>
                        <span className="font-semibold text-gray-800">
                          {item.location}
                        </span>
                        <span className={`text-sm font-bold ${item.isReceh ? 'text-blue-700' : 'text-green-700'}`}>
                          {item.qtyCarton} Karton {item.isReceh ? '(RECEH)' : '(UTUH)'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-center text-sm text-gray-500 mt-4">
                    Menutup otomatis dalam 3 detik...
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Notification Modal (Pengganti Toast) */}
          {showNotificationModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className={`p-6 ${
                  notificationType === 'success' ? 'bg-linear-to-r from-green-500 to-emerald-600' :
                  notificationType === 'error' ? 'bg-linear-to-r from-red-500 to-pink-600' :
                  'bg-linear-to-r from-orange-500 to-amber-600'
                }`}>
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                      {notificationType === 'success' ? (
                        <CheckCircle className="h-10 w-10 text-white" />
                      ) : (
                        <XCircle className="h-10 w-10 text-white" />
                      )}
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1">
                      {notificationTitle}
                    </h3>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-gray-700 whitespace-pre-line text-center mb-6">
                    {notificationMessage}
                  </p>
                  <button
                    onClick={() => setShowNotificationModal(false)}
                    className={`w-full py-3 rounded-xl font-semibold transition-all shadow-lg ${
                      notificationType === 'success' ? 'bg-green-500 hover:bg-green-600 text-white' :
                      notificationType === 'error' ? 'bg-red-500 hover:bg-red-600 text-white' :
                      'bg-orange-500 hover:bg-orange-600 text-white'
                    }`}
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Availability Confirmation Modal */}
          {showAvailabilityModal && (() => {
            // Group occupied locations by product
            const productGroups = occupiedLocations.reduce((acc, loc) => {
              const productName = loc.occupiedBy?.split(' (')[0] || 'Unknown';
              if (!acc[productName]) {
                acc[productName] = [];
              }
              acc[productName].push(loc);
              return acc;
            }, {} as Record<string, LocationAvailability[]>);
            
            // Create range summary per product
            const productSummaries = Object.entries(productGroups).map(([product, locs]) => {
              // Extract baris numbers and create ranges
              const barisList = locs.map(l => {
                const parts = l.location.split('-');
                return { baris: parts[2], pallet: parts[3], full: l.location };
              }).sort((a, b) => {
                const aNum = parseInt(a.baris.replace('B', ''));
                const bNum = parseInt(b.baris.replace('B', ''));
                return aNum - bNum;
              });
              
              // Group consecutive baris
              const ranges: string[] = [];
              let rangeStart = barisList[0];
              let rangeEnd = barisList[0];
              
              for (let i = 1; i < barisList.length; i++) {
                const curr = parseInt(barisList[i].baris.replace('B', ''));
                const prev = parseInt(rangeEnd.baris.replace('B', ''));
                
                if (curr === prev + 1 && barisList[i].pallet === rangeEnd.pallet) {
                  rangeEnd = barisList[i];
                } else {
                  ranges.push(rangeStart.baris === rangeEnd.baris 
                    ? `${rangeStart.full}` 
                    : `${rangeStart.baris}-${rangeEnd.baris} (Pallet ${rangeStart.pallet})`);
                  rangeStart = barisList[i];
                  rangeEnd = barisList[i];
                }
              }
              ranges.push(rangeStart.baris === rangeEnd.baris 
                ? `${rangeStart.full}` 
                : `${rangeStart.baris}-${rangeEnd.baris} (Pallet ${rangeStart.pallet})`);
              
              return { product, ranges, count: locs.length, qty: locs[0].occupiedBy?.match(/\((\d+) karton\)/)?.[1] || '?' };
            });
            
            return (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
              onClick={() => setShowAvailabilityModal(false)}
            >
              <div 
                className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-linear-to-r from-orange-500 to-red-600 p-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                      <XCircle className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1">
                      ⚠️ Lokasi Sudah Terisi!
                    </h3>
                    <p className="text-orange-100 text-sm">
                      {occupiedLocations.length} dari {expandedLocations.length} lokasi sudah terisi oleh {Object.keys(productGroups).length} produk berbeda
                    </p>
                  </div>
                </div>
                <div className="p-6">
                  <div className="mb-4 bg-red-50 border-2 border-red-200 rounded-xl p-4">
                    <h4 className="font-semibold text-red-900 mb-3">
                      📦 Detail Produk di Lokasi Range:
                    </h4>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {productSummaries.map((summary, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-lg border-2 border-red-300">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h5 className="font-bold text-red-700 text-lg">{summary.product}</h5>
                              <p className="text-xs text-red-600">{summary.count} lokasi terisi</p>
                            </div>
                            <span className="text-xs bg-red-500 text-white px-3 py-1 rounded-full font-bold">
                              {summary.qty} karton/lokasi
                            </span>
                          </div>
                          <div className="mt-2 space-y-1">
                            <p className="text-xs font-semibold text-gray-700">Baris yang terisi:</p>
                            {summary.ranges.map((range, rIdx) => (
                              <div key={rIdx} className="text-xs bg-red-100 px-2 py-1 rounded font-mono text-red-800">
                                {range}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                    <p className="text-yellow-800 text-sm">
                      <strong>⚠️ Peringatan:</strong> Jika Anda melanjutkan, lokasi yang sudah terisi akan <strong className="text-red-600">DITIMPA</strong> dengan data baru. 
                      Pastikan ini adalah tindakan yang benar!
                    </p>
                  </div>

                  <p className="text-sm text-gray-700 mb-4">
                    Apakah Anda yakin ingin menggunakan lokasi ini?
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowAvailabilityModal(false);
                        setExpandedLocations([]);
                        setLocationAvailability([]);
                      }}
                      type="button"
                      className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                    >
                      ❌ Batal - Pilih Lokasi Lain
                    </button>
                    <button
                      onClick={confirmOverrideLocations}
                      type="button"
                      className="flex-1 bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600 transition-colors shadow-lg"
                    >
                      ⚠️ Lanjutkan & Timpa
                    </button>
                  </div>
                </div>
              </div>
            </div>
            );
          })()}
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ... (Ekspedisi, Tanggal, Produk, BB Produk, Qty Inputs, BB Receh Tracking) */}

            {/* Ekspedisi & Tanggal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Field Ekspedisi (Tetap) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ekspedisi <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.ekspedisi}
                  onChange={(e) => handleChange("ekspedisi", e.target.value)}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all ${
                    errors.ekspedisi ? "border-red-500" : "border-gray-200"
                  }`}
                >
                  <option value="">-- Pilih Ekspedisi --</option>
                  {warehouseExpeditions.map((exp) => (
                    <option key={exp.id} value={exp.expeditionCode}>
                      {exp.expeditionName} ({exp.expeditionCode})
                    </option>
                  ))}
                </select>
                {errors.ekspedisi && (
                  <p className="text-red-500 text-xs mt-1">{errors.ekspedisi}</p>
                )}
              </div>

              {/* Field Tanggal (Tetap) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tanggal Inbound <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.tanggal}
                  onChange={(e) => handleChange("tanggal", e.target.value)}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all ${
                    errors.tanggal ? "border-red-500" : "border-gray-200"
                  }`}
                  max={today}
                  min={today}
                />
                {errors.tanggal && (
                  <p className="text-red-500 text-xs mt-1">{errors.tanggal}</p>
                )}
              </div>
            </div>

            {/* Nama Pengemudi, No DN, Nomor Polisi */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Nama Pengemudi */}
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nama Pengemudi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.namaPengemudi}
                  onChange={(e) => {
                    handleChange("namaPengemudi", e.target.value);
                    setShowDriverSuggestions(true);
                  }}
                  onFocus={() => setShowDriverSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowDriverSuggestions(false), 200)}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all ${
                    errors.namaPengemudi ? "border-red-500" : "border-gray-200"
                  }`}
                  placeholder="Nama lengkap pengemudi"
                />
                {errors.namaPengemudi && (
                  <p className="text-red-500 text-xs mt-1">{errors.namaPengemudi}</p>
                )}
                {/* Autocomplete Suggestions */}
                {showDriverSuggestions && driverHistory.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {driverHistory
                      .filter(h => h.toLowerCase().includes(form.namaPengemudi.toLowerCase()))
                      .map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            handleChange("namaPengemudi", suggestion);
                            setShowDriverSuggestions(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors text-sm"
                        >
                          {suggestion}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* No DN/Surat Jalan */}
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  No DN/Surat Jalan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.noDN}
                  onChange={(e) => {
                    handleChange("noDN", e.target.value.toUpperCase());
                    setShowDnSuggestions(true);
                  }}
                  onFocus={() => setShowDnSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowDnSuggestions(false), 200)}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all ${
                    errors.noDN ? "border-red-500" : "border-gray-200"
                  }`}
                  placeholder="Nomor DN/Surat Jalan"
                />
                {errors.noDN && (
                  <p className="text-red-500 text-xs mt-1">{errors.noDN}</p>
                )}
                {/* Autocomplete Suggestions */}
                {showDnSuggestions && dnHistory.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {dnHistory
                      .filter(h => h.toLowerCase().includes(form.noDN.toLowerCase()))
                      .map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            handleChange("noDN", suggestion);
                            setShowDnSuggestions(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors text-sm"
                        >
                          {suggestion}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Nomor Polisi */}
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nomor Polisi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nomorPolisi}
                  onChange={(e) => {
                    handleChange("nomorPolisi", e.target.value.toUpperCase());
                    setShowPoliceNoSuggestions(true);
                  }}
                  onFocus={() => setShowPoliceNoSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowPoliceNoSuggestions(false), 200)}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all ${
                    errors.nomorPolisi ? "border-red-500" : "border-gray-200"
                  }`}
                  placeholder="B 1234 ABC"
                />
                {errors.nomorPolisi && (
                  <p className="text-red-500 text-xs mt-1">{errors.nomorPolisi}</p>
                )}
                {/* Autocomplete Suggestions */}
                {showPoliceNoSuggestions && policeNoHistory.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {policeNoHistory
                      .filter(h => h.toLowerCase().includes(form.nomorPolisi.toLowerCase()))
                      .map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            handleChange("nomorPolisi", suggestion);
                            setShowPoliceNoSuggestions(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors text-sm"
                        >
                          {suggestion}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Product Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Produk <span className="text-red-500">*</span>
              </label>
              <select
                value={form.productCode}
                onChange={(e) => handleChange("productCode", e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all ${
                  errors.productCode ? "border-red-500" : "border-gray-200"
                }`}
              >
                <option value="">-- Pilih Produk --</option>
                {filteredProducts.map((product) => (
                  <option key={product.id} value={product.productCode}>
                    {product.productName} ({product.productCode})
                  </option>
                ))}
              </select>
              {errors.productCode && (
                <p className="text-red-500 text-xs mt-1">{errors.productCode}</p>
              )}
            </div>

            {/* BB Produk */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                BB Produk (YYMMDDXXXX) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.bbProduk}
                onChange={(e) => handleChange("bbProduk", e.target.value.toUpperCase())}
                maxLength={10}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all ${
                  errors.bbProduk ? "border-red-500" : "border-gray-200"
                }`}
                placeholder="Contoh: 27090290A0"
              />
              {errors.bbProduk && (
                <p className="text-red-500 text-xs mt-1">{errors.bbProduk}</p>
              )}
              {/* Display Parsed Values */}
              <div className="mt-2 text-xs grid grid-cols-2 gap-2">
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="text-slate-600">Kd Plant (4 digit):</span>{" "}
                  <span className="font-semibold text-slate-800">{form.kdPlant || '-'}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="text-slate-600">Expired Date:</span>{" "}
                  <span className="font-semibold text-slate-800">{form.expiredDate || '-'}</span>
                </div>
              </div>
            </div>

            {/* Qty Gabungan (Pallet Input & Carton Input) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Qty Pallet (Input Manual) */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Qty Pallet Utuh <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        value={form.qtyPalletInput}
                        onChange={(e) => handleChange("qtyPalletInput", e.target.value)}
                        min="0"
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all ${
                            errors.qtyPalletInput ? "border-red-500" : "border-gray-200"
                        }`}
                        placeholder="Jumlah Pallet Utuh (cth: 1)"
                    />
                    {errors.qtyPalletInput && (
                        <p className="text-red-500 text-xs mt-1">{errors.qtyPalletInput}</p>
                    )}
                </div>

                {/* Qty Carton (Input Manual) */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Qty Karton Utuh/Sisa <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        value={form.qtyCartonInput}
                        onChange={(e) => handleChange("qtyCartonInput", e.target.value)}
                        min="0"
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all ${
                            errors.qtyCartonInput ? "border-red-500" : "border-gray-200"
                        }`}
                        placeholder="Jumlah Karton (cth: 50)"
                    />
                    {errors.qtyCartonInput && (
                        <p className="text-red-500 text-xs mt-1">{errors.qtyCartonInput}</p>
                    )}
                </div>
            </div>

            {/* BB Receh Tracking (Tampil jika receh) */}
            {isReceh && (
              <div className="border-2 border-blue-300 bg-blue-50 rounded-xl p-4">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <span>🏷️</span> BB Tracking untuk Receh (Opsional)
                </h3>
                <p className="text-xs text-blue-700 mb-3">
                  Untuk pallet receh, Anda bisa menambahkan multiple BB jika pallet ini berisi produk dari beberapa batch berbeda (produk sama).
                </p>
                
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-blue-900 mb-2">
                    BB Receh (Pisahkan dengan koma jika multiple)
                  </label>
                  <input
                    type="text"
                    value={form.bbReceh.join(', ')}
                    onChange={(e) => {
                      const bbArray = e.target.value
                        .split(',')
                        .map(bb => bb.trim().toUpperCase())
                        .filter(bb => bb.length > 0);
                      setForm(prev => ({ ...prev, bbReceh: bbArray }));
                    }}
                    className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                    placeholder="Contoh: BB-202501-0001, BB-202501-0002"
                  />
                  {form.bbReceh.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {form.bbReceh.map((bb, idx) => (
                        <span key={idx} className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full font-semibold">
                          {bb}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Checkbox Rekomendasi Otomatis */}
            <div className="flex items-center gap-3 p-4 bg-purple-50 border-2 border-purple-200 rounded-xl">
              <input
                type="checkbox"
                id="autoRecommend"
                checked={autoRecommend}
                onChange={(e) => setAutoRecommend(e.target.checked)}
                className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
              />
              <label htmlFor="autoRecommend" className="text-sm font-semibold text-purple-900 cursor-pointer">
                🤖 Rekomendasi Lokasi Otomatis
              </label>
            </div>

            {/* Location Fields - Conditional rendering based on autoRecommend and totalPalletsNeeded */}
            {autoRecommend ? (
              /* AUTO RECOMMEND MODE - Single location input (original) */
              <div className="border-2 border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 mb-4">📍 Lokasi Penyimpanan</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Cluster */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Cluster <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.clusterChar}
                      onChange={(e) => handleChange("clusterChar", e.target.value)}
                      className="w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all bg-gray-100 border-gray-200"
                      disabled={autoRecommend}
                    >
                      <option value="">-- Pilih --</option>
                      {clusterOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    {errors.clusterChar && (
                      <p className="text-red-500 text-xs mt-1">{errors.clusterChar}</p>
                    )}
                  </div>

                {/* Lorong, Baris, Pallet... (Tetap) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Lorong <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.lorong}
                    onChange={(e) => handleChange("lorong", e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all ${
                      errors.lorong ? "border-red-500" : "border-gray-200"
                    } ${autoRecommend ? "bg-gray-100" : ""}`}
                    disabled={autoRecommend || !form.clusterChar}
                  >
                    <option value="">-- Pilih --</option>
                    {lorongOptions.map((lorong) => (
                      <option key={lorong} value={lorong}>
                        {lorong}
                      </option>
                    ))}
                  </select>
                  {errors.lorong && (
                    <p className="text-red-500 text-xs mt-1">{errors.lorong}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Baris <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.baris}
                    onChange={(e) => handleChange("baris", e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all ${
                      errors.baris ? "border-red-500" : "border-gray-200"
                    } ${autoRecommend ? "bg-gray-100" : ""}`}
                    disabled={autoRecommend || !form.clusterChar || !form.lorong}
                  >
                    <option value="">-- Pilih --</option>
                    {barisOptions.map((baris) => (
                      <option key={baris} value={baris}>
                        {baris}
                      </option>
                    ))}
                  </select>
                  {errors.baris && (
                    <p className="text-red-500 text-xs mt-1">{errors.baris}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Pallet <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.pallet}
                    onChange={(e) => handleChange("pallet", e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all ${
                      errors.pallet ? "border-red-500" : "border-gray-200"
                    } ${autoRecommend ? "bg-gray-100" : ""}`}
                    disabled={autoRecommend || !form.clusterChar || !form.lorong || !form.baris}
                  >
                    <option value="">-- Pilih --</option>
                    {palletOptions.map((pallet) => (
                      <option key={pallet} value={pallet}>
                        {pallet}
                      </option>
                    ))}
                  </select>
                  {errors.pallet && (
                    <p className="text-red-500 text-xs mt-1">{errors.pallet}</p>
                  )}
                </div>
              </div>
            </div>
            ) : (
              /* MANUAL MODE - Multiple location inputs if totalPalletsNeeded > 1 */
              <div className="border-2 border-orange-300 bg-orange-50 rounded-xl p-4">
                <h3 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                  ✍️ Input Lokasi Manual 
                  {totalPalletsNeeded > 1 && (
                    <span className="text-xs bg-orange-200 px-2 py-1 rounded-full">
                      {totalPalletsNeeded} lokasi diperlukan
                    </span>
                  )}
                </h3>
                <p className="text-xs text-orange-700 mb-4">
                  {totalPalletsNeeded > 1 
                    ? `Mohon isi ${totalPalletsNeeded} lokasi berbeda untuk ${totalPalletsNeeded} pallet.`
                    : "Masukkan lokasi penyimpanan secara manual."}
                </p>

                {totalPalletsNeeded === 1 ? (
                  /* Single location input for manual mode */
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Cluster <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={form.clusterChar}
                        onChange={(e) => handleChange("clusterChar", e.target.value)}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all ${
                          errors.clusterChar ? "border-red-500" : "border-gray-200"
                        }`}
                      >
                        <option value="">-- Pilih --</option>
                        {clusterOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      {errors.clusterChar && (
                        <p className="text-red-500 text-xs mt-1">{errors.clusterChar}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Lorong <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={form.lorong}
                        onChange={(e) => handleChange("lorong", e.target.value)}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all ${
                          errors.lorong ? "border-red-500" : "border-gray-200"
                        }`}
                        disabled={!form.clusterChar}
                      >
                        <option value="">-- Pilih --</option>
                        {lorongOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      {errors.lorong && (
                        <p className="text-red-500 text-xs mt-1">{errors.lorong}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Baris <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={form.baris}
                        onChange={(e) => handleChange("baris", e.target.value)}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all ${
                          errors.baris ? "border-red-500" : "border-gray-200"
                        }`}
                        disabled={!form.clusterChar || !form.lorong}
                      >
                        <option value="">-- Pilih --</option>
                        {barisOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      {errors.baris && (
                        <p className="text-red-500 text-xs mt-1">{errors.baris}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Pallet <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={form.pallet}
                        onChange={(e) => handleChange("pallet", e.target.value)}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all ${
                          errors.pallet ? "border-red-500" : "border-gray-200"
                        }`}
                        disabled={!form.clusterChar || !form.lorong || !form.baris}
                      >
                        <option value="">-- Pilih --</option>
                        {palletOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      {errors.pallet && (
                        <p className="text-red-500 text-xs mt-1">{errors.pallet}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Range-based location input for manual mode */
                  <div className="space-y-4">
                    {/* Range Input Form */}
                    <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
                      <h4 className="font-semibold text-gray-800 mb-3">
                        📏 Input Range Lokasi
                      </h4>
                      <p className="text-xs text-gray-600 mb-4">
                        Masukkan range lokasi yang akan digunakan. Contoh: Baris B1-B5, Pallet P1-P2 akan menghasilkan 10 lokasi.
                      </p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                        {/* Cluster & Lorong */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Cluster <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={manualRange.clusterChar}
                            onChange={(e) => setManualRange(prev => ({ ...prev, clusterChar: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-100 focus:border-orange-500 transition-all"
                          >
                            <option value="">-- Pilih --</option>
                            {clusterOptions.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Lorong <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={manualRange.lorong}
                            onChange={(e) => setManualRange(prev => ({ ...prev, lorong: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-100 focus:border-orange-500 transition-all"
                            disabled={!manualRange.clusterChar}
                          >
                            <option value="">-- Pilih --</option>
                            {manualRange.clusterChar && (() => {
                              const config = getClusterConfig(manualRange.clusterChar);
                              if (!config) return null;
                              const options = Array.from({ length: config.defaultLorongCount }, (_, i) => `L${i + 1}`);
                              return options.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ));
                            })()}
                          </select>
                        </div>

                        <div className="col-span-2 md:col-span-1">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            &nbsp;
                          </label>
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
                            onChange={(e) => setManualRange(prev => ({ ...prev, barisStart: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-100 focus:border-orange-500 transition-all"
                            disabled={!manualRange.clusterChar || !manualRange.lorong}
                          >
                            <option value="">-- Pilih --</option>
                            {manualRange.clusterChar && manualRange.lorong && (() => {
                              const lorongNum = parseInt(manualRange.lorong.replace('L', ''));
                              const barisCount = getBarisCountForLorong(manualRange.clusterChar, lorongNum);
                              const options = Array.from({ length: barisCount }, (_, i) => `B${i + 1}`);
                              return options.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ));
                            })()}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Baris End <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={manualRange.barisEnd}
                            onChange={(e) => setManualRange(prev => ({ ...prev, barisEnd: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-100 focus:border-orange-500 transition-all"
                            disabled={!manualRange.clusterChar || !manualRange.lorong}
                          >
                            <option value="">-- Pilih --</option>
                            {manualRange.clusterChar && manualRange.lorong && (() => {
                              const lorongNum = parseInt(manualRange.lorong.replace('L', ''));
                              const barisCount = getBarisCountForLorong(manualRange.clusterChar, lorongNum);
                              const options = Array.from({ length: barisCount }, (_, i) => `B${i + 1}`);
                              return options.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ));
                            })()}
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
                            onChange={(e) => setManualRange(prev => ({ ...prev, palletStart: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-100 focus:border-orange-500 transition-all"
                            disabled={!manualRange.clusterChar || !manualRange.lorong || !manualRange.barisStart}
                          >
                            <option value="">-- Pilih --</option>
                            {manualRange.clusterChar && manualRange.lorong && manualRange.barisStart && (() => {
                              const lorongNum = parseInt(manualRange.lorong.replace('L', ''));
                              const barisNum = parseInt(manualRange.barisStart.replace('B', ''));
                              const palletCapacity = getPalletCapacityForCell(manualRange.clusterChar, lorongNum, barisNum);
                              const options = Array.from({ length: palletCapacity }, (_, i) => `P${i + 1}`);
                              return options.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ));
                            })()}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Pallet End <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={manualRange.palletEnd}
                            onChange={(e) => setManualRange(prev => ({ ...prev, palletEnd: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-100 focus:border-orange-500 transition-all"
                            disabled={!manualRange.clusterChar || !manualRange.lorong || !manualRange.barisStart}
                          >
                            <option value="">-- Pilih --</option>
                            {manualRange.clusterChar && manualRange.lorong && manualRange.barisStart && (() => {
                              const lorongNum = parseInt(manualRange.lorong.replace('L', ''));
                              const barisNum = parseInt(manualRange.barisStart.replace('B', ''));
                              const palletCapacity = getPalletCapacityForCell(manualRange.clusterChar, lorongNum, barisNum);
                              const options = Array.from({ length: palletCapacity }, (_, i) => `P${i + 1}`);
                              return options.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ));
                            })()}
                          </select>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={expandRangeToLocations}
                        className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors shadow-md"
                      >
                        🔍 Generate & Cek Ketersediaan Lokasi
                      </button>
                    </div>

                    {/* Preview Generated Locations */}
                    {manualLocations.length > 0 && (
                      <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-green-900">
                            ✅ {manualLocations.length} Lokasi Siap Digunakan
                          </h4>
                          {occupiedLocations.length > 0 && (
                            <span className="text-xs bg-red-500 text-white px-3 py-1 rounded-full font-bold">
                              ⚠️ {occupiedLocations.length} Terisi
                            </span>
                          )}
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {manualLocations.map((loc, idx) => {
                            const locationKey = `${loc.clusterChar}-${loc.lorong}-${loc.baris}-${loc.pallet}`;
                            const availInfo = locationAvailability.find(a => a.location === locationKey);
                            return (
                              <div key={idx} className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                                availInfo?.isOccupied ? 'bg-red-100 border border-red-300' : 'bg-white border border-green-200'
                              }`}>
                                <span className="font-semibold">
                                  #{idx + 1}: {locationKey}
                                </span>
                                {availInfo?.isOccupied ? (
                                  <span className="text-xs text-red-700">
                                    ⚠️ Terisi: {availInfo.occupiedBy}
                                  </span>
                                ) : (
                                  <span className="text-xs text-green-700 font-semibold">
                                    ✓ Kosong
                                  </span>
                                )}
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

            {/* Calculated Qty & Logika Receh */}
            {totalCartons > 0 && selectedProduct && (
              <div className={`p-4 border-2 rounded-xl ${isReceh ? 'bg-blue-50 border-blue-300' : 'bg-yellow-50 border-yellow-200'}`}>
                <p className="font-semibold text-sm">
                  Kalkulasi Qty Penerimaan:
                </p>
                <p className={`text-xl font-bold ${isReceh ? 'text-blue-700' : 'text-yellow-900'}`}>
                    {totalPallets.toLocaleString()} Pallet Utuh {remainingCartons > 0 ? `+ ${remainingCartons.toLocaleString()} Karton Sisa` : ''}
                </p>
                <p className="text-xs mt-1">
                    Total Pallet Dibutuhkan: <span className="font-bold">{totalPalletsNeeded} Lokasi</span>
                </p>
                {isReceh && (
                  <div className="mt-2 space-y-1">
                    {shouldAttachReceh ? (
                      <p className="text-xs font-semibold text-green-700 bg-green-100 p-2 rounded-lg">
                        💡 Smart Receh: {remainingCartons} karton sisa (≤5) akan <span className="underline">dititipkan</span> ke pallet utuh terakhir untuk efisiensi ruang!
                      </p>
                    ) : (
                      <p className="text-xs font-semibold text-blue-700">
                        📦 Pallet terakhir akan ditandai <span className="font-bold">RECEH</span> (Warna Biru) karena sisa {remainingCartons} karton.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Summary Data */}
            {form.productCode && form.ekspedisi && (
              <div className="bg-slate-50 border-2 border-slate-300 rounded-xl p-4">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <span>📋</span> Ringkasan Data Inbound
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {/* ... (Ekspedisi, Tanggal, Produk, BB Produk, Kd Plant, Expired Date) */}
                  <div>
                    <span className="text-slate-600">Ekspedisi:</span>{" "}
                    <span className="font-semibold text-slate-900">{form.ekspedisi || "-"}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Tanggal:</span>{" "}
                    <span className="font-semibold text-slate-900">{form.tanggal || "-"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-600">Produk:</span>{" "}
                    <span className="font-semibold text-slate-900">{selectedProduct?.productName || "-"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-600">BB Produk:</span>{" "}
                    <span className="font-bold text-slate-900">{form.bbProduk || "-"}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Kd Plant:</span>{" "}
                    <span className="font-semibold text-slate-900">{form.kdPlant || "-"}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Expired Date:</span>{" "}
                    <span className="font-semibold text-slate-900">{form.expiredDate || "-"}</span>
                  </div>
                  
                  {/* Qty Pallet (Stack) Final */}
                  <div>
                    <span className="text-slate-600">Qty Pallet Utuh:</span>{" "}
                    <span className="font-semibold text-slate-900">{totalPallets.toLocaleString()}</span>
                  </div>
                  {/* Qty Produk Manual Final */}
                  <div>
                    <span className="text-slate-600">Qty Karton Sisa:</span>{" "}
                    <span className="font-semibold text-slate-900">{remainingCartons.toLocaleString()}</span>
                  </div>

                  <div className="col-span-2 pt-2 border-t border-slate-300">
                    <span className="text-slate-600">Status Pallet:</span>{" "}
                    <span className={`font-bold ${isReceh ? 'text-blue-700' : 'text-green-700'}`}>
                        {isReceh ? 'RECEH' : 'NORMAL'}
                    </span>
                    <span className="ml-4 text-slate-600">Lokasi:</span>{" "}
                    <span className="font-bold text-slate-900">
                      {form.clusterChar && form.lorong && form.baris && form.pallet
                        ? `${form.clusterChar}-${form.lorong}-${form.baris}-${form.pallet}`
                        : "-"}
                    </span>
                    {autoRecommend && (
                      <span className="ml-2 text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                        Auto
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Recommended Location - Multi/Single Display (Hanya tampil jika autoRecommend ON) */}
            {autoRecommend && (
              <div className="flex gap-3">
                  <button
                      onClick={handleRecommend}
                      type="button"
                      className="flex-1 bg-green-500 text-white py-3 rounded-xl font-semibold hover:bg-green-600 transition-colors shadow-lg flex items-center justify-center gap-2"
                  >
                      🔍 Rekomendasi Lokasi ({totalPalletsNeeded} Pallet)
                  </button>
              </div>
            )}
            
            {(multiLocationRec || recommendedLocation) && (
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <h3 className="font-semibold text-green-900 mb-2">
                  ✅ Rekomendasi Lokasi Ditemukan
                </h3>
                
                {multiLocationRec && multiLocationRec.locations.length > 1 ? (
                    <div className="space-y-2">
                        <p className="text-sm font-semibold text-green-700">
                            Diperlukan {totalPalletsNeeded} lokasi. Tersedia {multiLocationRec.locations.length} lokasi.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            {multiLocationRec.locations.map((loc, idx) => {
                                const lorongNum = parseInt(loc.lorong.replace("L", ""));
                                const isTransit = isInTransitLocation(form.clusterChar, lorongNum);
                                return (
                                  <div key={idx} className={`flex items-center gap-2 p-2 rounded-lg ${idx === 0 ? 'bg-green-600 text-white' : isTransit ? 'bg-red-100 text-red-800 border-2 border-red-300' : 'bg-green-100 text-green-800'}`}>
                                      <span className="text-xs font-bold">#{idx + 1}</span>
                                      <span className="font-bold text-sm">
                                          {loc.clusterChar}-{loc.lorong}-{loc.baris}-{loc.level}
                                      </span>
                                      {isTransit && (
                                        <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-bold">
                                          Transit
                                        </span>
                                      )}
                                  </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <span className="text-green-700">Lokasi:</span>
                        <span className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-lg">
                            {form.clusterChar}-{form.lorong}-{form.baris}-{form.pallet}
                        </span>
                    </div>
                )}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-linear-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              🚀 Submit Inbound & Konfirmasi Lokasi
            </button>
          </form>

          {/* Tabel Transaksi Hari Ini */}
          <div className="mt-8">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
              <div className="bg-linear-to-r from-blue-500 to-indigo-600 px-6 py-4">
                <h3 className="text-xl font-bold text-white">📋 Transaksi Hari Ini</h3>
                <p className="text-blue-100 text-sm mt-1">
                  {new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
              {todayTransactions.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-gray-500 font-medium">Belum ada transaksi inbound hari ini</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Waktu</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Ekspedisi</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Pengemudi</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Produk</th>
                          <th className="px-2 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Pallet</th>
                          <th className="px-2 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Carton</th>
                          <th className="px-2 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                          <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {todayTransactions.map((item) => (
                          <tr key={item.id} className="hover:bg-blue-50 transition-colors">
                            <td className="px-3 py-3 text-sm text-gray-900 whitespace-nowrap">
                              {new Date(item.arrivalTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td className="px-3 py-3 text-sm text-gray-900">{item.expeditionId || '-'}</td>
                            <td className="px-3 py-3 text-sm text-gray-900 max-w-[120px] truncate">{item.driverName}</td>
                            <td className="px-3 py-3 text-sm">
                              <div className="font-medium text-gray-900">{productMasterData.find(p => p.id === item.productId)?.productCode || '-'}</div>
                              <div className="text-gray-500 text-xs truncate max-w-[150px]">{productMasterData.find(p => p.id === item.productId)?.productName || '-'}</div>
                            </td>
                            <td className="px-2 py-3 text-sm text-center font-bold text-green-600">
                              {item.locations.length}
                            </td>
                            <td className="px-2 py-3 text-sm text-center font-bold text-blue-600">
                              {item.qtyCarton}
                            </td>
                            <td className="px-2 py-3 text-center">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                ✓
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => {
                                    setSelectedHistoryItem(item);
                                    setShowHistoryDetailModal(true);
                                  }}
                                  className="px-2 py-1 bg-blue-500 text-white text-xs font-semibold rounded hover:bg-blue-600 transition-colors"
                                >
                                  Detail
                                </button>
                                <button
                                  onClick={() => handleEditClick(item)}
                                  className="px-2 py-1 bg-amber-500 text-white text-xs font-semibold rounded hover:bg-amber-600 transition-colors"
                                >
                                  Ubah
                                </button>
                                <button
                                  onClick={() => handleBatalClick(item)}
                                  className="px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded hover:bg-red-600 transition-colors"
                                >
                                  Batal
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600 text-center">
                      {todayTransactions.length} transaksi hari ini
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Modal Detail Transaksi */}
          {showHistoryDetailModal && selectedHistoryItem && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => setShowHistoryDetailModal(false)}
            >
              <div 
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="sticky top-0 bg-linear-to-r from-blue-500 to-indigo-600 px-6 py-4 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-white">📋 Detail Transaksi Inbound</h2>
                  <button
                    onClick={() => setShowHistoryDetailModal(false)}
                    className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Informasi Pengiriman */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                    <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                      <span className="text-lg">🚚</span> Informasi Pengiriman
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Tanggal:</span>
                        <p className="font-semibold text-gray-900">
                          {new Date(selectedHistoryItem.arrivalTime).toLocaleDateString("id-ID", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Kode Transaksi:</span>
                        <p className="font-semibold text-gray-900 font-mono">{selectedHistoryItem.transactionCode}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Ekspedisi:</span>
                        <p className="font-semibold text-gray-900">{selectedHistoryItem.expeditionId || '-'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Nama Pengemudi:</span>
                        <p className="font-semibold text-gray-900">{selectedHistoryItem.driverName}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">No. Polisi:</span>
                        <p className="font-semibold text-gray-900">{selectedHistoryItem.vehicleNumber}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">No. DN/Surat Jalan:</span>
                        <p className="font-semibold text-gray-900">{selectedHistoryItem.dnNumber}</p>
                      </div>
                    </div>
                  </div>

                  {/* Informasi Produk */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                    <h3 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                      <span className="text-lg">📦</span> Informasi Produk
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="col-span-2">
                        <span className="text-gray-600">Nama Produk:</span>
                        <p className="font-semibold text-gray-900">{productMasterData.find(p => p.id === selectedHistoryItem.productId)?.productName || '-'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Kode Produk:</span>
                        <p className="font-semibold text-gray-900">{productMasterData.find(p => p.id === selectedHistoryItem.productId)?.productCode || '-'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Total PCS:</span>
                        <p className="font-semibold text-gray-900">{((productMasterData.find(p => p.id === selectedHistoryItem.productId)?.qtyPerCarton || 0) * selectedHistoryItem.qtyCarton).toLocaleString()} pcs</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Qty Lokasi:</span>
                        <p className="font-semibold text-gray-900">{selectedHistoryItem.locations.length} lokasi</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Qty Carton:</span>
                        <p className="font-semibold text-gray-900">{selectedHistoryItem.qtyCarton} carton</p>
                      </div>
                    </div>
                  </div>

                  {/* Informasi Batch & Expired */}
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                    <h3 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
                      <span className="text-lg">🏷️</span> Informasi Batch & Expired
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">BB Produk:</span>
                        <p className="font-semibold text-gray-900 font-mono">{selectedHistoryItem.bbProduk}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Expired Date:</span>
                        <p className="font-semibold text-gray-900">
                          {new Date(selectedHistoryItem.expiredDate).toLocaleDateString("id-ID")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Lokasi Penyimpanan */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                    <h3 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                      <span className="text-lg">📍</span> Lokasi Penyimpanan
                    </h3>
                    <div className="space-y-2">
                      {selectedHistoryItem.locations.map((loc, idx) => (
                        <div key={idx} className="bg-white rounded-lg p-3 border border-purple-200">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-600">Lokasi:</span>
                              <p className="font-semibold text-gray-900">{loc.cluster}-L{loc.lorong}-B{loc.baris}-P{loc.level}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Qty:</span>
                              <p className="font-semibold text-gray-900">{loc.qtyCarton} carton{loc.isReceh ? ' (Receh)' : ''}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Waktu & Metadata */}
                  <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-200">
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <span className="text-lg">⏰</span> Waktu & Metadata
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Waktu Kedatangan:</span>
                        <p className="font-semibold text-gray-900">
                          {new Date(selectedHistoryItem.arrivalTime).toLocaleString("id-ID", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Diterima Oleh:</span>
                        <p className="font-semibold text-gray-900">{selectedHistoryItem.receivedBy}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-600">Catatan:</span>
                        <p className="font-semibold text-gray-900">{selectedHistoryItem.notes || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={() => setShowHistoryDetailModal(false)}
                    className="px-6 py-2.5 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Konfirmasi Edit */}
          {showEditConfirmModal && selectedItemForAction && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => setShowEditConfirmModal(false)}
            >
              <div 
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-linear-to-r from-amber-500 to-orange-600 px-6 py-4">
                  <h2 className="text-xl font-bold text-white">✏️ Edit Transaksi</h2>
                </div>
                <div className="p-6">
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-4">
                    <p className="text-amber-800 font-medium text-sm">
                      ⚠️ Tindakan ini akan:
                    </p>
                    <ul className="text-amber-700 text-sm mt-2 space-y-1 list-disc list-inside">
                      <li>Membatalkan transaksi <strong>{selectedItemForAction.transactionCode}</strong></li>
                      <li>Menghapus stock dari lokasi yang tercatat</li>
                      <li>Memuat data ke form untuk di-edit ulang</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <p className="text-sm text-gray-600 mb-2">Detail transaksi:</p>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Produk:</span>
                        <span className="font-semibold text-gray-900">{productMasterData.find(p => p.id === selectedItemForAction.productId)?.productCode || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Qty:</span>
                        <span className="font-semibold text-gray-900">{selectedItemForAction.locations.length} lokasi, {selectedItemForAction.qtyCarton} karton</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Lokasi:</span>
                        <span className="font-semibold text-gray-900 text-xs">{selectedItemForAction.locations.map(loc => `${loc.cluster}-L${loc.lorong}-B${loc.baris}-P${loc.level}`).join(', ')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowEditConfirmModal(false)}
                      className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      onClick={confirmEdit}
                      className="flex-1 px-4 py-2.5 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors"
                    >
                      Ya, Edit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal Konfirmasi Batal */}
          {showBatalConfirmModal && selectedItemForAction && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => setShowBatalConfirmModal(false)}
            >
              <div 
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-linear-to-r from-red-500 to-pink-600 px-6 py-4">
                  <h2 className="text-xl font-bold text-white">❌ Batalkan Transaksi</h2>
                </div>
                <div className="p-6">
                  <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4">
                    <p className="text-red-800 font-medium text-sm">
                      ⚠️ Tindakan ini akan:
                    </p>
                    <ul className="text-red-700 text-sm mt-2 space-y-1 list-disc list-inside">
                      <li>Membatalkan transaksi <strong>{selectedItemForAction.transactionCode}</strong></li>
                      <li>Menghapus stock dari lokasi yang tercatat</li>
                      <li>Menghapus record dari history</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <p className="text-sm text-gray-600 mb-2">Detail transaksi:</p>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Produk:</span>
                        <span className="font-semibold text-gray-900">{productMasterData.find(p => p.id === selectedItemForAction.productId)?.productCode || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Qty:</span>
                        <span className="font-semibold text-gray-900">{selectedItemForAction.locations.length} lokasi, {selectedItemForAction.qtyCarton} karton</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Lokasi:</span>
                        <span className="font-semibold text-gray-900 text-xs">{selectedItemForAction.locations.map(loc => `${loc.cluster}-L${loc.lorong}-B${loc.baris}-P${loc.level}`).join(', ')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowBatalConfirmModal(false)}
                      className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Tidak
                    </button>
                    <button
                      onClick={confirmBatal}
                      className="flex-1 px-4 py-2.5 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Ya, Batalkan
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
