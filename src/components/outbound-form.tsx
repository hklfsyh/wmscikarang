"use client";

import { useState, useMemo, useEffect } from "react";
import { TruckIcon, MapPin, XCircle } from "lucide-react";
import { useToast, ToastContainer } from "./toast";
import { QRCodeSVG } from "qrcode.react";
import {
  getFEFOAllocationAction,
  submitOutboundAction,
  cancelOutboundAction,
} from "@/app/outbound/actions";
import { useRouter } from "next/navigation";

// Type untuk produk dari database
interface Product {
  id: string;
  product_code: string;
  product_name: string;
  qty_per_carton: number;
  qty_carton_per_pallet: number;
  warehouse_id: string;
}

interface FEFOLocation {
  stockId: string;
  location: string;
  cluster: string;
  lorong: number;
  baris: number;
  level: number;
  bbProduk: string;
  bbPallet: string | string[];
  expiredDate: string;
  availableQtyPallet: number;
  allocatedQtyPallet: number;
  daysToExpire: number;
  qtyBefore: number;
  qtyTaken: number;
  qtyAfter: number;
  fefo_status: string; // 'release' or 'hold'
  status: string; // 'normal', 'receh', 'salah-cluster', etc
  is_receh: boolean;
  is_fefo_violation: boolean; // true if picking hold while release available
}

// Type untuk outbound history (untuk fitur Edit/Batal yang belum aktif)
interface OutboundHistory {
  id: string;
  transaction_code: string;
  product_id: string;
  qty_carton: number;
  driver_name: string;
  vehicle_number: string;
  departure_time: string;
  locations: any[];
  created_at: string;
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

// Props interface untuk komponen
interface OutboundFormProps {
  products: Product[];
  warehouseId: string;
  history?: OutboundHistory[];
  productHomes: any[]; // CRITICAL: For validation
}

export function OutboundForm({
  products,
  warehouseId,
  history = [],
  productHomes,
}: OutboundFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const [form, setForm] = useState<OutboundFormState>(initialState);
  const [fefoLocations, setFefoLocations] = useState<FEFOLocation[]>([]);
  const { toasts, removeToast, success, error } = useToast();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showBarcodeInfoModal, setShowBarcodeInfoModal] = useState(false);
  const [scannedBarcodeData, setScannedBarcodeData] = useState<{
    location: string;
    bbPallet: string;
  } | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);

  // --- INPUT HISTORY/AUTOCOMPLETE STATE ---
  const [driverHistory, setDriverHistory] = useState<string[]>([]);
  const [policeNoHistory, setPoliceNoHistory] = useState<string[]>([]);
  const [showDriverSuggestions, setShowDriverSuggestions] = useState(false);
  const [showPoliceNoSuggestions, setShowPoliceNoSuggestions] = useState(false);

  // --- HISTORY DETAIL MODAL STATE ---
  const [showHistoryDetailModal, setShowHistoryDetailModal] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] =
    useState<OutboundHistory | null>(null);

  // --- EDIT & BATAL MODAL STATE ---
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false);
  const [showBatalConfirmModal, setShowBatalConfirmModal] = useState(false);
  const [selectedItemForAction, setSelectedItemForAction] =
    useState<OutboundHistory | null>(null);

  // Gunakan products dari props (sudah difilter oleh warehouse di server)
  const filteredProducts = products;

  // Load history from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedDrivers = localStorage.getItem("wms_driver_history");
      const savedPoliceNos = localStorage.getItem("wms_police_no_history");

      if (savedDrivers) setDriverHistory(JSON.parse(savedDrivers));
      if (savedPoliceNos) setPoliceNoHistory(JSON.parse(savedPoliceNos));
    }
  }, []);

  // Save to history helper
  const saveToHistory = (
    key: string,
    value: string,
    currentHistory: string[],
    setHistory: (val: string[]) => void
  ) => {
    if (!value.trim()) return;

    const updated = [value, ...currentHistory.filter((v) => v !== value)].slice(
      0,
      10
    ); // Keep last 10
    setHistory(updated);

    if (typeof window !== "undefined") {
      localStorage.setItem(key, JSON.stringify(updated));
    }
  };
  // --- AKHIR INPUT HISTORY ---

  // Get selected product data dari products (database)
  const selectedProduct = form.productCode
    ? products.find((p) => p.product_code === form.productCode)
    : null;

  // --- LOGIKA QTY DINAMIS (CALCULATED VALUES) ---
  const qtyPerPalletStd = selectedProduct?.qty_carton_per_pallet || 0;

  const { totalPallets, remainingCartons, totalCartons } = useMemo(() => {
    const palletInput = Number(form.qtyPalletInput) || 0;
    const cartonInput = Number(form.qtyCartonInput) || 0;

    // Total Karton = (Input Pallet Utuh * Std Qty/Pallet) + Input Karton Sisa
    const totalCartons = palletInput * qtyPerPalletStd + cartonInput;

    if (qtyPerPalletStd === 0) {
      return {
        totalPallets: 0,
        remainingCartons: cartonInput,
        totalCartons: cartonInput,
      };
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
  const totalPcs =
    selectedProduct && totalCartons
      ? totalCartons * selectedProduct.qty_per_carton
      : 0;
  // --- AKHIR LOGIKA QTY DINAMIS ---

  // Handle field change
  const handleChange = (field: keyof OutboundFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));

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
    // Proteksi: Jika sedang submit, tampilkan error dan return
    if (isSubmitting) {
      error("Proses sedang berjalan. Mohon tunggu, proses sebelumnya masih belum selesai.");
      return;
    }

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
    // CRITICAL: Validasi produk HARUS punya product home
    const selectedProduct = products.find(p => p.product_code === form.productCode);
    if (selectedProduct) {
      const hasProductHome = productHomes.some((h: any) => 
        h.product_id === selectedProduct.id && h.is_active === true
      );
      if (!hasProductHome) {
        errors.push(`Produk "${selectedProduct.product_name}" belum memiliki Product Home! Silakan hubungi Admin Cabang untuk menambahkan Product Home terlebih dahulu di Master Data Stock.`);
      }
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

    // Langsung buka modal konfirmasi (user mengikuti rekomendasi sistem)
    setShowConfirmModal(true);
  };

  // Confirm outbound
  const confirmOutbound = async () => {
    if (!selectedProduct || fefoLocations.length === 0) return;

    setIsSubmitting(true);

    const formData = {
      warehouse_id: warehouseId, // Ambil dari props
      product_id: selectedProduct.id, // UUID dari database
      total_qty_carton: totalCartons,
      namaPengemudi: form.namaPengemudi,
      nomorPolisi: form.nomorPolisi,
    };

    try {
      const result = await submitOutboundAction(formData, fefoLocations);

      if (result.success) {
        setShowConfirmModal(false);
        setShowSuccessModal(true);

        // Save to autocomplete history
        saveToHistory(
          "wms_driver_history",
          form.namaPengemudi,
          driverHistory,
          setDriverHistory
        );
        saveToHistory(
          "wms_police_no_history",
          form.nomorPolisi,
          policeNoHistory,
          setPoliceNoHistory
        );

        // JANGAN reset form (data retention) - hanya reset FEFO locations dan modal
        setTimeout(() => {
          setShowSuccessModal(false);
          setFefoLocations([]);
          setIsSubmitting(false);
          router.refresh(); // Refresh data dari server
        }, 2000);
      } else {
        error(result.message || "Gagal memproses outbound.");
        setIsSubmitting(false);
      }
    } catch (err: any) {
      error("Terjadi kesalahan sistem saat submit.");
      setIsSubmitting(false);
    }
  };

  // Calculate FEFO locations
  const calculateFEFO = async () => {
    if (!form.productCode || totalCartons <= 0 || !selectedProduct) {
      error("Mohon pilih produk dan isi kuantitas terlebih dahulu!");
      return;
    }

    try {
      // Ambil data dari server (Real Database)
      const result = await getFEFOAllocationAction(
        warehouseId, // Warehouse ID dari props
        selectedProduct.id, // UUID product dari database
        totalCartons
      );

      if (result.success && result.allocation) {
        // Mapping hasil server dengan semua field yang diperlukan backend + UI
        const mappedAllocation = result.allocation.map((loc) => ({
          stockId: loc.stockId,
          location: loc.location,
          cluster: loc.cluster,
          lorong: loc.lorong,
          baris: loc.baris,
          level: loc.level,
          bbProduk: loc.bbProduk,
          expiredDate: loc.expiredDate,
          qtyBefore: loc.qtyBefore,
          qtyTaken: loc.qtyTaken,
          qtyAfter: loc.qtyAfter,
          daysToExpire: loc.daysToExpire,
          fefo_status: loc.fefo_status,
          status: loc.status,
          is_receh: loc.is_receh,
          is_fefo_violation: loc.is_fefo_violation,
          // Field tambahan untuk UI compatibility
          bbPallet: loc.bbProduk,
          availableQtyPallet: 1,
          allocatedQtyPallet: 1,
        }));

        setFefoLocations(mappedAllocation);
        
        success(
          `✓ Berhasil! Ditemukan ${mappedAllocation.length} lokasi berdasarkan FEFO.`
        );
      } else {
        setFefoLocations([]);
        error(result.error || "Gagal menghitung FEFO.");
      }
    } catch (err: any) {
      error("Sistem error saat menghitung FEFO.");
    }
  };

  // Handle reset
  const handleReset = () => {
    setForm(initialState);
    setFefoLocations([]);
  };

  // --- FILTER TRANSAKSI HARI INI ---
  // Menggunakan data history dari props (sudah difilter hari ini di server)
  const todayTransactions = history;

  // --- HANDLE EDIT TRANSAKSI ---
  const handleEditClick = (item: any) => {
    setSelectedItemForAction(item);
    setShowEditConfirmModal(true);
  };

  const confirmEdit = async () => {
    if (!selectedItemForAction) return;

    setIsSubmitting(true);

    try {
      // 1. Cancel outbound (soft delete + stock reversal)
      const result = await cancelOutboundAction(selectedItemForAction.id);

      if (!result.success) {
        error(result.message || "Gagal membatalkan transaksi untuk edit.");
        setIsSubmitting(false);
        setShowEditConfirmModal(false);
        return;
      }

      // 2. Populate form dengan data transaksi yang dibatalkan
      const selectedProd = products.find(p => p.id === selectedItemForAction.product_id);
      const qtyPerPallet = selectedProd?.qty_carton_per_pallet || 1;
      const totalCarton = selectedItemForAction.qty_carton;
      const fullPallets = Math.floor(totalCarton / qtyPerPallet);
      const remainingCartons = totalCarton % qtyPerPallet;

      setForm({
        tanggal: selectedItemForAction.departure_time.slice(0, 10),
        namaPengemudi: selectedItemForAction.driver_name,
        nomorPolisi: selectedItemForAction.vehicle_number,
        productCode: selectedProd?.product_code || '',
        qtyPalletInput: String(fullPallets),
        qtyCartonInput: String(remainingCartons),
      });

      // 3. Reset state
      setShowEditConfirmModal(false);
      setSelectedItemForAction(null);
      setFefoLocations([]);
      setIsSubmitting(false);

      success(
        `✓ Transaksi ${selectedItemForAction.transaction_code} dibatalkan. Data dimuat ke form. Silakan edit dan submit ulang.`
      );

      // 4. Refresh data
      router.refresh();
    } catch (err: any) {
      error("Terjadi kesalahan sistem saat edit transaksi.");
      setIsSubmitting(false);
    }
  };

  // --- HANDLE BATAL TRANSAKSI ---
  const handleBatalClick = (item: any) => {
    setSelectedItemForAction(item);
    setShowBatalConfirmModal(true);
  };

  const confirmBatal = async () => {
    if (!selectedItemForAction) return;

    setIsSubmitting(true);

    try {
      // Cancel outbound (hard delete + stock reversal)
      const result = await cancelOutboundAction(selectedItemForAction.id);

      if (!result.success) {
        error(result.message || "Gagal membatalkan transaksi.");
        setIsSubmitting(false);
        setShowBatalConfirmModal(false);
        return;
      }

      // Reset state
      setShowBatalConfirmModal(false);
      setSelectedItemForAction(null);
      setIsSubmitting(false);

      success(
        `✓ Transaksi ${selectedItemForAction.transaction_code} telah dibatalkan. Stock dikembalikan.`
      );

      // Refresh data
      router.refresh();
    } catch (err: any) {
      error("Terjadi kesalahan sistem saat membatalkan transaksi.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 to-red-100 p-4 md:p-8">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-500 rounded-lg sm:rounded-xl flex items-center justify-center">
              <TruckIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">
                Outbound
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">
                Pengambilan barang dengan aturan FEFO.
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
            {/* Nama Driver & Nomor Polisi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Nama Driver */}
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  👤 Nama Pengemudi
                </label>
                <input
                  type="text"
                  value={form.namaPengemudi}
                  onChange={(e) =>
                    handleChange("namaPengemudi", e.target.value)
                  }
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
                  onChange={(e) =>
                    handleChange("nomorPolisi", e.target.value.toUpperCase())
                  }
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                  {filteredProducts.map((product) => (
                    <option key={product.id} value={product.product_code}>
                      {product.product_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Qty Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Qty Pallet Utuh */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📊 Qty Pallet Utuh
                </label>
                <input
                  type="number"
                  value={form.qtyPalletInput}
                  onChange={(e) =>
                    handleChange("qtyPalletInput", e.target.value)
                  }
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
                  onChange={(e) =>
                    handleChange("qtyCartonInput", e.target.value)
                  }
                  min="0"
                  placeholder="Jumlah karton sisa"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all"
                />
                {selectedProduct &&
                  form.qtyCartonInput &&
                  Number(form.qtyCartonInput) > 0 && (
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
                  💡 Pilih produk dan kuantitas terlebih dahulu untuk melihat
                  rekomendasi lokasi pengambilan berdasarkan FEFO.
                </p>
              </div>
            </div>
          </div>

          {/* Ringkasan */}
          {form.productCode && totalCartons > 0 && (
            <div className="bg-slate-50 border-2 border-slate-300 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-slate-900 mb-3">
                📋 Ringkasan:
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Produk:</span>
                  <span className="font-semibold text-slate-900">
                    {selectedProduct?.product_name || "-"}
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
                  <span className="text-slate-600">
                    Total Lokasi Dibutuhkan:
                  </span>
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
                  ℹ️ Catatan: Sistem akan mencari {totalPalletsNeeded} lokasi
                  berdasarkan FEFO.
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
                      <th className="px-4 py-3 text-left text-sm font-bold">
                        No
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-bold">
                        Lokasi
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-bold">
                        BB Produk
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-bold">
                        Qty Ambil
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-bold">
                        Sisa di Rak
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-bold">
                        Expired Date
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-bold">
                        QR Code
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Variabel pembantu untuk menghitung sisa karton di UI
                      let tempRemainingCartons = totalCartons;
                      const qtyPerPalletStd =
                        selectedProduct?.qty_carton_per_pallet || 0;

                      return fefoLocations.map((loc, index) => {
                        // Hitung karton spesifik untuk baris ini
                        // Mengambil yang terkecil antara sisa kebutuhan total vs standar 1 pallet
                        const displayCartons = Math.min(
                          tempRemainingCartons,
                          qtyPerPalletStd
                        );
                        tempRemainingCartons -= displayCartons;

                        return (
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
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {index + 1}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1.5">
                                <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-semibold">
                                  {loc.location}
                                </span>
                                <div className="flex gap-1.5 flex-wrap">
                                  {/* Badge Status Fisik */}
                                  {loc.status === 'receh' && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700 border border-blue-300">
                                      🔵 Receh
                                    </span>
                                  )}
                                  {loc.status === 'salah-cluster' && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 border border-red-300">
                                      🔴 Salah Cluster
                                    </span>
                                  )}
                                  {/* Badge FEFO Status */}
                                  {loc.fefo_status === 'release' ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700 border border-green-300">
                                      🟢 RELEASE
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-300">
                                      🟡 HOLD
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-700">
                              {Array.isArray(loc.bbPallet)
                                ? loc.bbPallet.join(", ")
                                : loc.bbPallet}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                <div className="text-sm font-bold text-orange-700">
                                  {loc.allocatedQtyPallet} Pallet
                                </div>
                                {/* Detail karton yang harus diambil */}
                                <div className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 inline-block">
                                  Ambil {displayCartons} Carton
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                {/* Sisa Stok di Rak setelah diambil */}
                                <div className={`text-sm font-bold ${
                                  loc.qtyAfter === 0 
                                    ? "text-red-600" 
                                    : loc.qtyAfter < 10 
                                    ? "text-yellow-600" 
                                    : "text-green-600"
                                }`}>
                                  {loc.qtyAfter} Carton
                                </div>
                                {loc.qtyAfter === 0 && (
                                  <div className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-200 inline-block">
                                    ⚠️ Rak Kosong
                                  </div>
                                )}
                                {loc.qtyAfter > 0 && loc.qtyAfter < 10 && (
                                  <div className="text-xs font-semibold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded border border-yellow-200 inline-block">
                                    ⚡ Stok Tipis
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-700">
                                {new Date(loc.expiredDate).toLocaleDateString(
                                  "id-ID",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )}
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
                            <td className="px-4 py-3 text-center">
                              <div
                                className="flex flex-col items-center justify-center bg-white p-2 rounded-lg border-2 border-gray-300 cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-all shadow-sm"
                                onClick={() => {
                                  const bbData = Array.isArray(loc.bbPallet)
                                    ? loc.bbPallet.join(", ")
                                    : loc.bbPallet;
                                  setScannedBarcodeData({
                                    location: loc.location,
                                    bbPallet: bbData,
                                  });
                                  setShowBarcodeInfoModal(true);
                                }}
                              >
                                <QRCodeSVG
                                  value={
                                    Array.isArray(loc.bbPallet)
                                      ? loc.bbPallet.join(",")
                                      : loc.bbPallet
                                  }
                                  size={80}
                                  level="H"
                                  includeMargin={false}
                                />
                                <p className="text-[10px] text-blue-600 mt-1 font-semibold uppercase">
                                  Info BB
                                </p>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <p className="text-green-700 font-semibold">
                  ✓ Lokasi pengambilan sudah di-sort berdasarkan FEFO (First
                  Expired First Out)
                </p>
                <p className="text-green-600 text-sm mt-1">
                  Ambil barang sesuai urutan untuk memastikan barang dengan
                  expired date terdekat keluar terlebih dahulu.
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
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-red-700"
                  >
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
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4"
          onClick={() => setShowConfirmModal(false)}
        >
          <div
            className="bg-white rounded-lg sm:rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] sm:max-h-[70vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Header */}
            <div className="sticky top-0 bg-linear-to-r from-orange-500 to-red-600 px-3 sm:px-4 py-2 sm:py-3 flex-shrink-0">
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                ✓ Konfirmasi Pengambilan
              </h2>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 p-3 sm:p-4 space-y-2 sm:space-y-3">
              {/* Warning Box */}
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-3">
                <p className="text-amber-900 text-xs flex items-start gap-2">
                  <span className="flex-shrink-0">⚠️</span>
                  <span>Barang akan diambil sesuai urutan FEFO</span>
                </p>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-600">Pengemudi</p>
                  <p className="font-semibold text-gray-900 text-xs truncate">
                    {form.namaPengemudi}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-600">Nomor Polisi</p>
                  <p className="font-semibold text-gray-900 text-xs truncate">
                    {form.nomorPolisi}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-600">Produk</p>
                  <p className="font-semibold text-gray-900 text-xs truncate">
                    {selectedProduct?.product_name}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-600">Total Qty</p>
                  <p className="font-semibold text-orange-600 text-xs">
                    {totalCartons} ktn / {totalPcs.toLocaleString()} pcs
                  </p>
                </div>
              </div>

              {/* Locations List */}
              <div>
                <h3 className="font-bold text-gray-800 text-xs mb-2">
                  📍 Lokasi Pengambilan ({fefoLocations.length})
                </h3>
                <div className="space-y-2">
                  {fefoLocations.map((loc, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 rounded-lg p-2 border border-gray-200"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </span>
                            <p className="font-bold text-gray-900 text-xs truncate">
                              {loc.location}
                            </p>
                          </div>
                          <div className="ml-6 space-y-0.5">
                            <p className="text-xs text-gray-700 truncate">
                              BB: {Array.isArray(loc.bbPallet) ? loc.bbPallet.join(", ") : loc.bbPallet}
                            </p>
                            <p className="text-xs text-gray-600">
                              Exp: {loc.expiredDate} ({loc.daysToExpire}h)
                            </p>
                            {/* FEFO Badges */}
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {loc.fefo_status === 'release' ? (
                                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 border border-green-300 rounded text-xs">
                                  🟢 RELEASE
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 border border-yellow-300 rounded text-xs">
                                  🟡 HOLD
                                </span>
                              )}
                              {loc.status === 'receh' && (
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 border border-blue-300 rounded text-xs">
                                  🔵 Receh
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="font-bold text-orange-600 text-xs">
                            {loc.qtyTaken} Ctn
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3 flex gap-2 flex-shrink-0">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={confirmOutbound}
                disabled={isSubmitting}
                className="flex-1 bg-green-500 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Proses...' : 'Konfirmasi'}
              </button>
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
                  <svg
                    className="w-10 h-10 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
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
                  <span className="font-semibold text-gray-800">
                    {form.namaPengemudi}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Nomor Polisi:</span>
                  <span className="font-semibold text-gray-800">
                    {form.nomorPolisi}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Produk:</span>
                  <span className="font-semibold text-gray-800">
                    {selectedProduct?.product_name}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-700 font-semibold mb-3">
                Lokasi Pengambilan (FEFO):
              </p>
              <div className="mb-4 space-y-2 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3">
                {fefoLocations.map((loc, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between rounded-md p-2 bg-orange-100"
                  >
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
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                📦 Informasi Lokasi
              </h2>
              <p className="text-sm text-gray-500">Hasil scan QR Code</p>
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
                const [cluster, lorong, baris, level] =
                  scannedBarcodeData.location.split("-");
                return (
                  <>
                    <div className="bg-linear-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        Lokasi Detail:
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <p className="text-xs text-gray-500 mb-1">Cluster</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {cluster}
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <p className="text-xs text-gray-500 mb-1">Lorong</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {lorong}
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <p className="text-xs text-gray-500 mb-1">Baris</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {baris}
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <p className="text-xs text-gray-500 mb-1">Level</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {level}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-linear-to-r from-amber-50 to-orange-50 rounded-xl p-4 border-2 border-amber-200">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">
                        BB Pallet:
                      </h3>
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
        <div className="bg-linear-to-r from-orange-500 to-red-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">📋</span>
            Transaksi Hari Ini
          </h2>
          <p className="text-orange-100 text-sm mt-1">
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        {todayTransactions.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-500 font-medium">
              Belum ada transaksi outbound hari ini
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Waktu
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Pengemudi
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Produk
                    </th>
                    <th className="px-2 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Pallet
                    </th>
                    <th className="px-2 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Carton
                    </th>
                    <th className="px-2 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {todayTransactions.map((item) => {
                    const product = products.find(
                      (p) => p.id === item.product_id
                    );
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-orange-50 transition-colors"
                      >
                        <td className="px-3 py-3 text-sm text-gray-900 whitespace-nowrap">
                          {new Date(item.departure_time).toLocaleTimeString(
                            "id-ID",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900 max-w-[120px] truncate">
                          {item.driver_name}
                        </td>
                        <td className="px-3 py-3 text-sm">
                          {(() => {
                            const product = products.find(
                              (p) => p.id === item.product_id
                            );
                            return (
                              <>
                                <div className="font-medium text-gray-900">
                                  {product?.product_code || "-"}
                                </div>
                                <div className="text-gray-500 text-xs truncate max-w-[150px]">
                                  {product?.product_name || "-"}
                                </div>
                              </>
                            );
                          })()}
                        </td>
                        <td className="px-2 py-3 text-sm text-center font-bold text-green-600">
                          {item.locations.length}
                        </td>
                        <td className="px-2 py-3 text-sm text-center font-bold text-blue-600">
                          {item.qty_carton}
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
                    );
                  })}
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
              <h2 className="text-xl font-bold text-white">
                📋 Detail Transaksi Outbound
              </h2>
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
              <div className="bg-linear-to-br from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200">
                <h3 className="font-bold text-orange-900 mb-3 flex items-center gap-2">
                  <span className="text-lg">🚚</span> Informasi Pengiriman
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Tanggal:</span>
                    <p className="font-semibold text-gray-900">
                      {new Date(
                        selectedHistoryItem.departure_time
                      ).toLocaleDateString("id-ID", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Nama Pengemudi:</span>
                    <p className="font-semibold text-gray-900">
                      {selectedHistoryItem.driver_name}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">No. Polisi:</span>
                    <p className="font-semibold text-gray-900">
                      {selectedHistoryItem.vehicle_number}
                    </p>
                  </div>
                </div>
              </div>

              {/* Informasi Produk */}
              <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                <h3 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                  <span className="text-lg">📦</span> Informasi Produk
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="col-span-2">
                    <span className="text-gray-600">Nama Produk:</span>
                    <p className="font-semibold text-gray-900">
                      {(() => {
                        const product = products.find(
                          (p) => p.id === selectedHistoryItem.product_id
                        );
                        return product?.product_name || "-";
                      })()}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Kode Produk:</span>
                    <p className="font-semibold text-gray-900">
                      {(() => {
                        const product = products.find(
                          (p) => p.id === selectedHistoryItem.product_id
                        );
                        return product?.product_code || "-";
                      })()}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Total PCS:</span>
                    <p className="font-semibold text-gray-900">
                      {(() => {
                        const product = products.find(
                          (p) => p.id === selectedHistoryItem.product_id
                        );
                        const totalPcs = product
                          ? selectedHistoryItem.qty_carton *
                            product.qty_per_carton
                          : 0;
                        return totalPcs.toLocaleString();
                      })()}{" "}
                      pcs
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Qty Pallet:</span>
                    <p className="font-semibold text-gray-900">
                      {selectedHistoryItem.locations.length} pallet
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Qty Carton:</span>
                    <p className="font-semibold text-gray-900">
                      {selectedHistoryItem.qty_carton} carton
                    </p>
                  </div>
                </div>
              </div>

              {/* Lokasi Pengambilan FEFO dengan QR Code */}
              <div className="bg-linear-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                <h3 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                  <span className="text-lg">📍</span> Lokasi Pengambilan FEFO
                </h3>
                <div className="space-y-3">
                  {selectedHistoryItem.locations.map((locationItem, idx) => {
                    return (
                      <div
                        key={idx}
                        className="bg-white rounded-lg p-3 border border-purple-200"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="inline-block px-2 py-1 bg-purple-600 text-white rounded text-xs font-bold">
                                #{idx + 1}
                              </span>
                              <span className="font-semibold text-gray-900 text-lg">
                                {locationItem.cluster}-L{locationItem.lorong}-B
                                {locationItem.baris}-P{locationItem.level}
                              </span>
                            </div>
                            <div className="text-sm space-y-2">
                              {/* FEFO & Status Badges (jika ada) */}
                              {(locationItem.fefo_status || locationItem.status) && (
                                <div className="flex gap-1.5 flex-wrap mb-2">
                                  {locationItem.status === 'receh' && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700 border border-blue-300">
                                      🔵 Receh
                                    </span>
                                  )}
                                  {locationItem.status === 'salah-cluster' && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 border border-red-300">
                                      🔴 Salah Cluster
                                    </span>
                                  )}
                                  {locationItem.fefo_status === 'release' && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700 border border-green-300">
                                      🟢 RELEASE
                                    </span>
                                  )}
                                  {locationItem.fefo_status === 'hold' && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-300">
                                      🟡 HOLD
                                    </span>
                                  )}
                                </div>
                              )}
                              <div>
                                <span className="text-gray-600">
                                  BB Produk:
                                </span>
                                <span className="font-mono font-semibold text-gray-900 ml-2">
                                  {locationItem.bbProduk}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">
                                  Qty Carton:
                                </span>
                                <span className="font-semibold text-gray-900 ml-2">
                                  {locationItem.qtyCarton} carton
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <QRCodeSVG
                              value={locationItem.bbProduk}
                              size={100}
                              level="H"
                              includeMargin={false}
                            />
                            <p className="text-xs text-gray-600 mt-2 font-semibold">
                              QR BB Produk
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Waktu Input */}
              <div className="bg-linear-to-br from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-lg">⏰</span> Waktu Input
                </h3>
                <div className="text-sm">
                  <span className="text-gray-600">Dibuat pada:</span>
                  <p className="font-semibold text-gray-900">
                    {selectedHistoryItem.created_at
                      ? new Date(selectedHistoryItem.created_at).toLocaleString(
                          "id-ID",
                          {
                            dateStyle: "full",
                            timeStyle: "medium",
                          }
                        )
                      : new Date(
                          selectedHistoryItem.departure_time
                        ).toLocaleString("id-ID", {
                          dateStyle: "full",
                          timeStyle: "medium",
                        })}
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="bg-linear-to-br from-slate-50 to-gray-50 rounded-xl p-4 border border-slate-200">
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="text-lg">✓</span> Status Transaksi
                </h3>
                <div className="flex items-center gap-2">
                  <span className="inline-flex px-4 py-2 text-sm font-bold rounded-lg bg-green-100 text-green-800">
                    ✅ Selesai
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
            <div className="bg-linear-to-r from-amber-500 to-orange-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white">
                ✏️ Edit Transaksi
              </h2>
            </div>
            <div className="p-6">
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-4">
                <p className="text-amber-800 font-medium text-sm">
                  ⚠️ Tindakan ini akan:
                </p>
                <ul className="text-amber-700 text-sm mt-2 space-y-1 list-disc list-inside">
                  <li>
                    Membatalkan transaksi{" "}
                    <strong>{selectedItemForAction.transaction_code}</strong>
                  </li>
                  <li>
                    Mengembalikan stock ke lokasi asal (atau In Transit jika
                    lokasi sudah terisi)
                  </li>
                  <li>Memuat data ke form untuk di-edit ulang</li>
                </ul>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-600 mb-2">Detail transaksi:</p>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Produk:</span>
                    <span className="font-semibold text-gray-900">
                      {(() => {
                        const product = products.find(
                          (p) => p.id === selectedItemForAction.product_id
                        );
                        return product?.product_code || "-";
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Qty:</span>
                    <span className="font-semibold text-gray-900">
                      {selectedItemForAction.locations.length} pallet,{" "}
                      {selectedItemForAction.qty_carton} karton
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Lokasi:</span>
                    <span className="font-semibold text-gray-900 text-xs">
                      {selectedItemForAction.locations
                        .map(
                          (loc) =>
                            `${loc.cluster}-L${loc.lorong}-B${loc.baris}-P${loc.level}`
                        )
                        .join(", ")}
                    </span>
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
              <h2 className="text-xl font-bold text-white">
                ❌ Batalkan Transaksi
              </h2>
            </div>
            <div className="p-6">
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4">
                <p className="text-red-800 font-medium text-sm">
                  ⚠️ Tindakan ini akan:
                </p>
                <ul className="text-red-700 text-sm mt-2 space-y-1 list-disc list-inside">
                  <li>
                    Membatalkan transaksi{" "}
                    <strong>{selectedItemForAction.transaction_code}</strong>
                  </li>
                  <li>
                    Mengembalikan stock ke lokasi asal (atau In Transit jika
                    lokasi sudah terisi)
                  </li>
                  <li>Menghapus record dari history</li>
                </ul>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-600 mb-2">Detail transaksi:</p>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Produk:</span>
                    <span className="font-semibold text-gray-900">
                      {(() => {
                        const product = products.find(
                          (p) => p.id === selectedItemForAction.product_id
                        );
                        return product?.product_code || "-";
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Qty:</span>
                    <span className="font-semibold text-gray-900">
                      {selectedItemForAction.locations.length} pallet,{" "}
                      {selectedItemForAction.qty_carton} karton
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Lokasi:</span>
                    <span className="font-semibold text-gray-900 text-xs">
                      {selectedItemForAction.locations
                        .map(
                          (loc) =>
                            `${loc.cluster}-L${loc.lorong}-B${loc.baris}-P${loc.level}`
                        )
                        .join(", ")}
                    </span>
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
