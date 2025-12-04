// File: src/components/inbound-form.tsx (Langkah 11: Kalkulasi Qty Dinamis)

"use client";

import { useState, useEffect, useMemo } from "react"; // Tambah useMemo
import { 
  productMasterData, 
  getProductByCode, 
  ekspedisiMaster 
} from "@/lib/mock/product-master";
import { stockListData } from "@/lib/mock/stocklistmock";
import { QRScanner, QRData } from "./qr-scanner";
import { Camera, X, CheckCircle, XCircle } from "lucide-react";

interface RecommendedLocation {
  cluster: string;
  lorong: string;
  baris: string;
  level: string;
}

type InboundFormState = {
  ekspedisi: string;
  tanggal: string;
  productCode: string;
  bbProduk: string;
  kdPlant: string;
  expiredDate: string;
  // --- PERUBAHAN QTY STATE ---
  qtyPalletInput: string; // Input Qty Pallet (User mengisi pallet utuh)
  qtyCartonInput: string; // Input Qty Carton (User mengisi karton/sisa)
  // --- AKHIR PERUBAHAN QTY STATE ---
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
  bbProduk: "", 
  kdPlant: "",
  expiredDate: "",
  qtyPalletInput: "", 
  qtyCartonInput: "",
  cluster: "",
  lorong: "",
  baris: "",
  pallet: "",
};

// --- FUNGSI UTILITY: PARSING BB PRODUK ---
const parseBBProduk = (bb: string): { expiredDate: string, kdPlant: string, isValid: boolean } => {
  const expiredDateStr = bb.substring(0, 6); // YYMMDD
  const kdPlantStr = bb.substring(6, 10);    // 4 digit berikutnya
  
  if (bb.length !== 10) {
    return { expiredDate: "", kdPlant: "", isValid: false };
  }

  const yearPrefix = (new Date().getFullYear() < 2050 && Number(expiredDateStr.substring(0, 2)) > 50) ? '19' : '20';
  const year = `${yearPrefix}${expiredDateStr.substring(0, 2)}`;
  const month = expiredDateStr.substring(2, 4);
  const day = expiredDateStr.substring(4, 6);
  
  const dateObj = new Date(`${year}-${month}-${day}`);
  const validDate = !isNaN(dateObj.getTime()) && dateObj.getMonth() + 1 === Number(month);

  return {
    expiredDate: validDate ? `${year}-${month}-${day}` : "",
    kdPlant: kdPlantStr,
    isValid: validDate,
  };
};

// --- FUNGSI UTILITY: QTY PALLET STACK OPTIONS ---
const palletStackOptions = Array.from({ length: 5 }, (_, i) => i + 1);


export function InboundForm() {
  const [form, setForm] = useState<InboundFormState>(initialState);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [recommendedLocation, setRecommendedLocation] = useState<RecommendedLocation | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [autoRecommend, setAutoRecommend] = useState(true);

  // --- LOGIKA QTY DINAMIS (CALCULATED VALUES) ---
  const selectedProduct = form.productCode ? getProductByCode(form.productCode) : null;
  const qtyPerPalletStd = selectedProduct?.qtyPerPallet || 0; // Standard Qty Produk per 1 Pallet
  
  const { totalPallets, remainingCartons, totalCartons } = useMemo(() => {
    // 1. Ambil input dari user (default ke 0 jika kosong)
    const palletInput = Number(form.qtyPalletInput) || 0;
    const cartonInput = Number(form.qtyCartonInput) || 0;
    
    // 2. Hitung total karton jika Qty Per Pallet ada
    const totalCartons = (palletInput * qtyPerPalletStd) + cartonInput;
    
    if (qtyPerPalletStd === 0) {
      return { totalPallets: 0, remainingCartons: cartonInput, totalCartons: cartonInput };
    }

    // 3. Hitung Pallet Utuh (Full Pallet)
    const calculatedPallets = Math.floor(totalCartons / qtyPerPalletStd);
    
    // 4. Hitung Sisa Karton (Receh)
    const remaining = totalCartons % qtyPerPalletStd;
    
    return {
      totalPallets: calculatedPallets,
      remainingCartons: remaining,
      totalCartons: totalCartons,
    };
  }, [form.qtyPalletInput, form.qtyCartonInput, qtyPerPalletStd]);
  
  // Logika Receh: Hanya jika ada sisa karton
  const isReceh = remainingCartons > 0;
  // --- AKHIR LOGIKA QTY DINAMIS ---


  // --- LOGIKA REKOMENDASI LOKASI ---
  const autoCluster = selectedProduct?.defaultCluster || ""; 
  const lorongOptions = Array.from({ length: 11 }, (_, i) => `L${i + 1}`); 
  const barisOptions = Array.from({ length: 9 }, (_, i) => `B${i + 1}`); 
  const palletOptions = Array.from({ length: 3 }, (_, i) => `P${i + 1}`); 

  const findRecommendedLocation = (cluster: string): RecommendedLocation | null => {
    const lorongList = lorongOptions;
    const barisList = barisOptions;
    const levelList = palletOptions;

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
  
  const handleChange = (field: keyof InboundFormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: "" }));

    if (field === "productCode" && value) {
      const selectedProd = getProductByCode(value);
      const cluster = selectedProd?.defaultCluster || ""; 
      
      if (autoRecommend && cluster) {
        setForm(prev => ({ ...prev, cluster }));
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
        setForm(prev => ({ ...prev, cluster }));
      } else {
        setForm(prev => ({ ...prev, cluster: "" }));
      }
    }
  };

  const validateTanggal = (tanggal: string): boolean => {
    const today = new Date().toISOString().slice(0, 10);
    return tanggal === today;
  };

  const handleQRScanSuccess = (data: QRData) => {
    const productCodeMap: Record<string, string> = {
      "AQ200_1X48": "AQ-200ML", 
      "AQ600_1X24": "AQ-600ML",
      "AQ1500_1X12": "AQ-1500ML",
      "AQ330_1X24": "AQ-330ML",
    };

    const mappedProductCode = productCodeMap[data.produkId] || data.produkId;
    const selectedProd = getProductByCode(mappedProductCode);
    
    const expDate = new Date(data.expiredDate);
    const YY = String(expDate.getFullYear()).slice(-2);
    const MM = String(expDate.getMonth() + 1).padStart(2, '0');
    const DD = String(expDate.getDate()).padStart(2, '0');
    const expiredDateYYMMDD = `${YY}${MM}${DD}`;

    const newBBProduk = `${expiredDateYYMMDD}${data.kdPlant}`;
    const { expiredDate: parsedExpDate, kdPlant: parsedKdPlant } = parseBBProduk(newBBProduk);

    const newForm: InboundFormState = {
      ekspedisi: data.ekspedisi,
      tanggal: today,
      productCode: mappedProductCode,
      bbProduk: newBBProduk, 
      kdPlant: parsedKdPlant, 
      expiredDate: parsedExpDate, 
      qtyPalletInput: "1", // Default 1 Pallet dari QR
      qtyCartonInput: "", // Kosongkan, user harus input Qty Produk aktual
      cluster: "",
      lorong: "",
      baris: "",
      pallet: "",
    };

    setForm(newForm);

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
      setForm(prev => ({ ...prev, cluster }));
    }
    
    setShowQRScanner(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    const errorList: string[] = [];
    
    if (!form.ekspedisi) { newErrors.ekspedisi = "Ekspedisi harus diisi"; errorList.push("Ekspedisi harus diisi"); }
    if (!validateTanggal(form.tanggal)) { newErrors.tanggal = "Tanggal harus hari ini"; errorList.push("Tanggal harus hari ini"); }
    if (!form.productCode) { newErrors.productCode = "Produk harus dipilih"; errorList.push("Produk harus dipilih"); }

    if (!form.bbProduk || form.bbProduk.length !== 10 || errors.bbProduk) {
      newErrors.bbProduk = errors.bbProduk || "BB Produk harus 10 karakter (YYMMDDXXXX) dan format tanggal valid.";
      errorList.push(newErrors.bbProduk);
    }
    
    // Validasi Qty: Salah satu harus terisi
    if (totalCartons === 0) {
        if (!form.qtyPalletInput && !form.qtyCartonInput) {
            newErrors.qtyPalletInput = "Setidaknya Qty Pallet atau Qty Produk harus diisi";
            errorList.push("Qty (Pallet/Karton) harus diisi.");
        } else if (form.qtyPalletInput && form.qtyCartonInput && Number(form.qtyPalletInput) + Number(form.qtyCartonInput) === 0) {
             newErrors.qtyPalletInput = "Total Qty tidak boleh nol.";
            errorList.push("Total Qty tidak boleh nol.");
        }
    }
    
    if (!form.cluster) { newErrors.cluster = "Cluster harus diisi"; errorList.push("Cluster harus diisi"); }
    if (!form.lorong) { newErrors.lorong = "Lorong harus diisi"; errorList.push("Lorong harus diisi"); }
    if (!form.baris) { newErrors.baris = "Baris harus diisi"; errorList.push("Baris harus diisi"); }
    if (!form.pallet) { newErrors.pallet = "Pallet/Level harus diisi"; errorList.push("Pallet/Level harus diisi"); }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setErrorMessages(errorList);
      setShowErrorModal(true);
      return;
    }

    // Cek apakah lokasi ini sudah terisi
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

    // Simulasi inbound
    console.log("Inbound Data:", {
      ...form,
      bbPallet: form.bbProduk, 
      qtyPalletStack: totalPallets, // Kirim Qty Pallet (Hasil Kalkulasi)
      qtyCartonActual: remainingCartons, // Kirim Sisa Karton (Hasil Kalkulasi)
      totalCartons: totalCartons, // Kirim Total Karton (Untuk pencatatan)
      isReceh: isReceh, // Status Receh
      cluster: autoCluster,
      standardQtyPerPallet: qtyPerPalletStd,
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
  // --- AKHIR EFFECT DAN HANDLER ---


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
                <p className="text-sm text-gray-500">Input Data Penerimaan (Primary)</p>
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

          {/* Modals (Dihilangkan untuk brevity) */}
          {/* ... (QR Scanner Modal) */}
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

          {/* Error Modal (Asli) */}
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

          {/* Success Modal (Asli) */}
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
                      <span className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-2xl tracking-wider">
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
                  {ekspedisiMaster.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.name}
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

            {/* --- START: Qty Gabungan (Pallet Input & Carton Input) --- */}
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
            {/* --- END: Qty Gabungan --- */}


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

            {/* Location Fields (Tetap) */}
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
                  />
                  {errors.cluster && (
                    <p className="text-red-500 text-xs mt-1">{errors.cluster}</p>
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

            {/* Calculated Qty & Logika Receh */}
            {totalCartons > 0 && selectedProduct && (
              <div className={`p-4 border-2 rounded-xl ${isReceh ? 'bg-blue-50 border-blue-300' : 'bg-yellow-50 border-yellow-200'}`}>
                <p className="font-semibold text-sm">
                  Kalkulasi Qty Penerimaan:
                </p>
                <p className={`text-xl font-bold ${isReceh ? 'text-blue-700' : 'text-yellow-900'}`}>
                    {totalPallets.toLocaleString()} Pallet {remainingCartons > 0 ? `+ ${remainingCartons.toLocaleString()} Karton Sisa` : ''}
                </p>
                <p className="text-xs mt-1">
                    Standard 1 Pallet = {qtyPerPalletStd} Karton/Satuan.
                    Total Karton yang diterima: **{totalCartons.toLocaleString()}**
                </p>
                {isReceh && (
                    <p className="text-xs mt-1 font-semibold text-blue-700">
                        Pallet ini akan ditandai **RECEH** (Warna Biru) karena terdapat sisa karton ({remainingCartons.toLocaleString()} unit).
                    </p>
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

            {/* Recommended Location dan Submit Button (Tetap) */}
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