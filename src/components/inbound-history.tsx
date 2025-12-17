"use client";

// Inbound History Component for Superadmin
import { useState, useMemo } from "react";
import { inboundHistoryData } from "@/lib/mock/transaction-history";
import { Search, Calendar, TruckIcon, FileDown } from "lucide-react";
import * as XLSX from 'xlsx';

export function InboundHistoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "completed" | "partial">("all");
  const [selectedItem, setSelectedItem] = useState<typeof inboundHistoryData[0] | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Filter data
  const filteredData = useMemo(() => {
    return inboundHistoryData.filter((item) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === "" ||
        item.id.toLowerCase().includes(searchLower) ||
        item.productName.toLowerCase().includes(searchLower) ||
        item.productCode.toLowerCase().includes(searchLower) ||
        item.namaPengemudi.toLowerCase().includes(searchLower) ||
        item.nomorPolisi.toLowerCase().includes(searchLower) ||
        item.noDN.toLowerCase().includes(searchLower) ||
        item.ekspedisi.toLowerCase().includes(searchLower);

      // Date filter
      const itemDate = new Date(item.tanggal);
      const matchesStartDate = !startDate || itemDate >= new Date(startDate);
      const matchesEndDate = !endDate || itemDate <= new Date(endDate);

      // Status filter
      const matchesStatus = selectedStatus === "all" || item.status === selectedStatus;

      return matchesSearch && matchesStartDate && matchesEndDate && matchesStatus;
    });
  }, [searchQuery, startDate, endDate, selectedStatus]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Format datetime for display
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Reset filters
  const handleReset = () => {
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setSelectedStatus("all");
  };

  // Open detail modal
  const handleViewDetail = (item: typeof inboundHistoryData[0]) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  // Close detail modal
  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedItem(null);
  };

  // Export to Excel
  const exportToExcel = () => {
    // Prepare data for export
    const exportData = filteredData.map((item, index) => ({
      'No': index + 1,
      'ID Transaksi': item.id,
      'Tanggal': formatDate(item.tanggal),
      'Ekspedisi': item.ekspedisi,
      'Pengemudi': item.namaPengemudi,
      'No. Polisi': item.nomorPolisi,
      'No. DN': item.noDN,
      'Kode Produk': item.productCode,
      'Nama Produk': item.productName,
      'Qty Pallet': item.qtyPallet,
      'Qty Carton': item.qtyCarton,
      'Total Pcs': item.totalPcs,
      'BB Produk': item.bbProduk,
      'Expired Date': formatDate(item.expiredDate),
      'Lokasi': item.location,
      'Status': item.status === 'completed' ? 'Selesai' : 'Partial',
      'Waktu Input': formatDateTime(item.createdAt),
    }));

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths
    const colWidths = [
      { wch: 5 },  // No
      { wch: 15 }, // ID Transaksi
      { wch: 12 }, // Tanggal
      { wch: 10 }, // Ekspedisi
      { wch: 20 }, // Pengemudi
      { wch: 12 }, // No. Polisi
      { wch: 15 }, // No. DN
      { wch: 12 }, // Kode Produk
      { wch: 40 }, // Nama Produk
      { wch: 10 }, // Qty Pallet
      { wch: 10 }, // Qty Carton
      { wch: 10 }, // Total Pcs
      { wch: 15 }, // BB Produk
      { wch: 12 }, // Expired Date
      { wch: 30 }, // Lokasi
      { wch: 10 }, // Status
      { wch: 18 }, // Waktu Input
    ];
    ws['!cols'] = colWidths;

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Riwayat Inbound');

    // Generate filename with current date
    const date = new Date();
    const filename = `Riwayat_Inbound_${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-linear-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <TruckIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Riwayat Inbound</h1>
                <p className="text-sm text-gray-600">
                  Data transaksi penerimaan barang masuk ke gudang
                </p>
              </div>
            </div>
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all shadow-lg"
            >
              <FileDown className="w-5 h-5" />
              Export Excel
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Search className="w-4 h-4 inline mr-1" />
                Cari
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ID, Produk, Pengemudi, No. Polisi, DN, Ekspedisi..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Dari Tanggal
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Status Filter & Reset */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">Status:</span>
              <button
                onClick={() => setSelectedStatus("all")}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  selectedStatus === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setSelectedStatus("completed")}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  selectedStatus === "completed"
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Completed
              </button>
              <button
                onClick={() => setSelectedStatus("partial")}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  selectedStatus === "partial"
                    ? "bg-yellow-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Partial
              </button>
            </div>

            <button
              onClick={handleReset}
              className="ml-auto px-6 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-all"
            >
              Reset Filter
            </button>
          </div>

          {/* Summary */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Menampilkan <span className="font-bold text-blue-600">{filteredData.length}</span> dari{" "}
              <span className="font-bold">{inboundHistoryData.length}</span> transaksi
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-linear-to-r from-blue-500 to-indigo-600 text-white">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-bold">Tanggal</th>
                  <th className="px-3 py-3 text-left text-xs font-bold">Ekspedisi</th>
                  <th className="px-3 py-3 text-left text-xs font-bold">Pengemudi</th>
                  <th className="px-3 py-3 text-left text-xs font-bold">Produk</th>
                  <th className="px-2 py-3 text-center text-xs font-bold">Qty Pallet</th>
                  <th className="px-2 py-3 text-center text-xs font-bold">Qty Carton</th>
                  <th className="px-2 py-3 text-center text-xs font-bold">Status</th>
                  <th className="px-3 py-3 text-center text-xs font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <div className="text-6xl mb-4">📦</div>
                      <p className="text-gray-600 font-semibold">Tidak ada data yang sesuai</p>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-3 py-2 text-xs text-gray-700 whitespace-nowrap">
                        {formatDate(item.tanggal)}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-bold">
                          {item.ekspedisi}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs font-semibold text-gray-800 whitespace-nowrap">
                        {item.namaPengemudi}
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-xs max-w-[250px]">
                          <div className="font-mono text-blue-600">{item.productCode}</div>
                          <div className="font-semibold text-gray-800 truncate" title={item.productName}>
                            {item.productName}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center text-xs font-bold text-green-600">
                        {item.qtyPallet}
                      </td>
                      <td className="px-2 py-2 text-center text-xs font-bold text-blue-600">
                        {item.qtyCarton}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {item.status === "completed" ? (
                          <span className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold whitespace-nowrap">
                            ✓ Done
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-bold whitespace-nowrap">
                            ⚠ Partial
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => handleViewDetail(item)}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="bg-linear-to-r from-blue-500 to-indigo-600 p-6 text-white sticky top-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Detail Transaksi Inbound</h2>
                    <p className="text-sm opacity-90 mt-1">
                      {formatDate(selectedItem.tanggal)} - {selectedItem.ekspedisi}
                    </p>
                  </div>
                  <button
                    onClick={handleCloseDetail}
                    className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {/* Informasi Pengiriman */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="text-2xl">🚚</span>
                    Informasi Pengiriman
                  </h3>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                    <div>
                      <p className="text-xs text-gray-600">Ekspedisi</p>
                      <p className="font-semibold text-gray-800">{selectedItem.ekspedisi}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Tanggal</p>
                      <p className="font-semibold text-gray-800">{formatDate(selectedItem.tanggal)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Pengemudi</p>
                      <p className="font-semibold text-gray-800">{selectedItem.namaPengemudi}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">No. Polisi</p>
                      <p className="font-mono font-semibold text-gray-800">{selectedItem.nomorPolisi}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">No. DN</p>
                      <p className="font-mono font-semibold text-gray-800">{selectedItem.noDN}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Status</p>
                      <p>
                        {selectedItem.status === "completed" ? (
                          <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-lg font-bold">
                            ✓ Completed
                          </span>
                        ) : (
                          <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg font-bold">
                            ⚠ Partial
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Informasi Produk */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="text-2xl">📦</span>
                    Informasi Produk
                  </h3>
                  <div className="bg-blue-50 p-4 rounded-xl space-y-3">
                    <div>
                      <p className="text-xs text-gray-600">Kode Produk</p>
                      <p className="font-mono font-bold text-blue-600 text-lg">{selectedItem.productCode}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Nama Produk</p>
                      <p className="font-semibold text-gray-800">{selectedItem.productName}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 pt-3 border-t border-blue-200">
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-1">Qty Pallet</p>
                        <p className="text-2xl font-bold text-green-600">{selectedItem.qtyPallet}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-1">Qty Carton</p>
                        <p className="text-2xl font-bold text-blue-600">{selectedItem.qtyCarton}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-1">Total Pcs</p>
                        <p className="text-2xl font-bold text-purple-600">{selectedItem.totalPcs.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Informasi Batch & Expired */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="text-2xl">📋</span>
                    Informasi Batch & Expired
                  </h3>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                    <div>
                      <p className="text-xs text-gray-600">BB Produk</p>
                      <p className="font-mono font-bold text-gray-800 text-lg">{selectedItem.bbProduk}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Expired Date</p>
                      <p className="font-semibold text-red-600 text-lg">{formatDate(selectedItem.expiredDate)}</p>
                    </div>
                  </div>
                </div>

                {/* Lokasi Penyimpanan */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="text-2xl">📍</span>
                    Lokasi Penyimpanan
                  </h3>
                  <div className="bg-green-50 p-4 rounded-xl">
                    <p className="font-mono text-sm text-green-700 leading-relaxed">
                      {selectedItem.location}
                    </p>
                  </div>
                </div>

                {/* Waktu Input */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="text-2xl">⏰</span>
                    Waktu Input
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="font-semibold text-gray-800">{formatDateTime(selectedItem.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 p-4 sticky bottom-0">
                <button
                  onClick={handleCloseDetail}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
