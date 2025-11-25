"use client";

import { useState } from "react";

type Option = {
  value: string;
  label: string;
};

// 👉 sementara pakai mock option, nanti bisa diganti dari DB / Supabase
const ekspedisiOptions: Option[] = [
  { value: "HGS", label: "HGS" },
  { value: "SJP", label: "SJP" },
  { value: "SMR", label: "SMR" },
];

const produkOptions: Option[] = [
  { value: "AQ200_1X48", label: "200ML AQUA LOCAL 1X48" },
  { value: "AQ600_1X24", label: "600ML AQUA 1X24" },
  { value: "AQ1500_1X12", label: "1500ML AQUA 1X12" },
  { value: "AQ_19L_GALON", label: "19L AQUA GALON" },
];

const clusterOptions: Option[] = [
  { value: "A", label: "Cluster A" },
  { value: "B", label: "Cluster B" },
  { value: "C", label: "Cluster C" },
  { value: "D", label: "Cluster D" },
  { value: "E", label: "Cluster E" },
];

const lorongBarisOptions: Option[] = [
  { value: "L1 - BARIS 1", label: "L1 - BARIS 1" },
  { value: "L1 - BARIS 2", label: "L1 - BARIS 2" },
  { value: "L2 - BARIS 1", label: "L2 - BARIS 1" },
  { value: "L2 - BARIS 2", label: "L2 - BARIS 2" },
  { value: "L3 - BARIS 1", label: "L3 - BARIS 1" },
  { value: "L3 - BARIS 2", label: "L3 - BARIS 2" },
];

const palletOptions: Option[] = Array.from({ length: 10 }).map((_, i) => ({
  value: String(i + 1),
  label: `Pallet ${i + 1}`,
}));

type InboundFormState = {
  ekspedisi: string;
  tanggal: string;
  produk: string;
  batch: string;
  cluster: string;
  lorongBaris: string;
  pallet: string;
  qtyPallet: string;
};

const today = new Date().toISOString().slice(0, 10);

const initialState: InboundFormState = {
  ekspedisi: "",
  tanggal: today,
  produk: "",
  batch: "",
  cluster: "",
  lorongBaris: "",
  pallet: "",
  qtyPallet: "",
};

export function InboundForm() {
  const [form, setForm] = useState<InboundFormState>(initialState);

  function handleChange(field: keyof InboundFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleReset() {
    setForm(initialState);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // sementara cuma log, nanti diganti call API / Supabase
    console.log("Inbound submitted (mock):", form);
    alert("Data inbound tersimpan (mock). Nanti akan diarahkan ke Supabase.");
    handleReset();
  }

  const selectedProdukLabel =
    produkOptions.find((p) => p.value === form.produk)?.label ?? "-";

  const summaryText =
    form.produk &&
    form.cluster &&
    form.lorongBaris &&
    form.pallet &&
    form.qtyPallet
      ? `Produk: ${selectedProdukLabel}
Qty: ${form.qtyPallet} pallet
Lokasi: ${form.cluster} - ${form.lorongBaris} - Pallet ${form.pallet}`
      : "Lengkapi form di atas untuk melihat ringkasan inbound.";

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
          Inbound - Penerimaan Barang
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          Form input barang masuk. Saat ini masih menggunakan data mock.
          Nantinya akan menyimpan ke tabel <code className="bg-slate-100 px-2 py-0.5 rounded text-xs">inbound_orders</code>,{" "}
          <code className="bg-slate-100 px-2 py-0.5 rounded text-xs">inbound_items</code>, dan meng-update tabel <code className="bg-slate-100 px-2 py-0.5 rounded text-xs">stocks</code>.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 sm:space-y-6 rounded-xl bg-white border border-slate-200 shadow-sm p-4 sm:p-6"
      >
        {/* Baris 1: Ekspedisi + Tanggal */}
        <div className="grid gap-3 sm:gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-slate-800 flex items-center gap-2">
              🚚 Ekspedisi
            </label>
            <select
              className="w-full rounded-lg border-2 border-slate-300 bg-white px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all truncate"
              style={{ maxWidth: '100%' }}
              value={form.ekspedisi}
              onChange={(e) => handleChange("ekspedisi", e.target.value)}
              required
            >
              <option value="">Pilih ekspedisi</option>
              {ekspedisiOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-slate-800 flex items-center gap-2">
              📅 Tanggal
            </label>
            <input
              type="date"
              className="w-full rounded-lg border-2 border-slate-300 bg-white px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
              style={{ maxWidth: '100%' }}
              value={form.tanggal}
              onChange={(e) => handleChange("tanggal", e.target.value)}
              required
            />
          </div>
        </div>

        {/* Baris 2: Produk + Batch */}
        <div className="space-y-2">
          <label className="text-xs sm:text-sm font-semibold text-slate-800 flex items-center gap-2">
            📦 Produk
          </label>
          <select
            className="w-full rounded-lg border-2 border-slate-300 bg-white px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all truncate"
            style={{ maxWidth: '100%' }}
            value={form.produk}
            onChange={(e) => handleChange("produk", e.target.value)}
            required
          >
            <option value="">Pilih produk</option>
            {produkOptions.map((opt) => (
              <option key={opt.value} value={opt.value} className="truncate">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs sm:text-sm font-semibold text-slate-800 flex items-center gap-2">
            🏷️ Batch (BB)
          </label>
          <input
            type="text"
            className="w-full rounded-lg border-2 border-slate-300 bg-white px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
            placeholder="Contoh: BB001"
            value={form.batch}
            onChange={(e) => handleChange("batch", e.target.value)}
            required
          />
        </div>

        {/* Baris 3: Cluster + Lorong-Baris + Pallet */}
        <div className="grid gap-3 sm:gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-slate-800 flex items-center gap-2">
              📍 Cluster
            </label>
            <select
              className="w-full rounded-lg border-2 border-slate-300 bg-white px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all truncate"
              style={{ maxWidth: '100%' }}
              value={form.cluster}
              onChange={(e) => handleChange("cluster", e.target.value)}
              required
            >
              <option value="">Cluster</option>
              {clusterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-slate-800 flex items-center gap-2">
              🛣️ Lorong - Baris
            </label>
            <select
              className="w-full rounded-lg border-2 border-slate-300 bg-white px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all truncate"
              style={{ maxWidth: '100%' }}
              value={form.lorongBaris}
              onChange={(e) => handleChange("lorongBaris", e.target.value)}
              required
            >
              <option value="">Lorong</option>
              {lorongBarisOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-slate-800 flex items-center gap-2">
              🎯 Pallet
            </label>
            <select
              className="w-full rounded-lg border-2 border-slate-300 bg-white px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all truncate"
              style={{ maxWidth: '100%' }}
              value={form.pallet}
              onChange={(e) => handleChange("pallet", e.target.value)}
              required
            >
              <option value="">No. Pallet</option>
              {palletOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Baris 4: Qty Pallet */}
        <div className="space-y-2">
          <label className="text-xs sm:text-sm font-semibold text-slate-800 flex items-center gap-2">
            📊 Qty (Pallet)
          </label>
          <input
            type="number"
            min={0}
            className="w-full rounded-lg border-2 border-slate-300 bg-white px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
            placeholder="Jumlah pallet"
            value={form.qtyPallet}
            onChange={(e) => handleChange("qtyPallet", e.target.value)}
            required
          />
          <p className="text-[10px] sm:text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2 mt-2">
            ℹ️ Qty per pallet menyesuaikan master produk (mock).
          </p>
        </div>

        {/* Ringkasan */}
        <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-4 sm:p-5 text-xs sm:text-sm text-slate-800 whitespace-pre-line">
          <p className="mb-2 sm:mb-3 text-sm sm:text-base font-bold text-blue-900">
            📋 Ringkasan:
          </p>
          <div className="text-slate-900 font-medium">
            {summaryText}
          </div>
        </div>

        {/* Tombol */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            type="submit"
            className="rounded-xl bg-blue-500 px-6 sm:px-8 py-3 sm:py-3.5 text-xs sm:text-sm font-semibold text-white hover:bg-blue-600 transition-all shadow-lg hover:shadow-xl"
          >
            💾 Simpan
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-xl border-2 border-slate-300 px-6 py-3 sm:py-3.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all"
          >
            🔄 Reset
          </button>
        </div>
      </form>
    </div>
  );
}
