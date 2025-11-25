"use client";

import { useState } from "react";

type Product = {
  code: string;
  name: string;
};

type OutboundSuggestion = {
  id: number;
  locationLabel: string; // contoh: "B - L2 - BARIS 2 - Pallet 7"
  batchCode: string;
  qtyPallet: number;
};

const products: Product[] = [
  { code: "AQ200_1X48", name: "200ML AQUA LOCAL 1X48" },
  { code: "AQ600_1X24", name: "600ML AQUA 1X24" },
  { code: "AQ1500_1X12", name: "1500ML AQUA 1X12" },
  { code: "AQ330_1X24", name: "330ML AQUA REFLECTIONS 1X24" },
  { code: "AQ19L_GALON", name: "19L AQUA GALON" },
];

// Mock data rekomendasi lokasi pengambilan berdasarkan FIFO.
// Nanti ini akan diganti dengan hasil query ke tabel stocks + locations.
const suggestionsByProduct: Record<string, OutboundSuggestion[]> = {
  AQ600_1X24: [
    {
      id: 1,
      locationLabel: "B - L2 - BARIS 2 - Pallet 7",
      batchCode: "BB105",
      qtyPallet: 8,
    },
    {
      id: 2,
      locationLabel: "B - L1 - BARIS 2 - Pallet 1",
      batchCode: "BB101",
      qtyPallet: 20,
    },
    {
      id: 3,
      locationLabel: "B - L1 - BARIS 2 - Pallet 2",
      batchCode: "BB102",
      qtyPallet: 18,
    },
  ],
  AQ200_1X48: [
    {
      id: 4,
      locationLabel: "A - L1 - BARIS 1 - Pallet 2",
      batchCode: "BB002",
      qtyPallet: 8,
    },
    {
      id: 5,
      locationLabel: "A - L1 - BARIS 1 - Pallet 1",
      batchCode: "BB001",
      qtyPallet: 10,
    },
  ],
};

export default function OutboundPage() {
  const today = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(today);
  const [selectedProductCode, setSelectedProductCode] = useState("");
  const [qtyPallet, setQtyPallet] = useState<string>("");

  const selectedProduct = products.find((p) => p.code === selectedProductCode);

  const locationSuggestions =
    (selectedProductCode && suggestionsByProduct[selectedProductCode]) || [];

  const handleReset = () => {
    setDate(today);
    setSelectedProductCode("");
    setQtyPallet("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Untuk saat ini cuma console.log saja (mock).
    // Nanti dihubungkan ke API / Supabase untuk:
    // - insert ke outbound_orders & outbound_items
    // - update tabel stocks (FIFO)
    console.log({
      outbound_date: date,
      product_code: selectedProductCode,
      qty_pallet: Number(qtyPallet || 0),
    });

    alert("Mock submit outbound. Belum tersambung ke database 🙂");
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
          Outbound - Pengeluaran Barang
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          Form input barang keluar. Saat ini masih menggunakan data mock.
          Nantinya akan menyimpan ke tabel <code className="bg-slate-100 px-2 py-0.5 rounded text-xs">outbound_orders</code>,{" "}
          <code className="bg-slate-100 px-2 py-0.5 rounded text-xs">outbound_items</code>, dan mengurangi stok di tabel{" "}
          <code className="bg-slate-100 px-2 py-0.5 rounded text-xs">stocks</code> dengan aturan FIFO.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4 sm:space-y-6"
      >
        {/* Baris 1: Tanggal & Produk */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-800 mb-2">
              📅 Tanggal
            </label>
            <input
              type="date"
              className="w-full rounded-lg border-2 border-slate-300 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 bg-white transition-all"
              style={{ maxWidth: '100%' }}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-800 mb-2">
              📦 Produk
            </label>
            <select
              className="w-full rounded-lg border-2 border-slate-300 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 font-medium transition-all truncate"
              style={{ maxWidth: '100%' }}
              value={selectedProductCode}
              onChange={(e) => setSelectedProductCode(e.target.value)}
            >
              <option value="">Pilih produk</option>
              {products.map((product) => (
                <option key={product.code} value={product.code} className="truncate">
                  {product.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Baris 2: Qty pallet */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-800 mb-2">
              📊 Qty yang Diambil (Pallet)
            </label>
            <input
              type="number"
              min={0}
              className="w-full rounded-lg border-2 border-slate-300 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 font-medium transition-all"
              placeholder="Jumlah pallet"
              value={qtyPallet}
              onChange={(e) => setQtyPallet(e.target.value)}
            />
          </div>
        </div>

        {/* Rekomendasi lokasi (FIFO) */}
        <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 sm:p-5 space-y-3 sm:space-y-4">
          <p className="text-xs sm:text-sm font-bold text-emerald-900 flex items-center gap-2">
            <span className="bg-emerald-500 text-white w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-xs">🎯</span>
            <span className="text-xs sm:text-sm">Lokasi Pengambilan (FIFO - First In First Out):</span>
          </p>

          {selectedProduct && locationSuggestions.length === 0 && (
            <p className="text-[10px] sm:text-xs text-emerald-800 bg-white rounded-lg p-2 sm:p-3 border border-emerald-200">
              Belum ada data mock untuk produk ini. Nanti bagian ini akan
              membaca langsung dari tabel <code className="bg-emerald-100 px-1.5 py-0.5 rounded">stocks</code> berdasarkan{" "}
              <code className="bg-emerald-100 px-1.5 py-0.5 rounded">first_in_at</code>.
            </p>
          )}

          {selectedProduct && locationSuggestions.length > 0 && (
            <div className="space-y-2 sm:space-y-3">
              {locationSuggestions.map((loc) => (
                <div
                  key={loc.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg bg-white border-2 border-emerald-200 px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm hover:shadow-md transition-all gap-2"
                >
                  <div>
                    <p className="font-bold text-slate-900 text-xs sm:text-sm">
                      {loc.locationLabel}
                    </p>
                    <p className="text-[10px] sm:text-xs text-slate-600 mt-1">
                      Batch: <span className="font-semibold">{loc.batchCode}</span>
                    </p>
                  </div>
                  <p className="text-base sm:text-lg font-bold text-emerald-700">
                    {loc.qtyPallet} <span className="text-[10px] sm:text-xs font-normal">pallet</span>
                  </p>
                </div>
              ))}
            </div>
          )}

          {!selectedProduct && (
            <p className="text-[10px] sm:text-xs text-emerald-800 bg-white rounded-lg p-2 sm:p-3 border border-emerald-200">
              💡 Pilih produk terlebih dahulu untuk melihat rekomendasi lokasi
              pengambilan berdasarkan FIFO.
            </p>
          )}
        </div>

        {/* Ringkasan */}
        <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-4 sm:p-5 text-xs sm:text-sm text-slate-800 space-y-2">
          <p className="font-bold text-blue-900 text-sm sm:text-base mb-2 sm:mb-3">📋 Ringkasan:</p>
          <div className="space-y-1.5">
            <p className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="font-semibold text-slate-700">Produk:</span>
              <span className="text-slate-900">{selectedProduct ? selectedProduct.name : "Belum dipilih"}</span>
            </p>
            <p className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="font-semibold text-slate-700">Qty:</span>
              <span className="text-slate-900">{qtyPallet ? `${qtyPallet} pallet` : "Belum diisi"}</span>
            </p>
          </div>
          <p className="text-[10px] sm:text-xs text-blue-700 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-blue-200">
            ℹ️ <strong>Catatan:</strong> Sistem hanya menampilkan rekomendasi lokasi berdasarkan
            FIFO. Saat terhubung database, sistem akan otomatis mengurangi stok
            dari lokasi-lokasi tersebut.
          </p>
        </div>

        {/* Tombol aksi */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <button
            type="submit"
            className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl bg-blue-500 text-xs sm:text-sm font-semibold text-white hover:bg-blue-600 transition-all shadow-lg hover:shadow-xl"
          >
            💾 Simpan
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center justify-center px-6 py-3 sm:py-3.5 rounded-xl border-2 border-slate-300 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all"
          >
            🔄 Reset
          </button>
        </div>
      </form>
    </div>
  );
}
