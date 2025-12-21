"use client";

import { useMemo, useState, useEffect } from "react";
import { productMasterData } from "@/lib/mock/product-master";
import { useToast, ToastContainer } from "@/components/toast";

type AuditItem = {
  productCode: string;
  productName: string;
  auditQty: number | string | null; // Allow empty state untuk validasi
};

export default function StockOpnamePage() {
  const { toasts, removeToast } = useToast();
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
      auditQty: '' as string, // Kosong agar user wajib mengisi
    }))
  );

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "FILLED" | "EMPTY">("ALL");

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

  // Filtered items
  const filteredItems = useMemo(() => {
    return auditItems.filter((item) => {
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
  }, [auditItems, searchQuery, statusFilter]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi
    const errors: string[] = [];
    
    if (!auditorName.trim()) {
      errors.push("Nama auditor harus diisi!");
    }

    // Cek apakah semua produk sudah diisi (termasuk yang 0)
    const unfilledProducts = auditItems.filter((item) => {
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

    // Save auditor to history
    saveToHistory(auditorName);

    const payload = {
      id: `AUDIT-${Date.now()}`,
      auditorName,
      auditDate: today,
      auditTime: currentTime,
      items: auditItems.map((item) => ({
        productCode: item.productCode,
        productName: item.productName,
        auditQty: item.auditQty,
      })),
    };

    console.log("✅ Mock Audit Submission:", payload);

    // Simpan ke localStorage untuk history
    if (typeof window !== 'undefined') {
      const existingHistory = localStorage.getItem('wms_prestock_opname_history');
      const history = existingHistory ? JSON.parse(existingHistory) : [];
      history.unshift(payload); // Tambah di awal array
      localStorage.setItem('wms_prestock_opname_history', JSON.stringify(history));
    }

    // Show success modal
    setShowSuccessModal(true);

    // Reset form after delay
    setTimeout(() => {
      setShowSuccessModal(false);
      setAuditItems((prev) =>
        prev.map((item) => ({ ...item, auditQty: '' as string }))
      );
      setAuditorName("");
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
            Submit. Sistem auto-capture waktu saat submit. Rekonsel akan dilakukan oleh Superadmin.
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

          {/* Table Audit */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm -mx-4 sm:mx-0">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b-2 border-slate-200">
                <tr className="text-left text-xs font-semibold text-slate-700">
                  <th className="px-4 py-3 whitespace-nowrap border-r-2 border-slate-300">Kode Produk</th>
                  <th className="px-4 py-3 whitespace-nowrap border-r-2 border-slate-300">Nama Produk</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap bg-blue-50">
                    Stock (Carton)<br/>
                    <span className="text-[10px] font-normal text-slate-500">Input Total Carton</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  return (
                    <tr
                      key={item.productCode}
                      className="border-t border-slate-100 hover:bg-blue-50/50 transition-colors"
                    >
                      <td className="px-4 py-3 align-middle font-mono text-xs text-slate-700 border-r-2 border-slate-200">
                        {item.productCode}
                      </td>
                      <td className="px-4 py-3 align-middle border-r-2 border-slate-200">
                        <div className="max-w-xs truncate font-medium text-slate-900 text-sm">
                          {item.productName}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle text-center bg-blue-50/30">
                        <input
                          type="number"
                          min={0}
                          className={`w-32 rounded-lg border-2 px-3 py-2 text-center text-sm font-bold focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all ${
                            (item.auditQty === '' || item.auditQty === null || item.auditQty === undefined)
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
            type="submit"
            className="inline-flex items-center justify-center rounded-xl px-8 py-3.5 text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 shadow-lg hover:shadow-xl transition-all"
          >
            💾 Submit Audit (Waktu: {currentTime})
          </button>
          <button
            type="button"
            onClick={() => {
              setAuditItems((prev) =>
                prev.map((item) => ({ ...item, auditQty: '' as string }))
              );
              setAuditorName("");
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
                  <span className="text-gray-600">Total Produk:</span>
                  <span className="font-semibold text-gray-800">
                    {auditItems.length} produk
                  </span>
                </div>
              </div>
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