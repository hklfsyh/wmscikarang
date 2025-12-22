"use client";

import { useState, useMemo, useEffect } from "react";
import { productMasterData, getProductByCode } from "@/lib/mock/product-master";
import { stockListData } from "@/lib/mock/stocklistmock";
import { TruckIcon, MapPin, XCircle } from "lucide-react";
import { useToast, ToastContainer } from "./toast";
import { QRCodeSVG } from "qrcode.react";
import { outboundHistoryData } from "@/lib/mock/transaction-history";

interface FEFOLocation {
  stockId: string;
  location: string;
  bbPallet: string | string[];
  expiredDate: string;
  availableQtyPallet: number;
  allocatedQtyPallet: number;
  daysToExpire: number;
}

type OutboundFormState = {
  tanggal: string;
  namaPengemudi: string;
  nomorPolisi: string;
  productCode: string;
  qtyPalletInput: string;
  qtyCartonInput: string;
};

const today = new Date().toISOString().slice(0, 10);

const initialState: OutboundFormState = {
  tanggal: today,
  namaPengemudi: "",
  nomorPolisi: "",
  productCode: "",
  qtyPalletInput: "",
  qtyCartonInput: "",
};

export function OutboundForm() {
  const [form, setForm] = useState<OutboundFormState>(initialState);
  const [fefoLocations, setFefoLocations] = useState<FEFOLocation[]>([]);
  const { toasts, removeToast, success, error } = useToast();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showBarcodeInfoModal, setShowBarcodeInfoModal] = useState(false);
  const [scannedBarcodeData, setScannedBarcodeData] = useState<{location: string; bbPallet: string} | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);

  // --- INPUT HISTORY/AUTOCOMPLETE STATE ---
  const [driverHistory, setDriverHistory] = useState<string[]>([]);
  const [policeNoHistory, setPoliceNoHistory] = useState<string[]>([]);
  const [showDriverSuggestions, setShowDriverSuggestions] = useState(false);
  const [showPoliceNoSuggestions, setShowPoliceNoSuggestions] = useState(false);
  
  // --- HISTORY DETAIL MODAL STATE ---
  const [showHistoryDetailModal, setShowHistoryDetailModal] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<typeof outboundHistoryData[0] | null>(null);
  
  // --- EDIT & BATAL MODAL STATE ---
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false);
  const [showBatalConfirmModal, setShowBatalConfirmModal] = useState(false);
  const [selectedItemForAction, setSelectedItemForAction] = useState<typeof outboundHistoryData[0] | null>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDrivers = localStorage.getItem('wms_driver_history');
      const savedPoliceNos = localStorage.getItem('wms_police_no_history');
      
      if (savedDrivers) setDriverHistory(JSON.parse(savedDrivers));
      if (savedPoliceNos) setPoliceNoHistory(JSON.parse(savedPoliceNos));
    }
  }, []);

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

  // Get selected product data
  const selectedProduct = form.productCode ? getProductByCode(form.productCode) : null;

  // --- LOGIKA QTY DINAMIS (CALCULATED VALUES) ---
  const qtyPerPalletStd = selectedProduct?.qtyPerPallet || 0;
  
  const { totalPallets, remainingCartons, totalCartons } = useMemo(() => {
    const palletInput = Number(form.qtyPalletInput) || 0;
    const cartonInput = Number(form.qtyCartonInput) || 0;
    
    // Total Karton = (Input Pallet Utuh * Std Qty/Pallet) + Input Karton Sisa
    const totalCartons = (palletInput * qtyPerPalletStd) + cartonInput;
    
    if (qtyPerPalletStd === 0) {
      return { totalPallets: 0, remainingCartons: cartonInput, totalCartons: cartonInput };
    }

    const calculatedPallets = Math.floor(totalCartons / qtyPerPalletStd);
    const remaining = totalCartons % qtyPerPalletStd;
    
    return {
      totalPallets: calculatedPallets,
      remainingCartons: remaining,
      totalCartons: totalCartons,
    };
  }, [form.qtyPalletInput, form.qtyCartonInput, qtyPerPalletStd]);
  
  const isReceh = remainingCartons > 0;
  const totalPalletsNeeded = totalPallets + (isReceh ? 1 : 0);
  
  // Total Pcs
  const totalPcs = selectedProduct && totalCartons
    ? totalCartons * selectedProduct.qtyPerCarton
    : 0;
  // --- AKHIR LOGIKA QTY DINAMIS ---

  // Handle field change
  const handleChange = (field: keyof OutboundFormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    
    // Reset FEFO ketika produk berubah
    if (field === "productCode") {
      setFefoLocations([]);
    }
    
    // Close suggestions when field changes
    if (field === "namaPengemudi") {
      setShowDriverSuggestions(false);
    }
    if (field === "nomorPolisi") {
      setShowPoliceNoSuggestions(false);
    }
  };

  // Handle submit
  const handleSubmit = () => {
    // Validation
    const errors: string[] = [];
    
    if (!form.namaPengemudi.trim()) {
      errors.push("Nama Pengemudi harus diisi!");
    }
    if (!form.nomorPolisi.trim()) {
      errors.push("Nomor Polisi harus diisi!");
    }
    if (!form.productCode) {
      errors.push("Produk harus dipilih!");
    }
    if (totalPalletsNeeded <= 0) {
      errors.push("Qty (Pallet/Karton) harus diisi!");
    }
    if (fefoLocations.length === 0) {
      errors.push("Mohon hitung lokasi FEFO terlebih dahulu!");
    }
    
    if (errors.length > 0) {
      setErrorMessages(errors);
      setShowErrorModal(true);
      return;
    }
    
    setShowConfirmModal(true);
  };

  // Confirm outbound
  const confirmOutbound = () => {
    // Save to history
    saveToHistory('wms_driver_history', form.namaPengemudi, driverHistory, setDriverHistory);
    saveToHistory('wms_police_no_history', form.nomorPolisi, policeNoHistory, setPoliceNoHistory);
    
    // Close confirmation modal
    setShowConfirmModal(false);
    
    // Show success modal
    setShowSuccessModal(true);
    
    // Keep ALL input data for next submission, only reset FEFO locations
    setTimeout(() => {
      setShowSuccessModal(false);
      // Keep: tanggal, namaPengemudi, nomorPolisi, productCode, qty
      // Reset: FEFO locations only
      setFefoLocations([]);
    }, 2000);
  };

  // Calculate FEFO locations
  const calculateFEFO = () => {
    if (!form.productCode || totalPalletsNeeded <= 0) {
      error("Mohon isi produk dan quantity!");
      return;
    }

    const qtyPalletNeeded = totalPalletsNeeded;
    
    // Get available stocks for this product, sorted by expired date (FEFO)
    // Available means: release, hold, or receh (excluding salah-cluster)
    const availableStocks = stockListData
      .filter(
        (stock) =>
          stock.productCode === form.productCode && 
          (stock.status === "release" || stock.status === "hold" || stock.status === "receh")
      )
      .sort((a, b) => new Date(a.expiredDate).getTime() - new Date(b.expiredDate).getTime());

    const locations: FEFOLocation[] = [];
    let remainingQtyPallet = qtyPalletNeeded;

    // Allocate from stocks (FEFO) - gunakan qtyPallet langsung dari stock
    for (const stock of availableStocks) {
      if (remainingQtyPallet <= 0) break;

      // Gunakan qtyPallet (jumlah tumpukan pallet di slot) dari stock data
      const availablePallet = stock.qtyPallet;
      
      if (availablePallet > 0) {
        const allocatePallet = Math.min(remainingQtyPallet, availablePallet);

        const now = new Date();
        const expDate = new Date(stock.expiredDate);
        const daysToExpire = Math.ceil(
          (expDate.getTime() - now.getTime()) / (1000 * 3600 * 24)
        );

        locations.push({
          stockId: stock.id,
          location: `${stock.location.cluster}-${stock.location.lorong}-${stock.location.baris}-${stock.location.level}`,
          bbPallet: stock.bbPallet,
          expiredDate: stock.expiredDate,
          availableQtyPallet: availablePallet,
          allocatedQtyPallet: allocatePallet,
          daysToExpire,
        });

        remainingQtyPallet -= allocatePallet;
      }
    }

    // Check if we have enough stock
    if (remainingQtyPallet > 0) {
      error(
        `Stok tidak cukup! Kurang ${remainingQtyPallet} pallet. Tersedia: ${qtyPalletNeeded - remainingQtyPallet} dari ${qtyPalletNeeded} pallet yang diminta.`
      );
      setFefoLocations([]);
      return;
    }

    setFefoLocations(locations);
    success(
      `✓ Berhasil! Ditemukan ${locations.length} lokasi pengambilan berdasarkan FEFO.`
    );
  };

  // Handle reset
  const handleReset = () => {
    setForm(initialState);
    setFefoLocations([]);
  }

  // --- FILTER TRANSAKSI HARI INI ---
  const todayTransactions = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return outboundHistoryData.filter(item => item.tanggal === todayStr);
  }, []);

  // --- HANDLE EDIT TRANSAKSI ---
  const handleEditClick = (item: typeof outboundHistoryData[0]) => {
    setSelectedItemForAction(item);
    setShowEditConfirmModal(true);
  };

  const confirmEdit = () => {
    if (!selectedItemForAction) return;

    // 1. Kembalikan stock ke lokasi asal (atau In Transit jika lokasi sudah terisi)
    selectedItemForAction.locations.forEach(locationStr => {
      const parts = locationStr.split('-');
      const loc = {
        cluster: parts[0],
        lorong: parts[1],
        baris: parts[2],
        level: parts[3]
      };

      // Cek apakah lokasi sudah terisi oleh produk lain
      const existingStock = stockListData.find(
        s => s.location.cluster === loc.cluster &&
             s.location.lorong === loc.lorong &&
             s.location.baris === loc.baris &&
             s.location.level === loc.level
      );

      // Ambil data produk
      const productData = getProductByCode(selectedItemForAction.productCode);

      const qtyPerCarton = productData?.qtyPerCarton || 1;
      const qtyCarton = productData?.qtyPerPallet || 0;

      if (existingStock) {
        // Lokasi sudah terisi, pindahkan ke In Transit (Cluster C)
        const inTransitLoc = findAvailableInTransitLocation();
        if (inTransitLoc) {
          stockListData.push({
            id: `STK-RETURN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            productCode: selectedItemForAction.productCode,
            productName: selectedItemForAction.productName,
            location: inTransitLoc,
            qtyPallet: 1,
            qtyCarton: qtyCarton,
            qtyPcs: qtyCarton * qtyPerCarton,
            bbPallet: "RETURNED",
            batchNumber: "RETURNED",
            lotNumber: "RETURNED",
            expiredDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            inboundDate: new Date().toISOString().slice(0, 10),
            status: "release"
          });
        }
      } else {
        // Lokasi kosong, kembalikan ke lokasi asal
        stockListData.push({
          id: `STK-RETURN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          productCode: selectedItemForAction.productCode,
          productName: selectedItemForAction.productName,
          location: loc,
          qtyPallet: 1,
          qtyCarton: qtyCarton,
          qtyPcs: qtyCarton * qtyPerCarton,
          bbPallet: "RETURNED",
          batchNumber: "RETURNED",
          lotNumber: "RETURNED",
          expiredDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          inboundDate: new Date().toISOString().slice(0, 10),
          status: "release"
        });
      }
    });

    // 2. Hapus dari history
    const historyIndex = outboundHistoryData.findIndex(h => h.id === selectedItemForAction.id);
    if (historyIndex !== -1) {
      outboundHistoryData.splice(historyIndex, 1);
    }

    // 3. Load data ke form untuk di-edit
    const selectedProd = getProductByCode(selectedItemForAction.productCode);
    const qtyPerPallet = selectedProd?.qtyPerPallet || 1;
    const totalCarton = selectedItemForAction.qtyCarton;
    const fullPallets = Math.floor(totalCarton / qtyPerPallet);
    const remainingCartons = totalCarton % qtyPerPallet;

    setForm({
      tanggal: selectedItemForAction.tanggal,
      namaPengemudi: selectedItemForAction.namaPengemudi,
      nomorPolisi: selectedItemForAction.nomorPolisi,
      productCode: selectedItemForAction.productCode,
      qtyPalletInput: String(fullPallets),
      qtyCartonInput: String(remainingCartons),
    });

    // 4. Reset state
    setShowEditConfirmModal(false);
    setSelectedItemForAction(null);
    setFefoLocations([]);

    success(`Data transaksi ${selectedItemForAction.id} telah dimuat ke form. Stock dikembalikan. Silakan edit dan submit ulang.`);
  };

  // Helper: Cari lokasi In Transit yang kosong
  const findAvailableInTransitLocation = () => {
    // In Transit area di Cluster C, Lorong L11-L12
    for (let lorong = 11; lorong <= 12; lorong++) {
      for (let baris = 1; baris <= 9; baris++) {
        for (let pallet = 1; pallet <= 3; pallet++) {
          const loc = {
            cluster: "C",
            lorong: `L${lorong}`,
            baris: `B${baris}`,
            level: `P${pallet}`
          };
          const exists = stockListData.some(
            s => s.location.cluster === loc.cluster &&
                 s.location.lorong === loc.lorong &&
                 s.location.baris === loc.baris &&
                 s.location.level === loc.level
          );
          if (!exists) return loc;
        }
      }
    }
    return null;
  };

  // --- HANDLE BATAL TRANSAKSI ---
  const handleBatalClick = (item: typeof outboundHistoryData[0]) => {
    setSelectedItemForAction(item);
    setShowBatalConfirmModal(true);
  };

  const confirmBatal = () => {
    if (!selectedItemForAction) return;

    // 1. Kembalikan stock ke lokasi asal (atau In Transit jika lokasi sudah terisi)
    selectedItemForAction.locations.forEach(locationStr => {
      const parts = locationStr.split('-');
      const loc = {
        cluster: parts[0],
        lorong: parts[1],
        baris: parts[2],
        level: parts[3]
      };

      // Cek apakah lokasi sudah terisi oleh produk lain
      const existingStock = stockListData.find(
        s => s.location.cluster === loc.cluster &&
             s.location.lorong === loc.lorong &&
             s.location.baris === loc.baris &&
             s.location.level === loc.level
      );

      // Ambil data produk
      const productData = getProductByCode(selectedItemForAction.productCode);
      const qtyPerCarton = productData?.qtyPerCarton || 1;
      const qtyCarton = productData?.qtyPerPallet || 0;

      if (existingStock) {
        // Lokasi sudah terisi, pindahkan ke In Transit
        const inTransitLoc = findAvailableInTransitLocation();
        if (inTransitLoc) {
          stockListData.push({
            id: `STK-RETURN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            productCode: selectedItemForAction.productCode,
            productName: selectedItemForAction.productName,
            location: inTransitLoc,
            qtyPallet: 1,
            qtyCarton: qtyCarton,
            qtyPcs: qtyCarton * qtyPerCarton,
            bbPallet: "RETURNED",
            batchNumber: "RETURNED",
            lotNumber: "RETURNED",
            expiredDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            inboundDate: new Date().toISOString().slice(0, 10),
            status: "release"
          });
        }
      } else {
        // Lokasi kosong, kembalikan ke lokasi asal
        stockListData.push({
          id: `STK-RETURN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          productCode: selectedItemForAction.productCode,
          productName: selectedItemForAction.productName,
          location: loc,
          qtyPallet: 1,
          qtyCarton: qtyCarton,
          qtyPcs: qtyCarton * qtyPerCarton,
          bbPallet: "RETURNED",
          batchNumber: "RETURNED",
          lotNumber: "RETURNED",
          expiredDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          inboundDate: new Date().toISOString().slice(0, 10),
          status: "release"
        });
      }
    });

    // 2. Hapus dari history
    const historyIndex = outboundHistoryData.findIndex(h => h.id === selectedItemForAction.id);
    if (historyIndex !== -1) {
      outboundHistoryData.splice(historyIndex, 1);
    }

    // 3. Reset state
    setShowBatalConfirmModal(false);
    setSelectedItemForAction(null);

    success(`Transaksi ${selectedItemForAction.id} telah dibatalkan. Stock telah dikembalikan.`);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 to-red-100 p-4 md:p-8">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
              <TruckIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Outbound</h1>
              <p className="text-sm text-gray-500">Pengambilan barang dengan aturan FEFO.</p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-6 mb-8">
            {/* Nama Driver & Nomor Polisi */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nama Driver */}
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  👤 Nama Pengemudi
                </label>
                <input
                  type="text"
                  value={form.namaPengemudi}
                  onChange={(e) => handleChange("namaPengemudi", e.target.value)}
                  onFocus={() => {
                    if (driverHistory.length > 0) {
                      setShowDriverSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowDriverSuggestions(false), 300);
                  }}
                  placeholder="Nama pengemudi"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all"
                />
                {showDriverSuggestions && driverHistory.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {driverHistory.map((name, idx) => (
                      <div
                        key={idx}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleChange("namaPengemudi", name);
                          setShowDriverSuggestions(false);
                        }}
                        className="px-4 py-2 hover:bg-orange-50 cursor-pointer text-sm"
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Nomor Polisi */}
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🚚 Nomor Polisi
                </label>
                <input
                  type="text"
                  value={form.nomorPolisi}
                  onChange={(e) => handleChange("nomorPolisi", e.target.value.toUpperCase())}
                  onFocus={() => {
                    if (policeNoHistory.length > 0) {
                      setShowPoliceNoSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowPoliceNoSuggestions(false), 300);
                  }}
                  placeholder="B 1234 XYZ"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all uppercase"
                />
                {showPoliceNoSuggestions && policeNoHistory.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {policeNoHistory.map((policeNo, idx) => (
                      <div
                        key={idx}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleChange("nomorPolisi", policeNo);
                          setShowPoliceNoSuggestions(false);
                        }}
                        className="px-4 py-2 hover:bg-orange-50 cursor-pointer text-sm font-mono"
                      >
                        {policeNo}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tanggal & Produk */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tanggal */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📅 Tanggal
                </label>
                <input
                  type="date"
                  value={form.tanggal}
                  onChange={(e) => handleChange("tanggal", e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all"
                  max={today}
                  min={today}
                />
              </div>

              {/* Produk */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📦 Produk
                </label>
                <select
                  value={form.productCode}
                  onChange={(e) => handleChange("productCode", e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all"
                >
                  <option value="">Pilih produk</option>
                  {productMasterData.map((product) => (
                    <option key={product.id} value={product.productCode}>
                      {product.productName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Qty Input */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Qty Pallet Utuh */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📊 Qty Pallet Utuh
                </label>
                <input
                  type="number"
                  value={form.qtyPalletInput}
                  onChange={(e) => handleChange("qtyPalletInput", e.target.value)}
                  min="0"
                  placeholder="Jumlah pallet utuh"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all"
                />
                {selectedProduct && (
                  <p className="text-xs text-gray-500 mt-1">
                    {qtyPerPalletStd} karton per pallet
                  </p>
                )}
              </div>

              {/* Qty Karton Sisa */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📦 Qty Karton Sisa
                </label>
                <input
                  type="number"
                  value={form.qtyCartonInput}
                  onChange={(e) => handleChange("qtyCartonInput", e.target.value)}
                  min="0"
                  placeholder="Jumlah karton sisa"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all"
                />
                {selectedProduct && form.qtyCartonInput && Number(form.qtyCartonInput) > 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ Karton sisa akan diambil dari pallet receh
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* FEFO Info Box */}
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-emerald-900 mb-1">
                  📍 Lokasi Pengambilan (FEFO - First Expired First Out):
                </h3>
                <p className="text-sm text-emerald-700">
                  💡 Pilih produk dan kuantitas terlebih dahulu untuk melihat rekomendasi lokasi pengambilan berdasarkan FEFO.
                </p>
              </div>
            </div>
          </div>

          {/* Ringkasan */}
          {form.productCode && (totalCartons > 0) && (
            <div className="bg-slate-50 border-2 border-slate-300 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-slate-900 mb-3">📋 Ringkasan:</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Produk:</span>
                  <span className="font-semibold text-slate-900">
                    {selectedProduct?.productName || "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Input Pallet Utuh:</span>
                  <span className="font-semibold text-slate-900">
                    {form.qtyPalletInput || "0"} pallet
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Input Karton Sisa:</span>
                  <span className="font-semibold text-slate-900">
                    {form.qtyCartonInput || "0"} karton
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-300">
                  <span className="text-slate-600">Total Karton:</span>
                  <span className="font-bold text-slate-900">
                    {totalCartons} karton
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Pallet Penuh:</span>
                  <span className="font-bold text-slate-900">
                    {totalPallets} pallet
                  </span>
                </div>
                {isReceh && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Pallet Receh:</span>
                    <span className="font-bold text-amber-600">
                      1 pallet ({remainingCartons} karton)
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-slate-300">
                  <span className="text-slate-600">Total Lokasi Dibutuhkan:</span>
                  <span className="font-bold text-orange-600 text-lg">
                    {totalPalletsNeeded} lokasi
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-300">
                  <span className="text-slate-600">Total Pcs Diambil:</span>
                  <span className="font-bold text-slate-900 text-lg">
                    {totalPcs.toLocaleString()} pcs
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-300">
                <p className="text-xs text-blue-700 font-medium">
                  ℹ️ Catatan: Sistem akan mencari {totalPalletsNeeded} lokasi berdasarkan FEFO.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={calculateFEFO}
              type="button"
              className="flex-1 bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              🔍 Hitung Lokasi FEFO
            </button>
            <button
              onClick={handleSubmit}
              type="button"
              className="flex-1 bg-green-500 text-white py-3 rounded-xl font-semibold hover:bg-green-600 transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              ✓ Submit Outbound
            </button>
            <button
              onClick={handleReset}
              type="button"
              className="px-6 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
            >
              🔄 Reset
            </button>
          </div>

          {/* FEFO Locations Table */}
          {fefoLocations.length > 0 && (
            <div className="mt-8 border-t-2 border-gray-200 pt-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                📍 Lokasi Pengambilan (FEFO)
              </h2>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-orange-500 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-bold">No</th>
                      <th className="px-4 py-3 text-left text-sm font-bold">Lokasi</th>
                      <th className="px-4 py-3 text-left text-sm font-bold">BB Produk</th>
                      <th className="px-4 py-3 text-left text-sm font-bold">Qty Ambil (Pallet)</th>
                      <th className="px-4 py-3 text-left text-sm font-bold">Expired Date</th>
                      <th className="px-4 py-3 text-center text-sm font-bold">QR Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fefoLocations.map((loc, index) => (
                      <tr
                        key={index}
                        className={`border-b border-gray-100 ${
                          loc.daysToExpire < 90
                            ? "bg-red-50"
                            : loc.daysToExpire < 180
                            ? "bg-yellow-50"
                            : "bg-white"
                        }`}
                      >
                        <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-semibold">
                            {loc.location}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700">
                          {Array.isArray(loc.bbPallet) 
                            ? loc.bbPallet.join(", ") 
                            : loc.bbPallet}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-bold text-orange-700">
                            {loc.allocatedQtyPallet} pallet
                          </div>
                          <div className="text-xs text-gray-500">
                            (dari {loc.availableQtyPallet} pallet tersedia)
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-700">
                            {new Date(loc.expiredDate).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                          <div
                            className={`text-xs font-semibold ${
                              loc.daysToExpire < 90
                                ? "text-red-600"
                                : loc.daysToExpire < 180
                                ? "text-yellow-600"
                                : "text-green-600"
                            }`}
                          >
                            {(() => {
                              const days = loc.daysToExpire;
                              const months = Math.floor(days / 30);
                              const remainingDays = days % 30;
                              if (months === 0) {
                                return `${days} hari`;
                              } else if (remainingDays === 0) {
                                return `${months} bulan`;
                              } else {
                                return `${months} bulan ${remainingDays} hari`;
                              }
                            })()}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div 
                            className="flex flex-col items-center justify-center bg-white p-2 rounded-lg border-2 border-gray-300 cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-all shadow-sm"
                            onClick={() => {
                              const bbData = Array.isArray(loc.bbPallet) ? loc.bbPallet.join(', ') : loc.bbPallet;
                              setScannedBarcodeData({
                                location: loc.location,
                                bbPallet: bbData
                              });
                              setShowBarcodeInfoModal(true);
                            }}
                          >
                            <QRCodeSVG
                              value={Array.isArray(loc.bbPallet) ? loc.bbPallet.join(',') : loc.bbPallet}
                              size={80}
                              level="H"
                              includeMargin={false}
                            />
                            <p className="text-xs text-blue-600 mt-1 font-semibold">
                              🔍 Klik untuk info
                            </p>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <p className="text-green-700 font-semibold">
                  ✓ Lokasi pengambilan sudah di-sort berdasarkan FEFO (First Expired First Out)
                </p>
                <p className="text-green-600 text-sm mt-1">
                  Ambil barang sesuai urutan untuk memastikan barang dengan expired date terdekat keluar terlebih dahulu.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Modal */}
      {showErrorModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowErrorModal(false)}
        >
          <div 
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
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
      {showConfirmModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowConfirmModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Konfirmasi Pengambilan Barang
              </h2>
              
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-6">
                <p className="text-amber-800 font-medium">
                  ⚠️ Pastikan Anda akan mengambil barang dari lokasi-lokasi berikut sesuai urutan FEFO:
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Pengemudi:</p>
                    <p className="font-semibold text-gray-900">{form.namaPengemudi}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Nomor Polisi:</p>
                    <p className="font-semibold text-gray-900">{form.nomorPolisi}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Produk:</p>
                    <p className="font-semibold text-gray-900">{selectedProduct?.productName}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Qty:</p>
                    <p className="font-semibold text-gray-900">{totalCartons} karton / {totalPcs.toLocaleString()} pcs</p>
                  </div>
                </div>

                <div className="border-t-2 border-gray-200 pt-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Daftar Lokasi Pengambilan:</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {fefoLocations.map((loc, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-gray-900">{index + 1}. {loc.location}</p>
                          <p className="text-sm text-gray-600">
                            BB: {Array.isArray(loc.bbPallet) ? loc.bbPallet.join(", ") : loc.bbPallet}
                          </p>
                          <p className="text-xs text-gray-500">
                            Exp: {loc.expiredDate} ({loc.daysToExpire} hari)
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-orange-600">{loc.allocatedQtyPallet} pallet</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={confirmOutbound}
                  className="flex-1 bg-green-500 text-white py-3 rounded-xl font-semibold hover:bg-green-600 transition-colors"
                >
                  Ya, Konfirmasi Pengambilan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowSuccessModal(false)}
        >
          <div 
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-linear-to-r from-orange-500 to-red-600 p-6">
              <div className="flex flex-col items-center text-center">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">
                  Outbound Berhasil!
                </h3>
                <p className="text-orange-100 text-sm">
                  Data pengambilan barang telah dicatat
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
                  <span className="text-gray-600">Nomor Polisi:</span>
                  <span className="font-semibold text-gray-800">{form.nomorPolisi}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Produk:</span>
                  <span className="font-semibold text-gray-800">{selectedProduct?.productName}</span>
                </div>
              </div>
              <p className="text-sm text-gray-700 font-semibold mb-3">
                Lokasi Pengambilan (FEFO):
              </p>
              <div className="mb-4 space-y-2 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3">
                {fefoLocations.map((loc, idx) => (
                  <div key={idx} className="flex justify-between rounded-md p-2 bg-orange-100">
                    <span className="font-semibold text-gray-800">
                      {loc.location}
                    </span>
                    <span className="text-sm font-bold text-orange-700">
                      {loc.allocatedQtyPallet} Pallet
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

      {/* Barcode Info Modal */}
      {showBarcodeInfoModal && scannedBarcodeData && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowBarcodeInfoModal(false);
            setScannedBarcodeData(null);
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                📦 Informasi Lokasi
              </h2>
              <p className="text-sm text-gray-500">
                Hasil scan QR Code
              </p>
            </div>

            {/* QR Code Section - Dipindahkan ke konten */}
            <div className="flex justify-center mb-4">
              <QRCodeSVG 
                value={scannedBarcodeData.bbPallet}
                size={150} 
                level="H"
              />
            </div>

            <div className="space-y-4">
              {/* Parse location */}
              {(() => {
                const [cluster, lorong, baris, level] = scannedBarcodeData.location.split('-');
                return (
                  <>
                    <div className="bg-linear-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Lokasi Detail:</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <p className="text-xs text-gray-500 mb-1">Cluster</p>
                          <p className="text-2xl font-bold text-blue-600">{cluster}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <p className="text-xs text-gray-500 mb-1">Lorong</p>
                          <p className="text-2xl font-bold text-blue-600">{lorong}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <p className="text-xs text-gray-500 mb-1">Baris</p>
                          <p className="text-2xl font-bold text-blue-600">{baris}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <p className="text-xs text-gray-500 mb-1">Level</p>
                          <p className="text-2xl font-bold text-blue-600">{level}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-linear-to-r from-amber-50 to-orange-50 rounded-xl p-4 border-2 border-amber-200">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">BB Pallet:</h3>
                      <p className="text-lg font-bold text-amber-700 font-mono bg-white rounded-lg p-3 text-center">
                        {scannedBarcodeData.bbPallet}
                      </p>
                    </div>

                    <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                      <p className="text-sm text-green-700 text-center">
                        ✓ Lokasi telah teridentifikasi
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>

            <button
              onClick={() => {
                setShowBarcodeInfoModal(false);
                setScannedBarcodeData(null);
              }}
              className="w-full mt-6 bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Tabel Transaksi Hari Ini */}
      <div className="mt-8 bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-red-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">📋</span>
            Transaksi Hari Ini
          </h2>
          <p className="text-orange-100 text-sm mt-1">
            {new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        {todayTransactions.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-500 font-medium">Belum ada transaksi outbound hari ini</p>
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
                    <th className="px-2 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Pallet</th>
                    <th className="px-2 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Carton</th>
                    <th className="px-2 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {todayTransactions.map((item) => (
                    <tr key={item.id} className="hover:bg-orange-50 transition-colors">
                      <td className="px-3 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-900 max-w-[120px] truncate">
                        {item.namaPengemudi}
                      </td>
                      <td className="px-3 py-3 text-sm">
                        <div className="font-medium text-gray-900">{item.productCode}</div>
                        <div className="text-gray-500 text-xs truncate max-w-[150px]">{item.productName}</div>
                      </td>
                      <td className="px-2 py-3 text-sm text-center font-bold text-green-600">
                        {item.qtyPallet}
                      </td>
                      <td className="px-2 py-3 text-sm text-center font-bold text-blue-600">
                        {item.qtyCarton}
                      </td>
                      <td className="px-2 py-3 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          item.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {item.status === "completed" ? "✓" : "⚠"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedHistoryItem(item);
                              setShowHistoryDetailModal(true);
                            }}
                            className="px-2 py-1 bg-orange-500 text-white text-xs font-semibold rounded hover:bg-orange-600 transition-colors"
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

      {/* Modal Detail Transaksi Outbound */}
      {showHistoryDetailModal && selectedHistoryItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="sticky top-0 bg-linear-to-r from-orange-500 to-red-600 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">📋 Detail Transaksi Outbound</h2>
              <button
                onClick={() => setShowHistoryDetailModal(false)}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6 space-y-6">
              {/* Informasi Pengiriman */}
              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200">
                <h3 className="font-bold text-orange-900 mb-3 flex items-center gap-2">
                  <span className="text-lg">🚚</span> Informasi Pengiriman
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Tanggal:</span>
                    <p className="font-semibold text-gray-900">
                      {new Date(selectedHistoryItem.tanggal).toLocaleDateString("id-ID", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Nama Pengemudi:</span>
                    <p className="font-semibold text-gray-900">{selectedHistoryItem.namaPengemudi}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">No. Polisi:</span>
                    <p className="font-semibold text-gray-900">{selectedHistoryItem.nomorPolisi}</p>
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
                    <p className="font-semibold text-gray-900">{selectedHistoryItem.productName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Kode Produk:</span>
                    <p className="font-semibold text-gray-900">{selectedHistoryItem.productCode}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Total PCS:</span>
                    <p className="font-semibold text-gray-900">{selectedHistoryItem.totalPcs.toLocaleString()} pcs</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Qty Pallet:</span>
                    <p className="font-semibold text-gray-900">{selectedHistoryItem.qtyPallet} pallet</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Qty Carton:</span>
                    <p className="font-semibold text-gray-900">{selectedHistoryItem.qtyCarton} carton</p>
                  </div>
                </div>
              </div>

              {/* Lokasi Pengambilan FEFO dengan QR Code */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                <h3 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                  <span className="text-lg">📍</span> Lokasi Pengambilan FEFO
                </h3>
                <div className="space-y-3">
                  {selectedHistoryItem.locations.map((location, idx) => {
                    // Ambil stock data untuk mendapatkan BB Produk
                    const stockItem = stockListData.find(
                      (item) => `${item.location.cluster}-${item.location.lorong}-${item.location.baris}-${item.location.level}` === location
                    );
                    const bbProduk = stockItem ? (Array.isArray(stockItem.bbPallet) ? stockItem.bbPallet.join(', ') : stockItem.bbPallet) : '-';
                    
                    return (
                      <div key={idx} className="bg-white rounded-lg p-3 border border-purple-200">
                        <div className="flex items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="inline-block px-2 py-1 bg-purple-600 text-white rounded text-xs font-bold">
                                #{idx + 1}
                              </span>
                              <span className="font-semibold text-gray-900 text-lg">{location}</span>
                            </div>
                            <div className="text-sm space-y-1">
                              <div>
                                <span className="text-gray-600">BB Produk:</span>
                                <span className="font-mono font-semibold text-gray-900 ml-2">{bbProduk}</span>
                              </div>
                              {stockItem && (
                                <div>
                                  <span className="text-gray-600">Expired:</span>
                                  <span className="font-semibold text-gray-900 ml-2">
                                    {new Date(stockItem.expiredDate).toLocaleDateString("id-ID", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <QRCodeSVG
                              value={bbProduk}
                              size={100}
                              level="H"
                              includeMargin={false}
                            />
                            <p className="text-xs text-gray-600 mt-2 font-semibold">QR BB Produk</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Waktu Input */}
              <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-lg">⏰</span> Waktu Input
                </h3>
                <div className="text-sm">
                  <span className="text-gray-600">Dibuat pada:</span>
                  <p className="font-semibold text-gray-900">
                    {new Date(selectedHistoryItem.createdAt).toLocaleString("id-ID", {
                      dateStyle: "full",
                      timeStyle: "medium",
                    })}
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-4 border border-slate-200">
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="text-lg">✓</span> Status Transaksi
                </h3>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex px-4 py-2 text-sm font-bold rounded-lg ${
                    selectedHistoryItem.status === "completed"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}>
                    {selectedHistoryItem.status === "completed" ? "✅ Selesai" : "⚠️ Partial"}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowHistoryDetailModal(false)}
                className="px-6 py-2.5 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors"
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
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white">✏️ Edit Transaksi</h2>
            </div>
            <div className="p-6">
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-4">
                <p className="text-amber-800 font-medium text-sm">
                  ⚠️ Tindakan ini akan:
                </p>
                <ul className="text-amber-700 text-sm mt-2 space-y-1 list-disc list-inside">
                  <li>Membatalkan transaksi <strong>{selectedItemForAction.id}</strong></li>
                  <li>Mengembalikan stock ke lokasi asal (atau In Transit jika lokasi sudah terisi)</li>
                  <li>Memuat data ke form untuk di-edit ulang</li>
                </ul>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-600 mb-2">Detail transaksi:</p>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Produk:</span>
                    <span className="font-semibold text-gray-900">{selectedItemForAction.productCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Qty:</span>
                    <span className="font-semibold text-gray-900">{selectedItemForAction.qtyPallet} pallet, {selectedItemForAction.qtyCarton} karton</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Lokasi:</span>
                    <span className="font-semibold text-gray-900 text-xs">{selectedItemForAction.locations.join(', ')}</span>
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
            <div className="bg-gradient-to-r from-red-500 to-pink-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white">❌ Batalkan Transaksi</h2>
            </div>
            <div className="p-6">
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4">
                <p className="text-red-800 font-medium text-sm">
                  ⚠️ Tindakan ini akan:
                </p>
                <ul className="text-red-700 text-sm mt-2 space-y-1 list-disc list-inside">
                  <li>Membatalkan transaksi <strong>{selectedItemForAction.id}</strong></li>
                  <li>Mengembalikan stock ke lokasi asal (atau In Transit jika lokasi sudah terisi)</li>
                  <li>Menghapus record dari history</li>
                </ul>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-600 mb-2">Detail transaksi:</p>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Produk:</span>
                    <span className="font-semibold text-gray-900">{selectedItemForAction.productCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Qty:</span>
                    <span className="font-semibold text-gray-900">{selectedItemForAction.qtyPallet} pallet, {selectedItemForAction.qtyCarton} karton</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Lokasi:</span>
                    <span className="font-semibold text-gray-900 text-xs">{selectedItemForAction.locations.join(', ')}</span>
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
  );
}