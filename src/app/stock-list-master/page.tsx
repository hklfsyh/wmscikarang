"use client";

import { useState, useMemo } from "react";
import { stockListData, type StockItem } from "@/lib/mock/stocklistmock";

export default function StockListMasterPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [clusterFilter, setClusterFilter] = useState<"ALL" | "A" | "B" | "C" | "D">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "available" | "reserved" | "quarantine">("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);

  // Filter data
  const filteredStocks = useMemo(() => {
    return stockListData.filter((stock: StockItem) => {
      if (clusterFilter !== "ALL" && stock.location.cluster !== clusterFilter) {
        return false;
      }
      if (statusFilter !== "ALL" && stock.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        return (
          stock.productName.toLowerCase().includes(query) ||
          stock.batchNumber.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [searchQuery, clusterFilter, statusFilter]);

  const handleEdit = (stock: StockItem) => {
    setSelectedStock(stock);
    setShowEditModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus data ini?")) {
      // Implementasi delete
      alert(`Delete stock ID: ${id} (Demo)`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                Master Data Stock List
              </h1>
              <p className="text-sm text-slate-600">
                Kelola data master produk yang tersedia di gudang
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 justify-center sm:justify-start"
            >
              <span className="text-lg">+</span>
              <span>Tambah Stock</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                🔍 Search
              </label>
              <input
                type="text"
                placeholder="Cari produk atau batch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                📦 Cluster
              </label>
              <select
                value={clusterFilter}
                onChange={(e) => setClusterFilter(e.target.value as typeof clusterFilter)}
                className="w-full rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              >
                <option value="ALL">Semua Cluster</option>
                <option value="A">Cluster A</option>
                <option value="B">Cluster B</option>
                <option value="C">Cluster C</option>
                <option value="D">Cluster D</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                📊 Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="w-full rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              >
                <option value="ALL">Semua Status</option>
                <option value="available">Available</option>
                <option value="reserved">Reserved</option>
                <option value="quarantine">Quarantine</option>
              </select>
            </div>
          </div>

          {(searchQuery || clusterFilter !== "ALL" || statusFilter !== "ALL") && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-slate-600">
                Menampilkan <span className="font-semibold text-blue-600">{filteredStocks.length}</span> dari {stockListData.length} data
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setClusterFilter("ALL");
                  setStatusFilter("ALL");
                }}
                className="rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all"
              >
                🔄 Reset
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Produk</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Batch</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700">Cluster</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700">Lokasi</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700">Qty Pallet</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700">Qty Carton</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredStocks.map((stock: StockItem) => (
                  <tr key={stock.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-900">{stock.id}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-slate-900">{stock.productName}</div>
                      <div className="text-xs text-slate-500">{stock.productCode}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{stock.batchNumber}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-semibold text-sm">
                        {stock.location.cluster}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-slate-700">
                      {stock.location.lorong} - {stock.location.baris} - {stock.location.level}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-semibold text-emerald-600">
                        {stock.qtyPallet}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-semibold text-blue-600">
                        {stock.qtyCarton}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                        stock.status === "available" 
                          ? "bg-green-100 text-green-700" 
                          : stock.status === "reserved"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {stock.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(stock)}
                          className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(stock.id)}
                          className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredStocks.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📦</div>
              <p className="text-slate-600 font-medium">Tidak ada data yang sesuai</p>
              <p className="text-sm text-slate-500 mt-1">Coba ubah filter atau tambah data baru</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal (Placeholder) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-blue-500 px-6 py-4 rounded-t-2xl sticky top-0">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Tambah Stock Baru</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-white/80 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-600 text-center py-8">
                Form tambah stock akan diimplementasikan di sini
              </p>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal (Placeholder) */}
      {showEditModal && selectedStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-blue-500 px-6 py-4 rounded-t-2xl sticky top-0">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Edit Stock</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-white/80 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-600 text-center py-8">
                Form edit stock untuk <strong>{selectedStock.productName}</strong> akan diimplementasikan di sini
              </p>
              <button
                onClick={() => setShowEditModal(false)}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all"
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
