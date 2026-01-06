"use client";

// Inbound History Component for Superadmin
import { useState, useMemo } from "react";
import { inboundHistoryData, InboundHistory } from "@/lib/mock/transaction-history";
import { productMasterData } from "@/lib/mock/product-master";
import { Search, Calendar, TruckIcon, FileDown } from "lucide-react";
import * as XLSX from 'xlsx';

interface InboundHistoryPageProps {
  userProfile?: any; // Profile user (opsional)
}

export function InboundHistoryPage({ userProfile }: InboundHistoryPageProps = {}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "completed" | "partial">("all");
  const [selectedItem, setSelectedItem] = useState<InboundHistory | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Filter data
  const filteredData = useMemo(() => {
    return inboundHistoryData.filter((item) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const product = productMasterData.find(p => p.id === item.productId);
      const matchesSearch =
        searchQuery === "" ||
        item.transactionCode.toLowerCase().includes(searchLower) ||
        (product?.productName.toLowerCase().includes(searchLower) || false) ||
        (product?.productCode.toLowerCase().includes(searchLower) || false) ||
        item.driverName.toLowerCase().includes(searchLower) ||
        item.vehicleNumber.toLowerCase().includes(searchLower) ||
        item.dnNumber.toLowerCase().includes(searchLower) ||
        (item.expeditionId?.toLowerCase().includes(searchLower) || false);

      // Date filter
      const itemDate = new Date(item.arrivalTime);
      const matchesStartDate = !startDate || itemDate >= new Date(startDate);
      const matchesEndDate = !endDate || itemDate <= new Date(endDate);

      // Status filter (all transactions are completed in new schema)
      const matchesStatus = selectedStatus === "all" || selectedStatus === "completed";

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
  const handleViewDetail = (item: InboundHistory) => {
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
    const exportData = filteredData.map((item, index) => {
      const product = productMasterData.find(p => p.id === item.productId);
      const totalPcs = (product?.qtyPerCarton || 0) * item.qtyCarton;
      return {
        'No': index + 1,
        'Kode Transaksi': item.transactionCode,
        'Tanggal': formatDate(item.arrivalTime),
        'Ekspedisi': item.expeditionId || '-',
        'Pengemudi': item.driverName,
        'No. Polisi': item.vehicleNumber,
        'No. DN': item.dnNumber,
        'Kode Produk': product?.productCode || '-',
        'Nama Produk': product?.productName || '-',
        'Qty Lokasi': item.locations.length,
        'Qty Carton': item.qtyCarton,
        'Total Pcs': totalPcs,
        'BB Produk': item.bbProduk,
        'Expired Date': formatDate(item.expiredDate),
        'Lokasi': item.locations.map(loc => `${loc.cluster}-L${loc.lorong}-B${loc.baris}-P${loc.level}`).join(', '),
        'Diterima Oleh': item.receivedBy,
        'Waktu Kedatangan': formatDateTime(item.arrivalTime),
      };
    });

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
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-full space-y-3 sm:space-y-4">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-linear-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <TruckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">Riwayat Inbound</h1>
                <p className="text-[10px] sm:text-xs text-gray-600">
                  Transaksi barang masuk gudang
                </p>
              </div>
            </div>
            <button
              onClick={exportToExcel}
              className="flex items-center justify-center gap-1 px-3 py-2 text-xs sm:text-sm bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all shadow-lg"
            >
              <FileDown className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-3">
            {/* Search */}
            <div className="col-span-2">
              <label className="block text-[10px] sm:text-xs font-semibold text-gray-700 mb-1">
                <Search className="w-3 h-3 inline mr-1" />
                Cari
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ID, Produk, Pengemudi, DN..."
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-[10px] sm:text-xs font-semibold text-gray-700 mb-1">
                <Calendar className="w-3 h-3 inline mr-1" />
                Dari
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-[10px] sm:text-xs font-semibold text-gray-700 mb-1">
                <Calendar className="w-3 h-3 inline mr-1" />
                Sampai
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Status Filter & Reset */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            <span className="text-[10px] sm:text-xs font-semibold text-gray-700">Status:</span>
            <button
              onClick={() => setSelectedStatus("all")}
              className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs rounded-lg font-semibold transition-all ${
                selectedStatus === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setSelectedStatus("completed")}
              className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs rounded-lg font-semibold transition-all ${
                selectedStatus === "completed"
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Selesai
            </button>
            <button
              onClick={() => setSelectedStatus("partial")}
              className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs rounded-lg font-semibold transition-all ${
                selectedStatus === "partial"
                  ? "bg-yellow-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Partial
            </button>

            <button
              onClick={handleReset}
              className="ml-auto px-2 sm:px-3 py-1 text-[10px] sm:text-xs bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-all"
            >
              Reset
            </button>
          </div>

          {/* Summary */}
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-[10px] sm:text-xs text-gray-600">
              {filteredData.length} dari {inboundHistoryData.length} transaksi
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-linear-to-r from-blue-500 to-indigo-600 text-white">
                <tr>
                  <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-bold">Tanggal</th>
                  <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-bold">Ekspedisi</th>
                  <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-bold">Pengemudi</th>
                  <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-bold">Produk</th>
                  <th className="px-1 py-2 text-center text-[10px] sm:text-xs font-bold">Pallet</th>
                  <th className="px-1 py-2 text-center text-[10px] sm:text-xs font-bold">Carton</th>
                  <th className="px-1 py-2 text-center text-[10px] sm:text-xs font-bold">Status</th>
                  <th className="px-2 py-2 text-center text-[10px] sm:text-xs font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center">
                      <div className="text-4xl mb-2">📦</div>
                      <p className="text-gray-600 text-xs font-semibold">Tidak ada data</p>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => {
                    const product = productMasterData.find(p => p.id === item.productId);
                    return (
                      <tr key={item.id} className="hover:bg-blue-50 transition-colors">
                        <td className="px-2 py-1.5 text-[10px] sm:text-xs text-gray-700 whitespace-nowrap">
                          {formatDate(item.arrivalTime)}
                        </td>
                        <td className="px-2 py-1.5">
                          <span className="inline-block px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] sm:text-xs font-bold">
                            {item.expeditionId || '-'}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-[10px] sm:text-xs font-semibold text-gray-800 whitespace-nowrap max-w-[100px] truncate">
                          {item.driverName}
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="text-[10px] sm:text-xs max-w-[150px]">
                            <div className="font-mono text-blue-600">{product?.productCode || '-'}</div>
                            <div className="font-semibold text-gray-800 truncate" title={product?.productName || '-'}>
                              {product?.productName || '-'}
                            </div>
                          </div>
                        </td>
                        <td className="px-1 py-1.5 text-center text-[10px] sm:text-xs font-bold text-green-600">
                          {item.locations.length}
                        </td>
                        <td className="px-1 py-1.5 text-center text-[10px] sm:text-xs font-bold text-blue-600">
                          {item.qtyCarton}
                        </td>
                        <td className="px-1 py-1.5 text-center">
                          <span className="inline-block px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] sm:text-xs font-bold">
                            ✓
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <button
                            onClick={() => handleViewDetail(item)}
                            className="px-2 py-1 bg-blue-600 text-white rounded text-[10px] sm:text-xs font-semibold hover:bg-blue-700 transition-colors"
                          >
                            Detail
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedItem && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={handleCloseDetail}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-linear-to-r from-blue-500 to-indigo-600 p-6 text-white sticky top-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Detail Transaksi Inbound</h2>
                    <p className="text-sm opacity-90 mt-1">
                      {formatDate(selectedItem.arrivalTime)} - {selectedItem.expeditionId || '-'}
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
                      <p className="text-xs text-gray-600">Kode Transaksi</p>
                      <p className="font-mono font-semibold text-gray-800">{selectedItem.transactionCode}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Tanggal</p>
                      <p className="font-semibold text-gray-800">{formatDate(selectedItem.arrivalTime)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Ekspedisi</p>
                      <p className="font-semibold text-gray-800">{selectedItem.expeditionId || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Pengemudi</p>
                      <p className="font-semibold text-gray-800">{selectedItem.driverName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">No. Polisi</p>
                      <p className="font-mono font-semibold text-gray-800">{selectedItem.vehicleNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">No. DN</p>
                      <p className="font-mono font-semibold text-gray-800">{selectedItem.dnNumber}</p>
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
                      <p className="font-mono font-bold text-blue-600 text-lg">{productMasterData.find(p => p.id === selectedItem.productId)?.productCode || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Nama Produk</p>
                      <p className="font-semibold text-gray-800">{productMasterData.find(p => p.id === selectedItem.productId)?.productName || '-'}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 pt-3 border-t border-blue-200">
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-1">Qty Lokasi</p>
                        <p className="text-2xl font-bold text-green-600">{selectedItem.locations.length}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-1">Qty Carton</p>
                        <p className="text-2xl font-bold text-blue-600">{selectedItem.qtyCarton}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-1">Total Pcs</p>
                        <p className="text-2xl font-bold text-purple-600">{((productMasterData.find(p => p.id === selectedItem.productId)?.qtyPerCarton || 0) * selectedItem.qtyCarton).toLocaleString()}</p>
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
                  <div className="space-y-2">
                    {selectedItem.locations.map((loc, idx) => (
                      <div key={idx} className="bg-green-50 p-3 rounded-xl border border-green-200">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-xs text-gray-600">Lokasi</p>
                            <p className="font-mono font-semibold text-green-700">{loc.cluster}-L{loc.lorong}-B{loc.baris}-P{loc.level}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Qty</p>
                            <p className="font-semibold text-gray-800">{loc.qtyCarton} carton{loc.isReceh ? ' (Receh)' : ''}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Waktu & Metadata */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="text-2xl">⏰</span>
                    Waktu & Metadata
                  </h3>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                    <div>
                      <p className="text-xs text-gray-600">Waktu Kedatangan</p>
                      <p className="font-semibold text-gray-800">{formatDateTime(selectedItem.arrivalTime)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Diterima Oleh</p>
                      <p className="font-semibold text-gray-800">{selectedItem.receivedBy}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-600">Catatan</p>
                      <p className="font-semibold text-gray-800">{selectedItem.notes || '-'}</p>
                    </div>
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
