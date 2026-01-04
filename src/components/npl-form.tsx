// File: src/components/npl-form.tsx
// NPL (Nota Pengembalian Lapangan) - Inbound Secondary untuk return stock dari lapangan

"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { submitNplAction } from "@/app/npl/actions";
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
}

export function NplForm({ 
  warehouseId, 
  products, 
  initialStocks, 
  clusterConfigs, 
  productHomes, 
  initialHistory 
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

  // Edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

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
    // Default baris count adalah 9
    return Array.from({ length: 9 }, (_, i) => `B${i + 1}`);
  }, [manualCluster, manualLorong]);

  const palletOptions = useMemo(() => {
    if (!manualCluster || !manualLorong || !manualBaris) return [];
    // Default pallet capacity adalah 3
    return Array.from({ length: 3 }, (_, i) => `P${i + 1}`);
  }, [manualCluster, manualLorong, manualBaris]);

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

  // Find multiple recommended locations (same logic as inbound)
  const findMultipleRecommendedLocations = (clusterChar: string, palletsNeeded: number): MultiLocationRecommendation => {
    const locations: RecommendedLocation[] = [];
    let remainingPallets = palletsNeeded;

    const clusterConfig = clusterConfigs.find((c: any) => c.cluster_char === clusterChar);
    if (!clusterConfig) {
      return { locations: [], totalPalletsPlaced: 0, needsMultipleLocations: false };
    }

    const productHome = selectedProduct ? productHomes.find((h: any) => h.product_id === selectedProduct.id) : null;

    const lorongStart = productHome ? productHome.lorong_start : 1;
    const lorongEnd = productHome ? productHome.lorong_end : clusterConfig.default_lorong_count;

    // PHASE 1: Primary product home locations
    for (let lorongNum = lorongStart; lorongNum <= lorongEnd; lorongNum++) {
      if (remainingPallets === 0) break;
      // Skip In Transit area (Cluster C, Lorong 8-11)
      if (clusterChar === "C" && lorongNum >= 8 && lorongNum <= 11) continue;

      const maxBaris = 9; // Default baris count
      const barisStart = productHome ? productHome.baris_start : 1;
      const barisEnd = productHome ? Math.min(productHome.baris_end, maxBaris) : maxBaris;

      for (let barisNum = barisStart; barisNum <= barisEnd; barisNum++) {
        if (remainingPallets === 0) break;

        const maxPallet = 3; // Default pallet capacity
        const productMaxPallet = productHome?.max_pallet_per_location || 999;
        const effectiveMaxPallet = Math.min(maxPallet, productMaxPallet);

        for (let palletNum = 1; palletNum <= effectiveMaxPallet; palletNum++) {
          if (remainingPallets === 0) break;

          const lorong = `L${lorongNum}`;
          const baris = `B${barisNum}`;
          const level = `P${palletNum}`;

          const locationExists = initialStocks.some(
            (item: any) =>
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

    // PHASE 2: In Transit if needed (Cluster C, Lorong 8-11)
    if (remainingPallets > 0) {
      const transitCluster = "C";
      const transitStart = 8;
      const transitEnd = 11;
      
      for (let lorongNum = transitStart; lorongNum <= transitEnd; lorongNum++) {
        if (remainingPallets === 0) break;

        const maxBaris = 9; // Default baris count
        for (let barisNum = 1; barisNum <= maxBaris; barisNum++) {
          if (remainingPallets === 0) break;

          const maxPallet = 3; // Default pallet capacity
          for (let palletNum = 1; palletNum <= maxPallet; palletNum++) {
            if (remainingPallets === 0) break;

            const lorong = `L${lorongNum}`;
            const baris = `B${barisNum}`;
            const level = `P${palletNum}`;

            const locationExists = initialStocks.some(
              (item: any) =>
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

    return {
      locations,
      totalPalletsPlaced: palletsNeeded - remainingPallets,
      needsMultipleLocations: locations.length > 1,
    };
  };

  // Handle recommend button
  const handleRecommend = () => {
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

    const homeCluster = selectedProduct?.default_cluster || "A";

    const recommendation = findMultipleRecommendedLocations(homeCluster, totalPalletsNeeded);

    if (recommendation.totalPalletsPlaced === 0) {
      error("Tidak ada lokasi kosong yang tersedia.");
      setMultiLocationRec(null);
      return;
    }

    if (recommendation.totalPalletsPlaced < totalPalletsNeeded) {
      error(
        `Hanya ditemukan ${recommendation.totalPalletsPlaced} lokasi dari ${totalPalletsNeeded} yang dibutuhkan. Sebagian akan masuk In Transit.`
      );
    }

    setMultiLocationRec(recommendation);
    success(`Ditemukan ${recommendation.locations.length} lokasi penempatan.`);
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
      ? multiLocationRec.locations.map(loc => ({
          cluster: loc.clusterChar,
          lorong: parseInt(loc.lorong.replace('L', '')),
          baris: parseInt(loc.baris.replace('B', '')),
          level: parseInt(loc.level.replace('P', '')),
          qtyCarton: loc.qtyCarton,
          isReceh: loc.isReceh
        }))
      : [{
          cluster: manualCluster,
          lorong: parseInt(manualLorong.replace('L', '')),
          baris: parseInt(manualBaris.replace('B', '')),
          level: parseInt(manualPallet.replace('P', '')),
          qtyCarton: totalCartons,
          isReceh: totalCartons < qtyPerPalletStd
        }];

    // 2. Tentukan base status berdasarkan durasi hari (sama seperti Inbound)
    const now = new Date();
    const expDate = new Date(expiredDate);
    const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
    const baseStatus = diffDays > 180 ? "hold" : "release";

    const formData = {
      warehouseId,
      productId: selectedProduct.id,
      bbProduk,
      totalQty: totalCartons,
      expiredDate,
      driverName: namaPengemudi,
      vehicleNumber: nomorPolisi,
      notes,
      baseStatus
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

  // Edit NPL (disabled - requires server action implementation)
  const handleEditClick = (npl: any) => {
    error("Fitur edit belum tersedia. Silakan hubungi administrator.");
    return;
    // setSelectedNplForAction(npl);
    // setShowEditConfirmModal(true);
  };

  const confirmEdit = () => {
    if (!selectedNplForAction) return;

    // TODO: Implement edit with server action
    error("Fitur edit memerlukan implementasi server action untuk update database.");
    
    setShowEditConfirmModal(false);
    setSelectedNplForAction(null);
  };

  // Cancel NPL (disabled - requires server action implementation)
  const handleCancelClick = (npl: any) => {
    error("Fitur batal belum tersedia. Silakan hubungi administrator.");
    return;
    // setSelectedNplForAction(npl);
    // setShowBatalConfirmModal(true);
  };

  const confirmBatal = () => {
    if (!selectedNplForAction) return;

    // TODO: Implement cancel with server action
    error("Fitur batal memerlukan implementasi server action untuk delete dari database.");

    setShowBatalConfirmModal(false);
    setSelectedNplForAction(null);
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
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center">
              <RotateCcw className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{isEditMode ? "Edit NPL" : "NPL (Return)"}</h1>
              <p className="text-sm text-gray-600">Nota Pengembalian Lapangan - Inbound Secondary</p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-6 mb-8">
                {/* Driver Info */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-teal-600" />
                    Informasi Pengemudi
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Package className="w-5 h-5 text-teal-600" />
                    Informasi Produk
                  </h3>
                  <div className="space-y-4">
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
