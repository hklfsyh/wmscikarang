// src/app/stock-list/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import {
  STOCK_LIST_MOCK,
  StockRow,
  StockStatus,
} from "@/lib/mock/stocklistmock";

type ProductFilter = "ALL" | string;
type ClusterFilter = "ALL" | "A" | "B" | "C" | "D" | "E";
type StatusFilter = "ALL" | StockStatus;
type SortDirection = "asc" | "desc" | null;

export default function StockListPage() {
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState<ProductFilter>("ALL");
  const [clusterFilter, setClusterFilter] = useState<ClusterFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const products = useMemo(
    () => Array.from(new Set(STOCK_LIST_MOCK.map((row) => row.product))),
    []
  );

  const filteredData = useMemo(() => {
    let result = STOCK_LIST_MOCK.filter((row) => {
      const matchSearch =
        search.trim().length === 0 ||
        row.product.toLowerCase().includes(search.toLowerCase()) ||
        row.batch.toLowerCase().includes(search.toLowerCase());

      const matchProduct =
        productFilter === "ALL" || row.product === productFilter;

      const matchCluster =
        clusterFilter === "ALL" || row.cluster === clusterFilter;

      const matchStatus = statusFilter === "ALL" || row.status === statusFilter;

      return matchSearch && matchProduct && matchCluster && matchStatus;
    });

    // Apply sorting if active
    if (sortDirection) {
      result = [...result].sort((a, b) => {
        const dateA = new Date(a.firstInAt).getTime();
        const dateB = new Date(b.firstInAt).getTime();
        return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
      });
    }

    return result;
  }, [search, productFilter, clusterFilter, statusFilter, sortDirection]);

  const handleSortToggle = () => {
    if (sortDirection === null) {
      setSortDirection("asc");
    } else if (sortDirection === "asc") {
      setSortDirection("desc");
    } else {
      setSortDirection(null);
    }
  };

  const total = STOCK_LIST_MOCK.length;
  const shown = filteredData.length;

  const handleExport = () => {
    // Placeholder export: nanti bisa diganti pakai export ke CSV/Excel beneran.
    alert(
      "Export Excel belum diimplementasi. Nanti akan dihubungkan ke backend."
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Stock List</h1>
        <p className="text-xs sm:text-sm text-slate-600">
          Daftar stok produk di gudang (mock data). Nantinya akan membaca
          langsung dari tabel <code className="bg-slate-100 px-2 py-0.5 rounded text-xs">stocks</code> dan{" "}
          <code className="bg-slate-100 px-2 py-0.5 rounded text-xs">locations</code> di database.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="🔍 Cari produk atau batch..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border-2 border-slate-300 bg-white px-3 sm:px-4 py-2 sm:py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
            </div>

            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-4 sm:px-5 py-2 sm:py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-400 transition-all whitespace-nowrap"
            >
              📊 Export Excel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={productFilter}
              onChange={(e) =>
                setProductFilter(
                  e.target.value === "ALL" ? "ALL" : e.target.value
                )
              }
              className="w-full rounded-lg border-2 border-slate-300 bg-white px-3 sm:px-4 py-2 sm:py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium truncate"
              style={{ maxWidth: '100%' }}
            >
              <option value="ALL">Semua Produk</option>
              {products.map((p) => (
                <option key={p} value={p} className="truncate">
                  {p}
                </option>
              ))}
            </select>

            <select
              value={clusterFilter}
              onChange={(e) =>
                setClusterFilter(
                  e.target.value === "ALL"
                    ? "ALL"
                    : (e.target.value as ClusterFilter)
                )
              }
              className="w-full rounded-lg border-2 border-slate-300 bg-white px-3 sm:px-4 py-2 sm:py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium"
              style={{ maxWidth: '100%' }}
            >
              <option value="ALL">Semua Cluster</option>
              <option value="A">Cluster A</option>
              <option value="B">Cluster B</option>
              <option value="C">Cluster C</option>
              <option value="D">Cluster D</option>
              <option value="E">Cluster E</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value === "ALL"
                    ? "ALL"
                    : (e.target.value as StatusFilter)
                )
              }
              className="w-full rounded-lg border-2 border-slate-300 bg-white px-3 sm:px-4 py-2 sm:py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium"
              style={{ maxWidth: '100%' }}
            >
              <option value="ALL">Semua Status</option>
              <option value="RELEASE">RELEASE</option>
              <option value="HOLD">HOLD</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <div className="max-h-[500px] sm:max-h-[560px] overflow-y-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-700 border-b-2 border-slate-200 sticky top-0">
                <tr>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap">Produk</th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap">Batch</th>
                  <th 
                    className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={handleSortToggle}
                    title="Klik untuk sorting berdasarkan tanggal masuk (FIFO)"
                  >
                    <div className="flex items-center gap-2">
                      <span>Tanggal Masuk</span>
                      {sortDirection === "asc" && <span className="text-blue-500">↑</span>}
                      {sortDirection === "desc" && <span className="text-blue-500">↓</span>}
                      {sortDirection === null && <span className="text-slate-400">⇅</span>}
                    </div>
                  </th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-right whitespace-nowrap">Qty Pallet</th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-right whitespace-nowrap">Qty Carton</th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap hidden sm:table-cell">Cluster</th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap hidden md:table-cell">Lorong</th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap hidden lg:table-cell">Pallet</th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-8 sm:py-12 text-center text-sm text-slate-500"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-3xl sm:text-4xl">🔍</span>
                        <span className="text-xs sm:text-sm">Tidak ada data yang cocok dengan filter.</span>
                      </div>
                    </td>
                  </tr>
                )}

                {filteredData.map((row: StockRow) => (
                  <tr
                    key={row.id}
                    className="border-t border-slate-100 hover:bg-blue-50/50 transition-colors"
                  >
                    <td className="px-3 sm:px-4 py-2 sm:py-3 align-middle">
                      <div className="text-slate-900 font-medium text-xs sm:text-sm max-w-[150px] sm:max-w-none truncate">
                        {row.product}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 align-middle text-slate-700 text-xs sm:text-sm whitespace-nowrap">{row.batch}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 align-middle text-slate-700 text-xs sm:text-sm whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <span className="inline-flex items-center justify-center bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-semibold">
                          📅 {new Date(row.firstInAt).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 align-middle text-right tabular-nums font-semibold text-slate-900 text-xs sm:text-sm">
                      {row.qtyPallet}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 align-middle text-right tabular-nums font-semibold text-slate-900 text-xs sm:text-sm">
                      {row.qtyCarton}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 align-middle hidden sm:table-cell">
                      <span className="inline-flex items-center justify-center bg-blue-500 text-white w-6 h-6 sm:w-7 sm:h-7 rounded-md text-xs font-bold">
                        {row.cluster}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 align-middle text-slate-600 text-xs hidden md:table-cell whitespace-nowrap">
                      {row.aisle} - {row.row}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 align-middle text-slate-700 font-medium text-xs sm:text-sm hidden lg:table-cell">P{row.pallet}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 align-middle">
                      <span
                        className={[
                          "inline-flex items-center rounded-full border-2 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold whitespace-nowrap",
                          row.status === "RELEASE"
                            ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                            : "border-rose-300 bg-rose-100 text-rose-700",
                        ].join(" ")}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t-2 border-slate-200 bg-slate-50 px-3 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-xs text-slate-600">
          <p>
            Menampilkan{" "}
            <span className="font-bold text-slate-900">{shown}</span> dari{" "}
            <span className="font-bold text-slate-900">{total}</span>{" "}
            record.
          </p>
          <p className="text-slate-500">📦 Data mock</p>
        </div>
      </div>
    </div>
  );
}
