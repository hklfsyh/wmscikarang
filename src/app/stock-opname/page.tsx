"use client";

import { useMemo, useState } from "react";
import { stockListData, type StockItem } from "@/lib/mock/stocklistmock";

type OpnameItem = {
  id: string;
  product: string;
  batch: string;
  location: string;
  systemQty: number;
  physicalQty: number;
  reason: string;
};

export default function StockOpnamePage() {
  const today = useMemo(
    () => new Date().toISOString().slice(0, 10),
    []
  );

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "FILLED" | "EMPTY">("ALL");

  // Inisialisasi data opname dari stockListData
  const [items, setItems] = useState<OpnameItem[]>(() =>
    stockListData.map((stock: StockItem) => ({
      id: stock.id,
      product: stock.productName,
      batch: stock.batchNumber,
      location: `${stock.location.cluster} - ${stock.location.lorong} - ${stock.location.baris} - ${stock.location.level}`,
      systemQty: stock.qtyPallet, // untuk opname kita pakai qty pallet
      physicalQty: 0,
      reason: "",
    }))
  );

  // Filtered items based on search and status
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Filter by status
      if (statusFilter === "FILLED" && item.physicalQty === 0) return false;
      if (statusFilter === "EMPTY" && item.physicalQty !== 0) return false;
      
      // Filter by search query
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const productMatch = item.product.toLowerCase().includes(query);
        const batchMatch = item.batch.toLowerCase().includes(query);
        const locationMatch = item.location.toLowerCase().includes(query);
        return productMatch || batchMatch || locationMatch;
      }
      
      return true;
    });
  }, [items, searchQuery, statusFilter]);

  const handlePhysicalChange = (id: string, value: string) => {
    const num = Number(value.replace(/[^\d-]/g, "")) || 0;
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, physicalQty: num } : item
      )
    );
  };

  const handleReasonChange = (id: string, value: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, reason: value } : item
      )
    );
  };

  const diffItems = useMemo(
    () =>
      items
        .map((item) => ({
          ...item,
          diff: item.physicalQty - item.systemQty,
        }))
        .filter((item) => item.diff !== 0),
    [items]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      opnameDate: today,
      items: items.map((item) => ({
        product: item.product,
        batch: item.batch,
        location: item.location,
        systemQty: item.systemQty,
        physicalQty: item.physicalQty,
        diff: item.physicalQty - item.systemQty,
        reason: item.reason,
      })),
    };

    console.log("Mock payload stock opname:", payload);

    alert(
      "Stock opname (mock) tersimpan.\n\n" +
        "Nanti di versi database, data ini akan masuk ke tabel stock_opname_sessions dan stock_opname_items, " +
        "lalu otomatis menyesuaikan tabel stocks sesuai Physical Qty."
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <header className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
          Stock Opname
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          Pencatatan stock opname fisik (mock data). Nanti akan membaca langsung
          dari tabel <code className="bg-slate-100 px-2 py-0.5 rounded text-xs">stocks</code> dan menyimpan hasilnya ke{" "}
          <code className="bg-slate-100 px-2 py-0.5 rounded text-xs">stock_opname_sessions</code> &amp;{" "}
          <code className="bg-slate-100 px-2 py-0.5 rounded text-xs">stock_opname_items</code>.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Tanggal Opname */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-3">
          <label className="block text-sm font-semibold text-slate-800 mb-2">
            📅 Tanggal Stock Opname
          </label>
          <input
            type="date"
            className="w-full sm:w-64 rounded-lg border-2 border-slate-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm bg-slate-50 cursor-not-allowed font-medium"
            value={today}
            readOnly
          />
          <p className="text-xs text-slate-500 bg-blue-50 border border-blue-100 rounded-lg p-2 sm:p-3">
            ℹ️ Tanggal opname mengikuti hari ini (tidak bisa backdate maupun
            memilih tanggal lain).
          </p>
        </section>

        {/* Input Qty Fisik */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
            <span className="bg-blue-500 text-white w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs sm:text-sm">📦</span>
            <span className="text-sm sm:text-base">Input Qty Fisik</span>
          </h2>

          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pb-4 border-b border-slate-200">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                🔍 Search Produk / Batch / Lokasi
              </label>
              <input
                type="text"
                placeholder="Cari nama produk, batch, atau lokasi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border-2 border-slate-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
            </div>
            <div className="sm:w-48">
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                📊 Filter Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "ALL" | "FILLED" | "EMPTY")}
                className="w-full rounded-lg border-2 border-slate-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              >
                <option value="ALL">Semua Item</option>
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
                  className="rounded-lg border-2 border-slate-300 bg-white px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all"
                >
                  🔄 Reset
                </button>
              </div>
            )}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-6 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-900 font-medium">
                ⚠️ Tidak ada item yang sesuai dengan filter
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Coba ubah kata kunci atau filter status
              </p>
            </div>
          )}

          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm -mx-4 sm:mx-0">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b-2 border-slate-200">
                <tr className="text-left text-xs font-semibold text-slate-700">
                  <th className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">Produk</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap hidden sm:table-cell">Batch (BB)</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap hidden md:table-cell">Lokasi</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right whitespace-nowrap">
                    System
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right whitespace-nowrap">
                    Fisik
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-slate-100 hover:bg-blue-50/50 transition-colors"
                  >
                    <td className="px-2 sm:px-4 py-2 sm:py-3 align-middle">
                      <div className="max-w-[120px] sm:max-w-xs truncate font-medium text-slate-900 text-xs sm:text-sm">
                        {item.product}
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 align-middle text-slate-700 text-xs sm:text-sm hidden sm:table-cell">{item.batch}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 align-middle text-slate-600 text-[10px] sm:text-xs hidden md:table-cell">
                      {item.location}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 align-middle text-right font-semibold text-slate-900 text-xs sm:text-sm">
                      {item.systemQty}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 align-middle text-right">
                      <input
                        type="number"
                        min={0}
                        className="w-16 sm:w-24 rounded-lg border-2 border-slate-300 px-2 sm:px-3 py-1 sm:py-2 text-right text-xs sm:text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        value={item.physicalQty}
                        onChange={(e) =>
                          handlePhysicalChange(item.id, e.target.value)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[10px] sm:text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2 sm:p-3">
            📝 <strong>Catatan:</strong> Untuk versi final, Physical Qty akan dipakai untuk
            menyesuaikan qty_pallet di tabel <code className="bg-white px-1.5 py-0.5 rounded">stocks</code>. Jika 0, slot
            dianggap kosong namun tetap disimpan untuk kebutuhan layout.
          </p>
        </section>

        {/* Reconciliation */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
            <span className="bg-amber-500 text-white w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs sm:text-sm">⚖️</span>
            <span className="text-sm sm:text-base">Reconciliation — System vs Fisik</span>
          </h2>

          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm -mx-4 sm:mx-0">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b-2 border-slate-200">
                <tr className="text-left text-xs font-semibold text-slate-700">
                  <th className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">Produk</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap hidden sm:table-cell">Batch</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap hidden md:table-cell">Lokasi</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right whitespace-nowrap">System</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right whitespace-nowrap">Fisik</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right whitespace-nowrap">Selisih</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap hidden lg:table-cell">Reason</th>
                </tr>
              </thead>
              <tbody>
                {diffItems.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-2 sm:px-4 py-6 sm:py-8 text-center text-xs sm:text-sm text-slate-500"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-2xl sm:text-3xl">✅</span>
                        <span className="text-xs sm:text-sm">Belum ada selisih antara System dan Physical Qty.</span>
                      </div>
                    </td>
                  </tr>
                )}

                {diffItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-slate-100 hover:bg-amber-50/50 transition-colors"
                  >
                    <td className="px-2 sm:px-4 py-2 sm:py-3 align-middle">
                      <div className="max-w-[120px] sm:max-w-xs truncate font-medium text-slate-900 text-xs sm:text-sm">
                        {item.product}
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 align-middle text-slate-700 text-xs sm:text-sm hidden sm:table-cell">{item.batch}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 align-middle text-slate-600 text-[10px] sm:text-xs hidden md:table-cell">
                      {item.location}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 align-middle text-right font-semibold text-slate-900 text-xs sm:text-sm">
                      {item.systemQty}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 align-middle text-right font-semibold text-slate-900 text-xs sm:text-sm">
                      {item.physicalQty}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 align-middle text-right">
                      <span
                        className={`inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold ${
                          item.diff === 0
                            ? "bg-slate-100 text-slate-700"
                            : item.diff < 0
                            ? "bg-rose-100 text-rose-700 border border-rose-200"
                            : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {item.diff > 0 ? `+${item.diff}` : item.diff}
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 align-middle hidden lg:table-cell">
                      <input
                        type="text"
                        className="w-full rounded-lg border-2 border-slate-300 px-2 sm:px-3 py-1.5 sm:py-2 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        placeholder="Alasan selisih..."
                        value={item.reason}
                        onChange={(e) =>
                          handleReasonChange(item.id, e.target.value)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[10px] sm:text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-lg p-2 sm:p-3">
            ⚙️ Mode opname yang diadopsi:{" "}
            <span className="font-semibold text-amber-900">
              Auto Adjust + Save Log
            </span>
            . Artinya, setiap selisih akan langsung menyesuaikan stok di
            database, sekaligus menyimpan history detail di tabel opname.
          </p>
        </section>

        {/* Tombol aksi */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-blue-500 px-6 sm:px-8 py-3 sm:py-3.5 text-xs sm:text-sm font-semibold text-white hover:bg-blue-600 shadow-lg hover:shadow-xl transition-all"
          >
            💾 Simpan Stock Opname (Mock)
          </button>
          <button
            type="button"
            onClick={() =>
              setItems((prev) =>
                prev.map((item) => ({
                  ...item,
                  physicalQty: 0,
                  reason: "",
                }))
              )
            }
            className="inline-flex items-center justify-center rounded-xl border-2 border-slate-300 bg-white px-6 py-3 sm:py-3.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all"
          >
            🔄 Reset
          </button>
        </div>
      </form>
    </div>
  );
}
