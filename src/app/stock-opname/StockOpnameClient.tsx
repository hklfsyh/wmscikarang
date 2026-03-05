"use client";

import { useMemo, useState, useEffect } from "react";
import { useToast, ToastContainer } from "@/components/toast";
import { submitStockOpname } from "./actions";
import { useRouter } from "next/navigation";

type ClusterEntry = {
  id: string;
  productId: string;
  auditQty: number | string;
};

type ClusterData = {
  clusterId: string;
  clusterChar: string;
  clusterName: string;
  entries: ClusterEntry[];
  isOpen: boolean;
};

interface Props {
  products: { id: string; product_code: string; product_name: string }[];
  clusterConfigs: { id: string; cluster_name: string; cluster_char?: string }[];
}

export default function StockOpnameClient({ products, clusterConfigs }: Props) {
  const router = useRouter();
  const { toasts, removeToast } = useToast();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [currentTime, setCurrentTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State auditor + history
  const [auditorName, setAuditorName] = useState("");
  const [auditorHistory, setAuditorHistory] = useState<string[]>([]);
  const [showAuditorSuggestions, setShowAuditorSuggestions] = useState(false);

  // Modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [successOpnameCode, setSuccessOpnameCode] = useState("");
  const [successTotalProducts, setSuccessTotalProducts] = useState(0);

  // State cluster entries
  const [clusterData, setClusterData] = useState<ClusterData[]>(() =>
    clusterConfigs.map((c) => ({
      clusterId: c.id,
      clusterChar: c.cluster_char || c.cluster_name,
      clusterName: c.cluster_name,
      entries: [],
      isOpen: false,
    }))
  );

  // Counter untuk unique ID per entry row
  const [entryCounter, setEntryCounter] = useState(0);

  // Update waktu setiap detik
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load auditor history dari localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("wms_auditor_history");
      if (saved) setAuditorHistory(JSON.parse(saved));
    }
  }, []);

  const saveToHistory = (value: string) => {
    if (!value.trim()) return;
    const updated = [value, ...auditorHistory.filter((v) => v !== value)].slice(0, 10);
    setAuditorHistory(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("wms_auditor_history", JSON.stringify(updated));
    }
  };

  const filteredAuditorSuggestions = auditorHistory.filter((name) =>
    name.toLowerCase().includes(auditorName.toLowerCase())
  );

  // Toggle accordion
  const toggleCluster = (clusterId: string) => {
    setClusterData((prev) =>
      prev.map((c) =>
        c.clusterId === clusterId ? { ...c, isOpen: !c.isOpen } : c
      )
    );
  };

  // Tambah baris entry baru di cluster
  const addEntry = (clusterId: string) => {
    const newId = `entry-${entryCounter}`;
    setEntryCounter((n) => n + 1);
    setClusterData((prev) =>
      prev.map((c) =>
        c.clusterId === clusterId
          ? { ...c, entries: [...c.entries, { id: newId, productId: "", auditQty: "" }] }
          : c
      )
    );
  };

  // Hapus baris entry
  const removeEntry = (clusterId: string, entryId: string) => {
    setClusterData((prev) =>
      prev.map((c) =>
        c.clusterId === clusterId
          ? { ...c, entries: c.entries.filter((e) => e.id !== entryId) }
          : c
      )
    );
  };

  // Update field entry
  const updateEntry = (
    clusterId: string,
    entryId: string,
    field: "productId" | "auditQty",
    value: string
  ) => {
    setClusterData((prev) =>
      prev.map((c) =>
        c.clusterId === clusterId
          ? {
              ...c,
              entries: c.entries.map((e) =>
                e.id === entryId ? { ...e, [field]: value } : e
              ),
            }
          : c
      )
    );
  };

  // Produk yang sudah dipilih dalam satu cluster (untuk disable di dropdown)
  const getSelectedProductsInCluster = (clusterId: string, excludeEntryId?: string) => {
    const cluster = clusterData.find((c) => c.clusterId === clusterId);
    if (!cluster) return new Set<string>();
    return new Set(
      cluster.entries
        .filter((e) => e.id !== excludeEntryId && e.productId)
        .map((e) => e.productId)
    );
  };

  // Kalkulasi preview total per produk dari semua cluster
  const productTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    clusterData.forEach((c) => {
      c.entries.forEach((e) => {
        if (e.productId && e.auditQty !== "") {
          totals[e.productId] = (totals[e.productId] || 0) + (Number(e.auditQty) || 0);
        }
      });
    });
    return totals;
  }, [clusterData]);

  // Total baris entry yang sudah terisi
  const totalFilledEntries = useMemo(
    () =>
      clusterData.reduce(
        (sum, c) =>
          sum + c.entries.filter((e) => e.productId && e.auditQty !== "").length,
        0
      ),
    [clusterData]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: string[] = [];

    if (!auditorName.trim()) {
      errors.push("Nama auditor harus diisi!");
    }

    clusterData.forEach((c) => {
      c.entries.forEach((e, idx) => {
        if (!e.productId && e.auditQty !== "") {
          errors.push(`Cluster ${c.clusterName}: baris ${idx + 1} belum memilih produk.`);
        }
        if (e.productId && e.auditQty === "") {
          const prod = products.find((p) => p.id === e.productId);
          errors.push(
            `Cluster ${c.clusterName}: qty produk "${prod?.product_name || e.productId}" belum diisi.`
          );
        }
      });
    });

    const totalEntries = clusterData.reduce((sum, c) => sum + c.entries.length, 0);
    if (totalEntries === 0) {
      errors.push("Belum ada data yang diinput. Tambahkan produk di minimal satu cluster.");
    }

    if (errors.length > 0) {
      setErrorMessages(errors);
      setShowErrorModal(true);
      return;
    }

    saveToHistory(auditorName);
    setIsSubmitting(true);

    try {
      // Aggregate semua entries → total per productId lintas cluster
      const aggregated: Record<string, number> = {};
      clusterData.forEach((c) => {
        c.entries.forEach((e) => {
          if (e.productId) {
            aggregated[e.productId] = (aggregated[e.productId] || 0) + (Number(e.auditQty) || 0);
          }
        });
      });

      const itemsToSubmit = Object.entries(aggregated).map(([productId, auditQty]) => ({
        productId,
        auditQty,
      }));

      const result = await submitStockOpname(auditorName, itemsToSubmit);

      if (result.success) {
        setSuccessOpnameCode(result.opnameCode || "");
        setSuccessTotalProducts(itemsToSubmit.length);
        setShowSuccessModal(true);

        setTimeout(() => {
          setShowSuccessModal(false);
          setClusterData(
            clusterConfigs.map((c) => ({
              clusterId: c.id,
              clusterChar: c.cluster_char || c.cluster_name,
              clusterName: c.cluster_name,
              entries: [],
              isOpen: false,
            }))
          );
          setAuditorName("");
          router.refresh();
        }, 3000);
      } else {
        setErrorMessages([result.message || "Terjadi kesalahan saat menyimpan audit"]);
        setShowErrorModal(true);
      }
    } catch (err: any) {
      setErrorMessages(["Terjadi kesalahan sistem: " + err.message]);
      setShowErrorModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setClusterData(
      clusterConfigs.map((c) => ({
        clusterId: c.id,
        clusterChar: c.cluster_char || c.cluster_name,
        clusterName: c.cluster_name,
        entries: [],
        isOpen: false,
      }))
    );
    setAuditorName("");
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
            💡 <strong>Catatan:</strong> Buka accordion cluster, klik{" "}
            <strong>+</strong> untuk menambah produk di cluster tersebut, lalu isi
            jumlah carton. Produk yang tidak ada di cluster tidak perlu diisi.
            Total per produk dari semua cluster akan dikalkulasi otomatis saat submit.
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Info Auditor */}
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
                onChange={(e) => {
                  setAuditorName(e.target.value);
                  setShowAuditorSuggestions(e.target.value.length > 0);
                }}
                onFocus={() => setShowAuditorSuggestions(true)}
                onBlur={() => setTimeout(() => setShowAuditorSuggestions(false), 200)}
                placeholder="Masukkan nama auditor..."
                disabled={isSubmitting}
                className="w-full rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
              />
              {showAuditorSuggestions && filteredAuditorSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border-2 border-slate-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredAuditorSuggestions.map((name, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setAuditorName(name);
                        setShowAuditorSuggestions(false);
                      }}
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

            {/* Tanggal & Waktu */}
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

        {/* Accordion Cluster */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="bg-green-500 text-white w-8 h-8 rounded-lg flex items-center justify-center text-sm">
                📦
              </span>
              <span>Input Audit per Cluster</span>
            </h2>
            {totalFilledEntries > 0 && (
              <span className="text-xs bg-green-100 text-green-700 font-semibold px-3 py-1 rounded-full border border-green-200">
                {totalFilledEntries} baris terisi &middot; {Object.keys(productTotals).length} produk
              </span>
            )}
          </div>

          {clusterConfigs.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center text-sm text-amber-800">
              ⚠️ Tidak ada konfigurasi cluster ditemukan untuk warehouse ini.
            </div>
          )}

          {clusterData.map((cluster) => {
            const filledCount = cluster.entries.filter(
              (e) => e.productId && e.auditQty !== ""
            ).length;

            return (
              <div
                key={cluster.clusterId}
                className="bg-white rounded-xl border-2 border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleCluster(cluster.clusterId)}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-between px-4 sm:px-6 py-4 text-left hover:bg-slate-50 transition-colors disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-500 text-white font-bold text-base shadow">
                      {cluster.clusterChar}
                    </span>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">
                        {cluster.clusterChar}{cluster.clusterName ? ` - ${cluster.clusterName}` : ""}
                      </p>
                      <p className="text-xs text-slate-500">
                        {cluster.entries.length === 0
                          ? "Belum ada data — klik untuk membuka"
                          : `${cluster.entries.length} baris · ${filledCount} terisi`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {filledCount > 0 && (
                      <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full border border-green-200">
                        ✓ {filledCount}
                      </span>
                    )}
                    <svg
                      className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                        cluster.isOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>

                {/* Accordion Content */}
                {cluster.isOpen && (
                  <div className="border-t border-slate-200 px-4 sm:px-6 py-4 space-y-3 bg-slate-50/50">
                    {cluster.entries.length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-3">
                        Belum ada produk. Klik tombol <strong>+</strong> untuk menambahkan.
                      </p>
                    )}

                    {/* Entry rows */}
                    {cluster.entries.map((entry, idx) => {
                      const selectedInCluster = getSelectedProductsInCluster(
                        cluster.clusterId,
                        entry.id
                      );
                      const isIncomplete =
                        (entry.productId && entry.auditQty === "") ||
                        (!entry.productId && entry.auditQty !== "");

                      return (
                        <div
                          key={entry.id}
                          className={`flex items-center gap-2 sm:gap-3 p-3 rounded-lg border-2 bg-white transition-colors ${
                            isIncomplete
                              ? "border-amber-400 bg-amber-50/30"
                              : entry.productId && entry.auditQty !== ""
                              ? "border-green-300"
                              : "border-slate-200"
                          }`}
                        >
                          {/* Nomor baris */}
                          <span className="text-xs text-slate-400 font-mono w-5 text-center shrink-0">
                            {idx + 1}
                          </span>

                          {/* Dropdown Produk */}
                          <select
                            value={entry.productId}
                            onChange={(e) =>
                              updateEntry(cluster.clusterId, entry.id, "productId", e.target.value)
                            }
                            disabled={isSubmitting}
                            className="flex-1 min-w-0 rounded-lg border-2 border-slate-300 px-3 py-2 text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                          >
                            <option value="">— Pilih Produk —</option>
                            {products.map((p) => (
                              <option
                                key={p.id}
                                value={p.id}
                                disabled={selectedInCluster.has(p.id)}
                              >
                                {selectedInCluster.has(p.id) ? "✓ " : ""}
                                {p.product_code} · {p.product_name}
                              </option>
                            ))}
                          </select>

                          {/* Input Qty */}
                          <input
                            type="number"
                            min={0}
                            value={entry.auditQty}
                            onChange={(e) =>
                              updateEntry(
                                cluster.clusterId,
                                entry.id,
                                "auditQty",
                                e.target.value === ""
                                  ? ""
                                  : String(Math.max(0, parseInt(e.target.value) || 0))
                              )
                            }
                            disabled={isSubmitting}
                            placeholder="Carton"
                            className={`w-24 sm:w-28 rounded-lg border-2 px-3 py-2 text-center text-sm font-bold focus:ring-2 focus:ring-green-200 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed ${
                              entry.productId && entry.auditQty === ""
                                ? "border-amber-400 bg-amber-50"
                                : "border-slate-300 focus:border-green-500"
                            }`}
                          />

                          {/* Hapus entry */}
                          <button
                            type="button"
                            onClick={() => removeEntry(cluster.clusterId, entry.id)}
                            disabled={isSubmitting}
                            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:cursor-not-allowed"
                            title="Hapus baris"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}

                    {/* Tombol tambah entry */}
                    <button
                      type="button"
                      onClick={() => addEntry(cluster.clusterId)}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-indigo-300 text-indigo-600 text-sm font-semibold hover:border-indigo-500 hover:bg-indigo-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center mt-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Tambah Produk di Cluster {cluster.clusterChar}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* Preview Total per Produk (muncul jika ada data) */}
        {Object.keys(productTotals).length > 0 && (
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
            <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <span className="text-base">🧮</span>
              Preview Total per Produk (semua cluster)
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-left text-slate-600">
                    <th className="pb-2 pr-4 font-semibold">Kode</th>
                    <th className="pb-2 pr-4 font-semibold">Nama Produk</th>
                    <th className="pb-2 text-right font-semibold">Total Carton</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(productTotals).map(([productId, total]) => {
                    const prod = products.find((p) => p.id === productId);
                    return (
                      <tr key={productId} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-1.5 pr-4 font-mono text-slate-600">{prod?.product_code || "-"}</td>
                        <td className="py-1.5 pr-4 text-slate-800 font-medium">{prod?.product_name || productId}</td>
                        <td className="py-1.5 text-right font-bold text-indigo-700">{total.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 font-bold text-slate-800">
                    <td colSpan={2} className="pt-2 text-xs">TOTAL SEMUA PRODUK</td>
                    <td className="pt-2 text-right text-indigo-800">
                      {Object.values(productTotals).reduce((a, b) => a + b, 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        )}

        {/* Tombol Aksi */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-xl px-8 py-3.5 text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 shadow-lg hover:shadow-xl transition-all disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Menyimpan...
              </>
            ) : (
              <>💾 Submit Audit (Waktu: {currentTime})</>
            )}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleReset}
            className="inline-flex items-center justify-center rounded-xl border-2 border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
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
                <h3 className="text-2xl font-bold text-white mb-1">Validasi Gagal</h3>
                <p className="text-red-100 text-sm">Periksa kembali data yang Anda masukkan</p>
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
                <h3 className="text-2xl font-bold text-white mb-1">Pre-Stock Opname Berhasil!</h3>
                <p className="text-green-100 text-sm">Data audit telah tersimpan</p>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4 space-y-2 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Kode Opname:</span>
                  <span className="font-semibold text-gray-800 font-mono">{successOpnameCode}</span>
                </div>
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
                  <span className="text-gray-600">Total Produk (unique):</span>
                  <span className="font-semibold text-gray-800">{successTotalProducts} produk</span>
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
