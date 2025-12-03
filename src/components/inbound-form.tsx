// File: src/components/inbound-form.tsx (UPDATED)

"use client";

import { useState } from "react";
// --- START: Perubahan Import ---
import { 
  productMasterData, 
  getProductByCode, 
  ekspedisiMaster // Mengimpor Master Ekspedisi baru
} from "@/lib/mock/product-master";
import { stockListData } from "@/lib/mock/stocklistmock";
import { QRScanner, QRData } from "./qr-scanner";
import { Camera, X, CheckCircle, XCircle } from "lucide-react";
// --- END: Perubahan Import ---

// --- START: Menghilangkan Hardcoded Data Lama ---

// Menghilangkan ekspedisiOptions lama karena sudah ada di product-master.ts

// Menghilangkan productClusterMap lama karena sekarang menggunakan defaultCluster dari ProductMaster

interface RecommendedLocation {
  cluster: string;
  lorong: string;
  baris: string;
  level: string;
}

// --- END: Menghilangkan Hardcoded Data Lama ---

type InboundFormState = {
  ekspedisi: string;
  tanggal: string;
  productCode: string;
  bbPallet: string;
  kdPlant: string;
  expiredDate: string;
  qtyCarton: string;
  // Location fields
  cluster: string;
  lorong: string;
  baris: string;
  pallet: string;
};

const today = new Date().toISOString().slice(0, 10);

const initialState: InboundFormState = {
  ekspedisi: "",
  tanggal: today,
  productCode: "",
  bbPallet: "",
  kdPlant: "",
  expiredDate: "",
  qtyCarton: "",
  cluster: "",
  lorong: "",
  baris: "",
  pallet: "",
};

export function InboundForm() {
  const [form, setForm] = useState<InboundFormState>(initialState);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [recommendedLocation, setRecommendedLocation] = useState<RecommendedLocation | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [autoRecommend, setAutoRecommend] = useState(true); // Checkbox rekomendasi otomatis

  // Get selected product data
  const selectedProduct = form.productCode ? getProductByCode(form.productCode) : null;
  
  // --- START: Logika Cluster Baru ---
  // Gunakan defaultCluster dari ProductMaster yang baru
  const autoCluster = selectedProduct?.defaultCluster || ""; 
  // --- END: Logika Cluster Baru ---
  
  const autoQtyPerPallet = selectedProduct?.qtyPerPallet || 0;

  // Dropdown options untuk lokasi
  const lorongOptions = Array.from({ length: 11 }, (_, i) => `L${i + 1}`); // L1-L11
  const barisOptions = Array.from({ length: 9 }, (_, i) => `B${i + 1}`); // B1-B9
  const palletOptions = Array.from({ length: 3 }, (_, i) => `P${i + 1}`); // P1-P3

  // Function untuk mencari lokasi kosong yang recommended
  const findRecommendedLocation = (cluster: string): RecommendedLocation | null => {
    const lorongList = lorongOptions;
    const barisList = barisOptions;
    const levelList = palletOptions;

    // Cari lokasi kosong di cluster yang sesuai
    for (const lorong of lorongList) {
      for (const baris of barisList) {
        for (const level of levelList) {
          const locationExists = stockListData.some(
            (item) =>
              item.location.cluster === cluster &&
              item.location.lorong === lorong &&
              item.location.baris === baris &&
              item.location.level === level
          );

          if (!locationExists) {
            return { cluster, lorong, baris, level };
          }
        }
      }
    }

    return null; // Gudang penuh
  };

  // Handle field change
  const handleChange = (field: keyof InboundFormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: "" }));

    // Auto-fill cluster ketika produk dipilih
    if (field === "productCode" && value) {
      const selectedProd = getProductByCode(value);
      // Gunakan defaultCluster yang baru
      const cluster = selectedProd?.defaultCluster || ""; 
      
      // Auto-set cluster jika rekomendasi otomatis aktif
      if (autoRecommend && cluster) {
        setForm(prev => ({ ...prev, cluster }));
        const location = findRecommendedLocation(cluster);
        setRecommendedLocation(location);
        // Auto-fill location jika ada rekomendasi
        if (location) {
          setForm(prev => ({
            ...prev,
            cluster: location.cluster,
            lorong: location.lorong,
            baris: location.baris,
            pallet: location.level, // Ganti level jadi pallet
          }));
        }
      } else if (cluster) {
        // Jika tidak auto, hanya set cluster (yang direkomendasikan)
        setForm(prev => ({ ...prev, cluster }));
      } else {
        // Jika tidak ada cluster default, kosongkan cluster
        setForm(prev => ({ ...prev, cluster: "" }));
      }
    }
  };

  // Validate tanggal (hanya boleh hari ini)
  const validateTanggal = (tanggal: string): boolean => {
    const today = new Date().toISOString().slice(0, 10);
    return tanggal === today;
  };

  // Validate BB Pallet (bebas, tidak strict)
  const validateBBPallet = (bbPallet: string): boolean => {
    return bbPallet.trim().length > 0;
  };

  // Handle QR Scan Success
  const handleQRScanSuccess = (data: QRData) => {
    // --- START: Penyesuaian Mapping QR Lama ke Kode Produk Baru ---
    // Karena QR scanner Anda sebelumnya menggunakan kode 'AQ200_1X48' dll,
    // yang tidak ada di master baru, kita buat mapping sementara.
    // Jika format QR baru mengikuti productCode yang baru (misal AQ-200ML), 
    // mapping ini bisa dihilangkan. 
    const productCodeMap: Record<string, string> = {
      // Mapping dari kode lama ke kode baru yang sesuai di product-master.ts
      "AQ200_1X48": "AQ-200ML", // (Kode baru)
      "AQ600_1X24": "AQ-600ML",
      "AQ1500_1X12": "AQ-1500ML",
      "AQ330_1X24": "AQ-330ML",
      // Tambahkan mapping untuk produk baru jika QR code menggunakan ID/Code lama
    };

    const mappedProductCode = productCodeMap[data.produkId] || data.produkId;
    const selectedProd = getProductByCode(mappedProductCode);
    // --- END: Penyesuaian Mapping QR Lama ke Kode Produk Baru ---


    // Auto-fill form dari QR data
    const newForm: InboundFormState = {
      ekspedisi: data.ekspedisi,
      tanggal: today,
      productCode: mappedProductCode,
      bbPallet: data.bbPallet,
      kdPlant: data.kdPlant,
      expiredDate: data.expiredDate,
      qtyCarton: "",
      cluster: "",
      lorong: "",
      baris: "",
      pallet: "",
    };

    setForm(newForm);

    // Auto-fill cluster dan rekomendasi lokasi jika auto recommend aktif
    // Gunakan defaultCluster dari produk yang baru
    const cluster = selectedProd?.defaultCluster || ""; 
    
    if (autoRecommend && cluster) {
      const location = findRecommendedLocation(cluster);
      setRecommendedLocation(location);
      if (location) {
        setForm(prev => ({
          ...prev,
          cluster: location.cluster,
          lorong: location.lorong,
          baris: location.baris,
          pallet: location.level,
        }));
      }
    } else if (cluster) {
      // Jika tidak auto, hanya set cluster yang direkomendasikan
      setForm(prev => ({ ...prev, cluster }));
    }
    
    setShowQRScanner(false);
  };

  // Handle submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi
    const newErrors: Record<string, string> = {};
    const errorList: string[] = [];

    if (!form.ekspedisi) {
      newErrors.ekspedisi = "Ekspedisi harus diisi";
      errorList.push("Ekspedisi harus diisi");
    }
    if (!validateTanggal(form.tanggal)) {
      newErrors.tanggal = "Tanggal harus hari ini";
      errorList.push("Tanggal harus hari ini");
    }
    if (!form.productCode) {
      newErrors.productCode = "Produk harus dipilih";
      errorList.push("Produk harus dipilih");
    }
    if (!form.bbPallet) {
      newErrors.bbPallet = "BB Pallet harus diisi";
      errorList.push("BB Pallet harus diisi");
    } else if (!validateBBPallet(form.bbPallet)) {
      newErrors.bbPallet = "BB Pallet tidak boleh kosong";
      errorList.push("BB Pallet tidak boleh kosong");
    }
    if (!form.kdPlant) {
      newErrors.kdPlant = "Kd Plant harus diisi";
      errorList.push("Kd Plant harus diisi");
    }
    if (!form.expiredDate) {
      newErrors.expiredDate = "Expired Date harus diisi";
      errorList.push("Expired Date harus diisi");
    }
    if (!form.qtyCarton) {
      newErrors.qtyCarton = "Qty Carton harus diisi";
      errorList.push("Qty Carton harus diisi");
    }
    if (!form.cluster) {
      newErrors.cluster = "Cluster harus diisi";
      errorList.push("Cluster harus diisi");
    }
    if (!form.lorong) {
      newErrors.lorong = "Lorong harus diisi";
      errorList.push("Lorong harus diisi");
    }
    if (!form.baris) {
      newErrors.baris = "Baris harus diisi";
      errorList.push("Baris harus diisi");
    }
    if (!form.pallet) {
      newErrors.pallet = "Pallet/Level harus diisi";
      errorList.push("Pallet/Level harus diisi");
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setErrorMessages(errorList);
      setShowErrorModal(true);
      return;
    }

    // Cek apakah lokasi ini sudah terisi (re-run logic)
    const locationIsOccupied = stockListData.some(
      (item) =>
        item.location.cluster === form.cluster &&
        item.location.lorong === form.lorong &&
        item.location.baris === form.baris &&
        item.location.level === form.pallet
    );

    if (locationIsOccupied) {
      setErrorMessages([
        `Lokasi ${form.cluster}-${form.lorong}-${form.baris}-${form.pallet} sudah terisi.`,
      ]);
      setShowErrorModal(true);
      return;
    }

    // Simulasi inbound (dalam real app, ini akan POST ke API)
    console.log("Inbound Data:", {
      ...form,
      cluster: autoCluster, // Menggunakan autoCluster/defaultCluster
      qtyPerPallet: autoQtyPerPallet,
      recommendedLocation,
    });

    // Show success modal
    setShowSuccess(true);

    // Reset form after 2 seconds
    setTimeout(() => {
      setShowSuccess(false);
      setForm(initialState);
      setRecommendedLocation(null);
      setErrors({});
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Inbound Form</h1>
                <p className="text-sm text-gray-500">Ambil dari Master Data & Auto Lokasi</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowQRScanner(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              <Camera size={20} />
              <span className="hidden md:inline">Scan QR</span>
            </button>
          </div>

          {/* QR Scanner Modal (No change needed here) */}
          {showQRScanner && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
              <div className="bg-white rounded-lg p-1.5 w-full max-w-60 relative shadow-xl">
                <div className="flex justify-between items-center mb-1">
                  <h2 className="text-xs font-semibold text-gray-700">Scan QR</h2>
                  <button
                    onClick={() => setShowQRScanner(false)}
                    className="p-0.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="w-full">
                  <QRScanner
                    onScanSuccess={handleQRScanSuccess}
                    onScanError={(error) => {
                      console.error("QR Scan Error:", error);
                      setShowQRScanner(false);
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Error Modal (No change needed here) */}
          {showErrorModal && (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-bounce-in">
                <div className="bg-red-500 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                      <XCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Validasi Gagal</h3>
                      <p className="text-sm text-red-100">Data belum lengkap</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-gray-700 font-semibold mb-3">
                    Silakan lengkapi data berikut:
                  </p>
                  <ul className="space-y-2 mb-6">
                    {errorMessages.map((error, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-red-700">
                        <span className="text-red-500 mt-0.5">❌</span>
                        <span>{error}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => {
                      setShowErrorModal(false);
                      setErrorMessages([]);
                    }}
                    className="w-full bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600 transition-colors"
                  >
                    Tutup & Perbaiki
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success Modal (No change needed here) */}
          {showSuccess && recommendedLocation && (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                <div className="bg-linear-to-r from-green-500 to-emerald-600 p-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm mb-3">
                      <CheckCircle className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      Inbound Berhasil!
                    </h3>
                    <p className="text-green-100 text-sm">
                      Data berhasil disimpan ke sistem
                    </p>
                  </div>
                </div>
                <div className="p-6">
                  <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-4">
                    <p className="text-sm text-green-700 font-semibold mb-2">
                      📍 Lokasi Rekomendasi:
                    </p>
                    <div className="flex items-center justify-center">
                      <span className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold text-2xl tracking-wider">
                        {recommendedLocation.cluster}-{recommendedLocation.lorong}-
                        {recommendedLocation.baris}-{recommendedLocation.level}
                      </span>
                    </div>
                  </div>
                  <p className="text-center text-gray-600 text-sm mb-4">
                    Silakan tempatkan barang di lokasi yang direkomendasikan
                  </p>
                  <button
                    onClick={() => setShowSuccess(false)}
                    className="w-full bg-linear-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg"
                  >
                    OK, Mengerti
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Ekspedisi & Tanggal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  {/* --- START: Menggunakan ekspedisiMaster yang baru --- */}
                  {ekspedisiMaster.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.name}
                    </option>
                  ))}
                  {/* --- END: Menggunakan ekspedisiMaster yang baru --- */}
                </select>
                {errors.ekspedisi && (
                  <p className="text-red-500 text-xs mt-1">{errors.ekspedisi}</p>
                )}
              </div>

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
                {/* productMasterData sudah diperbarui di Langkah 1 */}
                {productMasterData.map((product) => (
                  <option key={product.id} value={product.productCode}>
                    {product.productName} ({product.productCode})
                  </option>
                ))}
              </select>
              {errors.productCode && (
                <p className="text-red-500 text-xs mt-1">{errors.productCode}</p>
              )}
            </div>

            {/* BB Pallet & Kd Plant */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  BB Pallet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.bbPallet}
                  onChange={(e) => handleChange("bbPallet", e.target.value)}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all ${
                    errors.bbPallet ? "border-red-500" : "border-gray-200"
                  }`}
                />
                {errors.bbPallet && (
                  <p className="text-red-500 text-xs mt-1">{errors.bbPallet}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Kd Plant <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.kdPlant}
                  onChange={(e) => handleChange("kdPlant", e.target.value)}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all ${
                    errors.kdPlant ? "border-red-500" : "border-gray-200"
                  }`}
                />
                {errors.kdPlant && (
                  <p className="text-red-500 text-xs mt-1">{errors.kdPlant}</p>
                )}
              </div>
            </div>

            {/* Expired Date & Qty Carton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Expired Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.expiredDate}
                  onChange={(e) => handleChange("expiredDate", e.target.value)}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all ${
                    errors.expiredDate ? "border-red-500" : "border-gray-200"
                  }`}
                />
                {errors.expiredDate && (
                  <p className="text-red-500 text-xs mt-1">{errors.expiredDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Quantity (Pallet) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={form.qtyCarton}
                  onChange={(e) => handleChange("qtyCarton", e.target.value)}
                  min="1"
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all ${
                    errors.qtyCarton ? "border-red-500" : "border-gray-200"
                  }`}
                  // Placeholder dan penamaan field (Qty Carton) harusnya Qty Pallet sesuai mock data
                  placeholder="Masukkan Qty Pallet (per tumpukan)"
                />
                {errors.qtyCarton && (
                  <p className="text-red-500 text-xs mt-1">{errors.qtyCarton}</p>
                )}
              </div>
            </div>

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

            {/* Location Fields */}
            <div className="border-2 border-gray-200 rounded-xl p-4">
              <h3 className="font-semibold text-gray-800 mb-4">📍 Lokasi Penyimpanan</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Cluster */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cluster <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.cluster}
                    onChange={(e) => handleChange("cluster", e.target.value.toUpperCase())}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all ${
                      errors.cluster ? "border-red-500" : "border-gray-200"
                    } ${autoRecommend ? "bg-gray-100" : ""}`}
                    maxLength={1}
                    disabled={autoRecommend}
                    // Nilai field ini sudah diisi otomatis berdasarkan selectedProduct.defaultCluster
                  />
                  {errors.cluster && (
                    <p className="text-red-500 text-xs mt-1">{errors.cluster}</p>
                  )}
                </div>

                {/* Lorong */}
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
                    disabled={autoRecommend}
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

                {/* Baris */}
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
                    disabled={autoRecommend}
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

                {/* Pallet */}
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
                    disabled={autoRecommend}
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

            {/* ========== SUMMARY SECTION ========== */}

            {/* Calculated Qty Pcs */}
            {selectedProduct && form.qtyCarton && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                <p className="text-yellow-800 font-semibold">
                  📦 Total Quantity:{" "}
                  <span className="text-yellow-900 text-xl">
                    {/* Menggunakan qtyPerPallet yang baru */}
                    {Number(form.qtyCarton) * selectedProduct.qtyPerPallet} pcs
                  </span>{" "}
                  ({form.qtyCarton} Pallet × {selectedProduct.qtyPerPallet} pcs/pallet) 
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                    ⚠️ Saat ini, Qty Pallet di form diasumsikan sebagai "Jumlah Pallet (Tumpukan)". Total Pcs dihitung menggunakan Qty Produk/Pallet dari Master Data.
                </p>
              </div>
            )}

            {/* Summary Data */}
            {form.productCode && form.ekspedisi && (
              <div className="bg-slate-50 border-2 border-slate-300 rounded-xl p-4">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <span>📋</span> Ringkasan Data Inbound
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
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
                  <div>
                    <span className="text-slate-600">BB Pallet:</span>{" "}
                    <span className="font-semibold text-slate-900">{form.bbPallet || "-"}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Kd Plant:</span>{" "}
                    <span className="font-semibold text-slate-900">{form.kdPlant || "-"}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Expired Date:</span>{" "}
                    <span className="font-semibold text-slate-900">{form.expiredDate || "-"}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Qty Pallet (Tumpukan):</span>{" "}
                    <span className="font-semibold text-slate-900">{form.qtyCarton || "-"}</span>
                  </div>
                  {selectedProduct && form.qtyCarton && (
                    <div className="col-span-2">
                      <span className="text-slate-600">Total Pcs:</span>{" "}
                      <span className="font-bold text-slate-900 text-lg">
                        {/* Menggunakan qtyPerPallet yang baru */}
                        {Number(form.qtyCarton) * selectedProduct.qtyPerPallet} pcs
                      </span>
                    </div>
                  )}
                  <div className="col-span-2 pt-2 border-t border-slate-300">
                    <span className="text-slate-600">Lokasi:</span>{" "}
                    <span className="font-bold text-slate-900">
                      {form.cluster && form.lorong && form.baris && form.pallet
                        ? `${form.cluster}-${form.lorong}-${form.baris}-${form.pallet}`
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

            {/* Recommended Location */}
            {recommendedLocation && autoRecommend && (
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <h3 className="font-semibold text-green-900 mb-2">
                  ✅ Rekomendasi Lokasi Kosong:
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-green-700">Lokasi:</span>
                  <span className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-lg">
                    {recommendedLocation.cluster}-{recommendedLocation.lorong}-
                    {recommendedLocation.baris}-{recommendedLocation.level}
                  </span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-linear-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              🚀 Submit Inbound & Konfirmasi Lokasi
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}