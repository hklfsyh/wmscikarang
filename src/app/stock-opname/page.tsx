"use client";

import { useMemo, useState, useEffect } from "react";
import { productMasterData } from "@/lib/mock/product-master";
import { stockListData } from "@/lib/mock/stocklistmock";
import { useToast, ToastContainer } from "@/components/toast";

type AuditItem = {
  productCode: string;
  productName: string;
  auditQty: number | string | null; // Allow empty state untuk validasi
  reason: string;
};

type AuditHistory = {
  id: string;
  auditorName: string;
  auditDate: string;
  auditTime: string;
  items: AuditItem[];
};

// Mock history tidak digunakan lagi, data diambil dari stockListData

export default function StockOpnamePage() {
  const { showToast, toasts, removeToast } = useToast();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [currentTime, setCurrentTime] = useState("");

  // State untuk auditor dan history
  const [auditorName, setAuditorName] = useState("");
  const [auditorHistory, setAuditorHistory] = useState<string[]>([]);
  const [showAuditorSuggestions, setShowAuditorSuggestions] = useState(false);
  
  // Modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);

  // State untuk audit items (inisialisasi kosong, bukan 0)
  const [auditItems, setAuditItems] = useState<AuditItem[]>(() =>
    productMasterData.map((product) => ({
      productCode: product.productCode,
      productName: product.productName,
      auditQty: '' as any, // Kosong agar user wajib mengisi
      reason: "",
    }))
  );

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "FILLED" | "EMPTY">("ALL");

  // Audit history state
  const [lastAudit, setLastAudit] = useState<AuditHistory | null>(null);
  
  // State untuk trigger rekonsel
  const [showReconciliation, setShowReconciliation] = useState(false);

  // Update waktu setiap detik
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}`);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);

    return () => clearInterval(timer);
  }, []);

  // Load last audit saat mount - gunakan data dari stockListData (total per produk)
  useEffect(() => {
    // Hitung total stock per produk dari stockListData
    const stockTotals: { [key: string]: number } = {};
    
    stockListData.forEach((stock) => {
      if (!stockTotals[stock.productCode]) {
        stockTotals[stock.productCode] = 0;
      }
      stockTotals[stock.productCode] += stock.qtyCarton;
    });

    // Buat audit history dari total stock
    const generatedAudit: AuditHistory = {
      id: "AUDIT-SYSTEM",
      auditorName: "System (Shift Sebelumnya)",
      auditDate: today,
      auditTime: "00:00",
      items: productMasterData.map((product) => ({
        productCode: product.productCode,
        productName: product.productName,
        auditQty: stockTotals[product.productCode] || 0,
        reason: "",
      })),
    };

    setLastAudit(generatedAudit);
  }, [today]);

  // Load history from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAuditors = localStorage.getItem('wms_auditor_history');
      if (savedAuditors) setAuditorHistory(JSON.parse(savedAuditors));
    }
  }, []);

  // Save to history helper
  const saveToHistory = (value: string) => {
    if (!value.trim()) return;
    const updated = [value, ...auditorHistory.filter(v => v !== value)].slice(0, 10);
    setAuditorHistory(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('wms_auditor_history', JSON.stringify(updated));
    }
  };

  // Filtered items dengan sorting: BEDA dulu, baru SAMA
  const filteredItems = useMemo(() => {
    const filtered = auditItems.filter((item) => {
      if (statusFilter === "FILLED" && item.auditQty === 0) return false;
      if (statusFilter === "EMPTY" && item.auditQty !== 0) return false;

      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const productMatch =
          item.productName.toLowerCase().includes(query) ||
          item.productCode.toLowerCase().includes(query);
        return productMatch;
      }

      return true;
    });

    // Jika rekonsel aktif, urutkan: BEDA dulu (berdasarkan besar selisih), baru SAMA
    if (showReconciliation) {
      return filtered.sort((a, b) => {
        const qtyA = typeof a.auditQty === 'number' ? a.auditQty : Number(a.auditQty || 0);
        const qtyB = typeof b.auditQty === 'number' ? b.auditQty : Number(b.auditQty || 0);
        
        // Skip produk yang tidak diaudit
        if (qtyA === 0 && qtyB === 0) return 0;
        if (qtyA === 0) return 1;
        if (qtyB === 0) return -1;

        // Hitung selisih untuk sorting
        const lastItemA = lastAudit?.items.find(i => i.productCode === a.productCode);
        const lastItemB = lastAudit?.items.find(i => i.productCode === b.productCode);
        const stockShiftA_A = typeof lastItemA?.auditQty === 'number' ? lastItemA.auditQty : Number(lastItemA?.auditQty || 0);
        const stockShiftA_B = typeof lastItemB?.auditQty === 'number' ? lastItemB.auditQty : Number(lastItemB?.auditQty || 0);
        const diffA = qtyA - stockShiftA_A;
        const diffB = qtyB - stockShiftA_B;
        const isMatchA = diffA === 0;
        const isMatchB = diffB === 0;

        // Prioritas 1: BEDA dulu, SAMA kemudian
        if (!isMatchA && isMatchB) return -1; // A beda, B sama -> A di atas
        if (isMatchA && !isMatchB) return 1;  // A sama, B beda -> B di atas
        
        // Prioritas 2: Jika sama-sama BEDA, urutkan berdasarkan absolute diff terbesar
        if (!isMatchA && !isMatchB) {
          return Math.abs(diffB) - Math.abs(diffA);
        }
        
        // Prioritas 3: Jika sama-sama SAMA, pertahankan urutan
        return 0;
      });
    }

    return filtered;
  }, [auditItems, searchQuery, statusFilter, showReconciliation, lastAudit]);

  // Handle auditor input dengan autocomplete
  const handleAuditorChange = (value: string) => {
    setAuditorName(value);
    setShowAuditorSuggestions(value.length > 0);
  };

  const selectAuditor = (name: string) => {
    setAuditorName(name);
    setShowAuditorSuggestions(false);
  };

  const filteredAuditorSuggestions = auditorHistory.filter((name) =>
    name.toLowerCase().includes(auditorName.toLowerCase())
  );

  // Handle audit qty change
  const handleAuditQtyChange = (productCode: string, value: string) => {
    const num = Number(value.replace(/[^\d]/g, "")) || 0;
    setAuditItems((prev) =>
      prev.map((item) =>
        item.productCode === productCode ? { ...item, auditQty: num } : item
      )
    );
  };

  // Handle reason change
  const handleReasonChange = (productCode: string, value: string) => {
    setAuditItems((prev) =>
      prev.map((item) =>
        item.productCode === productCode ? { ...item, reason: value } : item
      )
    );
  };

  // Calculate differences with last audit (hanya kalau showReconciliation = true)
  const diffItems = useMemo(() => {
    if (!lastAudit || !showReconciliation) return [];

    return auditItems
      .map((item) => {
        const lastItem = lastAudit.items.find(
          (i) => i.productCode === item.productCode
        );
        const lastQty = typeof lastItem?.auditQty === 'number' ? lastItem.auditQty : Number(lastItem?.auditQty || 0);
        const currentQty = typeof item.auditQty === 'number' ? item.auditQty : Number(item.auditQty || 0);
        const diff = currentQty - lastQty;
        const isMatch = diff === 0;

        return {
          ...item,
          lastQty,
          diff,
          isMatch,
        };
      })
      .filter((item) => {
        const qty = typeof item.auditQty === 'number' ? item.auditQty : Number(item.auditQty || 0);
        return qty > 0;
      }); // Tampilkan SEMUA yang diaudit (hijau & merah)
  }, [auditItems, lastAudit, showReconciliation]);

  // Validasi: cek apakah ada selisih yang belum ada reason
  const hasInvalidDiff = showReconciliation && diffItems.some((item) => !item.isMatch && !item.reason.trim());
  
  // Handler untuk cek rekonsel dengan validasi lengkap
  const handleCheckReconciliation = () => {
    const errors: string[] = [];

    if (!auditorName.trim()) {
      errors.push("Nama auditor harus diisi!");
    }

    // Cek apakah semua produk sudah diisi (termasuk yang 0)
    const unfilledProducts = auditItems.filter((item) => {
      // Cek apakah field kosong (null, undefined, atau string kosong)
      return item.auditQty === null || item.auditQty === undefined || item.auditQty.toString().trim() === '';
    });

    if (unfilledProducts.length > 0) {
      errors.push(`${unfilledProducts.length} produk belum diisi! Semua produk wajib diisi, minimal isi dengan "0" jika tidak ada stock.`);
    }

    if (errors.length > 0) {
      setErrorMessages(errors);
      setShowErrorModal(true);
      return;
    }

    setShowReconciliation(true);
    showToast("✓ Rekonsel berhasil dimunculkan! Cek kolom di samping.", "success");
  };

  // Calculate actual system total (hidden dari user, hanya untuk validasi)
  const getSystemTotal = (productCode: string) => {
    return stockListData
      .filter((stock) => stock.productCode === productCode)
      .reduce((sum, stock) => sum + stock.qtyPallet, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi
    const errors: string[] = [];
    
    if (!auditorName.trim()) {
      errors.push("Nama auditor harus diisi!");
    }

    const filledItems = auditItems.filter((item) => {
      const qty = typeof item.auditQty === 'number' ? item.auditQty : Number(item.auditQty || 0);
      return qty > 0;
    });
    if (filledItems.length === 0) {
      errors.push("Minimal 1 produk harus diisi!");
    }

    if (!showReconciliation) {
      errors.push("Klik 'Cek Rekonsel' terlebih dahulu sebelum submit!");
    }

    if (hasInvalidDiff) {
      errors.push("Ada selisih yang belum diisi alasannya! Lihat kolom 'Alasan Selisih'.");
    }

    if (errors.length > 0) {
      setErrorMessages(errors);
      setShowErrorModal(true);
      return;
    }

    // Save auditor to history
    saveToHistory(auditorName);

    const payload = {
      auditorName,
      auditDate: today,
      auditTime: currentTime,
      items: filledItems.map((item) => ({
        productCode: item.productCode,
        productName: item.productName,
        auditQty: item.auditQty,
        reason: item.reason,
        systemTotal: getSystemTotal(item.productCode), // Hidden dari user
      })),
    };

    console.log("✅ Mock Audit Submission:", payload);

    // Update last audit untuk comparison berikutnya
    setLastAudit({
      id: `AUDIT-${Date.now()}`,
      auditorName,
      auditDate: today,
      auditTime: currentTime,
      items: filledItems,
    });

    // Show success modal
    setShowSuccessModal(true);

    // Reset form after delay
    setTimeout(() => {
      setShowSuccessModal(false);
      setAuditItems((prev) =>
        prev.map((item) => ({ ...item, auditQty: 0, reason: "" }))
      );
      setAuditorName("");
      setShowReconciliation(false);
    }, 3000);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <header className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
          📋 Pre-Stock Opname
        </h1>
        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-lg">
          <p className="text-xs text-blue-900">
            💡 <strong>Catatan:</strong> Input semua total carton per produk &rarr;
            Klik "Cek Rekonsel" &rarr; Kolom rekonsel muncul di samping &rarr; Isi alasan
            jika ada selisih &rarr; Submit. Sistem auto-capture waktu saat submit.
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Info Auditor & Waktu */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
            <span className="bg-blue-500 text-white w-8 h-8 rounded-lg flex items-center justify-center text-sm">
              👤
            </span>
            <span>Informasi Auditor</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nama Auditor dengan Autocomplete */}
            <div className="relative">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Nama Auditor *
              </label>
              <input
                type="text"
                value={auditorName}
                onChange={(e) => handleAuditorChange(e.target.value)}
                onFocus={() => setShowAuditorSuggestions(true)}
                onBlur={() => setTimeout(() => setShowAuditorSuggestions(false), 200)}
                placeholder="Masukkan nama auditor..."
                className="w-full rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
              {showAuditorSuggestions && filteredAuditorSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border-2 border-slate-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredAuditorSuggestions.map((name, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectAuditor(name)}
                      className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm border-b border-slate-100 last:border-b-0"
                    >
                      👤 {name}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-500 mt-1">
                💡 Ketik untuk autocomplete dari history auditor
              </p>
            </div>

            {/* Tanggal & Waktu (Read-only) */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Tanggal & Waktu Audit
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={today}
                  readOnly
                  className="flex-1 rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm bg-slate-50 cursor-not-allowed"
                />
                <input
                  type="text"
                  value={currentTime}
                  readOnly
                  className="w-24 rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm bg-slate-50 cursor-not-allowed font-mono font-bold text-center"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                🕐 Waktu auto-capture saat submit
              </p>
            </div>
          </div>
        </section>

        {/* Input Audit (Blind System) */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
            <span className="bg-green-500 text-white w-8 h-8 rounded-lg flex items-center justify-center text-sm">
              📦
            </span>
            <span>Input Audit per Produk (Blind System)</span>
          </h2>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pb-4 border-b border-slate-200">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                🔍 Search Produk
              </label>
              <input
                type="text"
                placeholder="Cari nama atau kode produk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
            </div>
            <div className="sm:w-48">
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                📊 Filter Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "ALL" | "FILLED" | "EMPTY")
                }
                className="w-full rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              >
                <option value="ALL">Semua Produk</option>
                <option value="FILLED">Sudah Diisi</option>
                <option value="EMPTY">Belum Diisi</option>
              </select>
            </div>
            {(searchQuery || statusFilter !== "ALL") && (
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("ALL");
                  }}
                  className="rounded-lg border-2 border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                >
                  🔄 Reset
                </button>
              </div>
            )}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-6 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-900 font-medium">
                ⚠️ Tidak ada produk yang sesuai dengan filter
              </p>
            </div>
          )}

          {/* Table Audit dengan Rekonsel */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm -mx-4 sm:mx-0">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b-2 border-slate-200">
                <tr className="text-left text-xs font-semibold text-slate-700">
                  <th className="px-4 py-3 whitespace-nowrap border-r-2 border-slate-300">Kode Produk</th>
                  <th className="px-4 py-3 whitespace-nowrap border-r-2 border-slate-300">Nama Produk</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap border-r-4 border-slate-400 bg-blue-50">
                    Stock (Carton)<br/>
                    <span className="text-[10px] font-normal text-slate-500">Input Anda</span>
                  </th>
                  {showReconciliation && (
                    <>
                      <th className="px-4 py-3 text-center whitespace-nowrap border-r-2 border-slate-300 bg-amber-50">
                        Stock Shift A<br/>
                        <span className="text-[10px] font-normal text-slate-500">Sebelumnya</span>
                      </th>
                      <th className="px-4 py-3 text-center whitespace-nowrap border-r-2 border-slate-300 bg-purple-50">
                        Rekonsel
                      </th>
                      <th className="px-4 py-3 text-center whitespace-nowrap border-r-2 border-slate-300 bg-orange-50">
                        Selisih
                      </th>
                      <th className="px-4 py-3 whitespace-nowrap bg-rose-50">
                        Alasan Selisih *
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  // Cari di audit items untuk cek last audit
                  let stockShiftA = 0;
                  let currentDiff = 0;
                  let isMatch = true;
                  let showReconsilData = false;
                  const itemQty = typeof item.auditQty === 'number' ? item.auditQty : (item.auditQty ? Number(item.auditQty) : 0);
                  
                  if (showReconciliation) {
                    showReconsilData = true;
                    const lastItem = lastAudit?.items.find(i => i.productCode === item.productCode);
                    stockShiftA = typeof lastItem?.auditQty === 'number' ? lastItem.auditQty : Number(lastItem?.auditQty || 0);
                    currentDiff = itemQty - stockShiftA;
                    isMatch = currentDiff === 0;
                  }
                  
                  return (
                    <tr
                      key={item.productCode}
                      className="border-t border-slate-100 hover:bg-green-50/50 transition-colors"
                    >
                      <td className="px-4 py-3 align-middle font-mono text-xs text-slate-700 border-r-2 border-slate-200">
                        {item.productCode}
                      </td>
                      <td className="px-4 py-3 align-middle border-r-2 border-slate-200">
                        <div className="max-w-xs truncate font-medium text-slate-900 text-sm">
                          {item.productName}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle text-center border-r-4 border-slate-300 bg-blue-50/30">
                        <input
                          type="number"
                          min={0}
                          disabled={showReconciliation}
                          className={`w-32 rounded-lg border-2 px-3 py-2 text-center text-sm font-bold focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all ${
                            showReconciliation 
                              ? 'bg-slate-100 cursor-not-allowed border-slate-300' 
                              : (item.auditQty === '' || item.auditQty === null || item.auditQty === undefined)
                                ? 'border-amber-400 bg-amber-50'
                                : 'border-slate-300'
                          }`}
                          value={item.auditQty === '' || item.auditQty === null || item.auditQty === undefined ? '' : item.auditQty}
                          onChange={(e) =>
                            handleAuditQtyChange(item.productCode, e.target.value)
                          }
                          placeholder="Wajib diisi (0 jika kosong)"
                        />
                      </td>
                      {showReconciliation && (
                        <>
                          {showReconsilData ? (
                            <>
                              <td className="px-4 py-3 align-middle text-center font-bold text-slate-700 border-r-2 border-slate-200 bg-amber-50/30">
                                {stockShiftA}
                              </td>
                              <td className="px-4 py-3 align-middle text-center border-r-2 border-slate-200 bg-purple-50/30">
                                <span
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                                    isMatch
                                      ? "bg-emerald-500 text-white"
                                      : "bg-rose-500 text-white"
                                  }`}
                                >
                                  {isMatch ? "✓ SAMA" : "✗ BEDA"}
                                </span>
                              </td>
                              <td className="px-4 py-3 align-middle text-center border-r-2 border-slate-200 bg-orange-50/30">
                                {currentDiff !== 0 ? (
                                  <span className="text-sm font-bold text-rose-700">
                                    {currentDiff > 0 ? `+${currentDiff}` : currentDiff}
                                  </span>
                                ) : (
                                  <span className="text-sm font-bold text-emerald-700">0</span>
                                )}
                              </td>
                              <td className="px-4 py-3 align-middle bg-rose-50/30">
                                {!isMatch ? (
                                  <div>
                                    <input
                                      type="text"
                                      className={`w-full rounded-lg border-2 px-3 py-2 text-xs focus:ring-2 transition-all ${
                                        !item.reason.trim()
                                          ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                                          : "border-slate-300 focus:border-blue-500 focus:ring-blue-200"
                                      }`}
                                      placeholder="Wajib diisi! Contoh: Barang masuk saat shift..."
                                      value={item.reason}
                                      onChange={(e) =>
                                        handleReasonChange(item.productCode, e.target.value)
                                      }
                                    />
                                    {!item.reason.trim() && (
                                      <p className="text-[10px] text-red-600 mt-1 font-semibold">
                                        ❌ Wajib isi alasan!
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-500 italic">-</span>
                                )}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3 text-center text-xs text-slate-400 border-r-2 border-slate-200 bg-amber-50/30">-</td>
                              <td className="px-4 py-3 text-center text-xs text-slate-400 border-r-2 border-slate-200 bg-purple-50/30">-</td>
                              <td className="px-4 py-3 text-center text-xs text-slate-400 border-r-2 border-slate-200 bg-orange-50/30">-</td>
                              <td className="px-4 py-3 text-center text-xs text-slate-400 bg-rose-50/30">-</td>
                            </>
                          )}
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Tombol Aksi */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            type="button"
            onClick={handleCheckReconciliation}
            disabled={showReconciliation}
            className={`inline-flex items-center justify-center rounded-xl px-8 py-3.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all ${
              showReconciliation
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-amber-500 hover:bg-amber-600"
            }`}
          >
            ⚖️ Cek Rekonsel dengan Shift Sebelumnya
          </button>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl px-8 py-3.5 text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 shadow-lg hover:shadow-xl transition-all"
          >
            💾 Submit Audit (Waktu: {currentTime})
          </button>
          <button
            type="button"
            onClick={() => {
              setAuditItems((prev) =>
                prev.map((item) => ({ ...item, auditQty: 0, reason: "" }))
              );
              setAuditorName("");
              setShowReconciliation(false);
            }}
            className="inline-flex items-center justify-center rounded-xl border-2 border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
          >
            🔄 Reset Semua
          </button>
        </div>
      </form>

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="bg-linear-to-r from-red-500 to-pink-600 p-6">
              <div className="flex flex-col items-center text-center">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
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
                    <span className="text-red-500 font-bold">&bull;</span>
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

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="bg-linear-to-r from-green-500 to-emerald-600 p-6">
              <div className="flex flex-col items-center text-center">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">
                  Pre-Stock Opname Berhasil!
                </h3>
                <p className="text-green-100 text-sm">
                  Data audit telah tersimpan
                </p>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4 space-y-2 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Auditor:</span>
                  <span className="font-semibold text-gray-800">{auditorName}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Tanggal:</span>
                  <span className="font-semibold text-gray-800">{today}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Waktu:</span>
                  <span className="font-semibold text-gray-800">{currentTime}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Total Produk Diaudit:</span>
                  <span className="font-semibold text-gray-800">
                    {auditItems.filter(item => {
                      const qty = typeof item.auditQty === 'number' ? item.auditQty : Number(item.auditQty || 0);
                      return qty > 0;
                    }).length} produk
                  </span>
                </div>
                {diffItems.length > 0 && (
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-600">Selisih Ditemukan:</span>
                    <span className="font-semibold text-rose-700">
                      {diffItems.filter(item => !item.isMatch).length} produk
                    </span>
                  </div>
                )}
              </div>
              {diffItems.length > 0 && diffItems.filter(item => !item.isMatch).length > 0 && (
                <>
                  <p className="text-sm text-gray-700 font-semibold mb-2">
                    Produk dengan Selisih:
                  </p>
                  <div className="mb-4 space-y-2 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3">
                    {diffItems.filter(item => !item.isMatch).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center rounded-md p-2 bg-rose-100">
                        <span className="text-xs font-medium text-gray-800 truncate max-w-[60%]">
                          {item.productName}
                        </span>
                        <span className="text-xs font-bold text-rose-700">
                          {item.diff > 0 ? `+${item.diff}` : item.diff}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <p className="text-center text-sm text-gray-500 mt-4">
                Menutup otomatis dalam 3 detik...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}