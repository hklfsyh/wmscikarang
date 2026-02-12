"use client";

// Outbound History Component for Admin Cabang
import { useState, useMemo } from "react";
import { Search, Calendar, TruckIcon, FileDown, X, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import * as XLSX from "xlsx";

// Interface untuk Props
interface OutboundHistoryPageProps {
  history: any[];
  products: any[];
  users: any[];
}

export function OutboundHistoryPage({
  history,
  products,
  users,
}: OutboundHistoryPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<
    "all" | "completed" | "partial"
  >("all");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Filter data
  const filteredData = useMemo(() => {
    return history.filter((item) => {
      // Get product data for search
      const product = products.find((p) => p.id === item.product_id);

      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === "" ||
        item.id.toLowerCase().includes(searchLower) ||
        item.transaction_code.toLowerCase().includes(searchLower) ||
        product?.product_name.toLowerCase().includes(searchLower) ||
        false ||
        product?.product_code.toLowerCase().includes(searchLower) ||
        false ||
        item.driver_name.toLowerCase().includes(searchLower) ||
        item.vehicle_number.toLowerCase().includes(searchLower) ||
        (item.locations &&
          item.locations.some((loc: any) =>
            `${loc.cluster}-L${loc.lorong}-B${loc.baris}-P${loc.level}`
              .toLowerCase()
              .includes(searchLower)
          ));

      // Date filter
      const itemDate = new Date(item.created_at);
      const matchesStartDate = !startDate || itemDate >= new Date(startDate);
      const matchesEndDate = !endDate || itemDate <= new Date(endDate);

      // Status filter - all items are completed in new schema
      const matchesStatus =
        selectedStatus === "all" || selectedStatus === "completed";

      return (
        matchesSearch && matchesStartDate && matchesEndDate && matchesStatus
      );
    });
  }, [searchQuery, startDate, endDate, selectedStatus, history, products]);

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
  const handleViewDetail = (item: any) => {
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
    // Prepare data for export - format: 1 baris per lokasi untuk detail BB Produk
    const exportData: Record<string, string | number>[] = [];
    let rowNum = 1;

    filteredData.forEach((item) => {
      // Get product data
      const product = products.find((p) => p.id === item.product_id);
      const totalPcs = product ? item.qty_carton * product.qty_per_carton : 0;

      // Untuk setiap lokasi dalam transaksi, buat baris terpisah
      const locations = item.locations || [];
      locations.forEach((locationItem: any, locIdx: number) => {
        const locationStr = `${locationItem.cluster}-L${locationItem.lorong}-B${locationItem.baris}-P${locationItem.level}`;
        
        // Extract expired date from BB Produk (first 6 digits YYMMDD)
        let expiredDate = "-";
        const bbProduk = locationItem.bbProduk || "";
        if (bbProduk.length >= 6) {
          const yy = bbProduk.substring(0, 2);
          const mm = bbProduk.substring(2, 4);
          const dd = bbProduk.substring(4, 6);
          const year = parseInt(yy) + 2000; // Assume 20xx
          const expDate = new Date(year, parseInt(mm) - 1, parseInt(dd));
          expiredDate = expDate.toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
        }

        // Get user who processed this outbound
        const processedByUser = users.find((u) => u.id === item.processed_by);

        exportData.push({
          No: rowNum++,
          "Kode Transaksi": item.transaction_code,
          Tanggal: formatDate(item.created_at),
          Pengemudi: item.driver_name,
          "Dikeluarkan Oleh": processedByUser?.full_name || item.processed_by || "-",
          "No. Polisi": item.vehicle_number,
          "Kode Produk": product?.product_code || "-",
          "Nama Produk": product?.product_name || "-",
          "Total PCS": totalPcs,
          "Lokasi #": locIdx + 1,
          Lokasi: locationStr,
          "Qty Carton": locationItem.qtyCarton || 0,
          "BB Produk": locationItem.bbProduk,
          "Expired Date": expiredDate,
          Status: "Selesai",
          "Waktu Keluar": formatDateTime(
            item.departure_time || item.created_at
          ),
        });
      });
    });

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    const colWidths = [
      { wch: 5 }, // No
      { wch: 18 }, // Kode Transaksi
      { wch: 12 }, // Tanggal
      { wch: 20 }, // Pengemudi
      { wch: 25 }, // Dikeluarkan Oleh
      { wch: 12 }, // No. Polisi
      { wch: 12 }, // Kode Produk
      { wch: 40 }, // Nama Produk
      { wch: 10 }, // Total PCS
      { wch: 8 }, // Lokasi #
      { wch: 15 }, // Lokasi
      { wch: 12 }, // Qty Carton
      { wch: 20 }, // BB Produk
      { wch: 14 }, // Expired Date
      { wch: 10 }, // Status
      { wch: 18 }, // Waktu Keluar
    ];
    ws["!cols"] = colWidths;

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Riwayat Outbound");

    // Generate filename with current date
    const date = new Date();
    const filename = `Riwayat_Outbound_${date.getFullYear()}${String(
      date.getMonth() + 1
    ).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}_${String(
      date.getHours()
    ).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 to-red-100">
      <div className="w-full max-w-full space-y-3 sm:space-y-4">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-linear-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center shrink-0">
                <TruckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">
                  Riwayat Outbound
                </h1>
                <p className="text-[10px] sm:text-xs text-gray-600">
                  Data transaksi pengiriman barang keluar dari gudang
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
                placeholder="ID, Produk, Pengemudi..."
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 transition-colors"
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
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 transition-colors"
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
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
          </div>

          {/* Status Filter & Reset */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            <span className="text-[10px] sm:text-xs font-semibold text-gray-700">
              Status:
            </span>
            <button
              onClick={() => setSelectedStatus("all")}
              className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs rounded-lg font-semibold transition-all ${
                selectedStatus === "all"
                  ? "bg-orange-600 text-white"
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
              {filteredData.length} dari {history.length} transaksi
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-linear-to-r from-orange-500 to-red-600 text-white">
                <tr>
                  <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-bold">
                    Tanggal
                  </th>
                  <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-bold">
                    Pengemudi
                  </th>
                  <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-bold">
                    Produk
                  </th>
                  <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-bold">
                    BB Produk
                  </th>
                  <th className="px-1 py-2 text-center text-[10px] sm:text-xs font-bold">
                    Pallet
                  </th>
                  <th className="px-1 py-2 text-center text-[10px] sm:text-xs font-bold">
                    Carton
                  </th>
                  <th className="px-1 py-2 text-center text-[10px] sm:text-xs font-bold">
                    Status
                  </th>
                  <th className="px-2 py-2 text-center text-[10px] sm:text-xs font-bold">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center">
                      <div className="text-4xl mb-2">📦</div>
                      <p className="text-gray-600 text-xs font-semibold">
                        Tidak ada data
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => {
                    const product = products.find(
                      (p) => p.id === item.product_id
                    );
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-orange-50 transition-colors"
                      >
                        <td className="px-2 py-1.5 text-[10px] sm:text-xs text-gray-700 whitespace-nowrap">
                          {formatDate(item.departure_time)}
                        </td>
                        <td className="px-2 py-1.5 text-[10px] sm:text-xs font-semibold text-gray-800 whitespace-nowrap max-w-[100px] truncate">
                          {item.driver_name}
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="text-[10px] sm:text-xs max-w-[150px]">
                            <div className="font-mono text-orange-600">
                              {product?.product_code || "-"}
                            </div>
                            <div
                              className="font-semibold text-gray-800 truncate"
                              title={product?.product_name || "-"}
                            >
                              {product?.product_name || "-"}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-1.5">
                          {(() => {
                            const bbList = item.locations
                              .map((loc: any) => loc.bbProduk)
                              .filter(
                                (bb: any, idx: number, arr: any[]) =>
                                  arr.indexOf(bb) === idx
                              );
                            if (bbList.length === 0)
                              return (
                                <span className="text-gray-400 text-[10px]">
                                  -
                                </span>
                              );
                            return (
                              <div className="text-[10px] sm:text-xs max-w-[120px]">
                                {bbList.length === 1 ? (
                                  <span className="font-mono text-purple-600">
                                    {bbList[0]}
                                  </span>
                                ) : (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-mono text-purple-600">
                                      {bbList[0]}
                                    </span>
                                    <span className="text-gray-500 text-[9px]">
                                      +{bbList.length - 1} lainnya
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-2 py-2 text-center text-xs font-bold text-green-600">
                          {item.locations.length}
                        </td>
                        <td className="px-2 py-2 text-center text-xs font-bold text-blue-600">
                          {item.qty_carton}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold whitespace-nowrap">
                            ✓ Done
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => handleViewDetail(item)}
                            className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-semibold hover:bg-orange-700 transition-colors"
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
              <div className="bg-linear-to-r from-orange-500 to-red-600 p-6 text-white sticky top-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">
                      Detail Transaksi Outbound
                    </h2>
                    <p className="text-sm opacity-90 mt-1">
                      {formatDate(selectedItem.departure_time)} -{" "}
                      {selectedItem.driver_name}
                    </p>
                  </div>
                  <button
                    onClick={handleCloseDetail}
                    className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {/* Informasi Pengiriman */}
                <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200">
                  <h3 className="font-bold text-orange-900 mb-3 flex items-center gap-2">
                    <span className="text-lg">🚚</span> Informasi Pengiriman
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Tanggal:</span>
                      <p className="font-semibold text-gray-900">
                        {new Date(
                          selectedItem.departure_time
                        ).toLocaleDateString("id-ID", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Nama Pengemudi:</span>
                      <p className="font-semibold text-gray-900">
                        {selectedItem.driver_name}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-600">No. Polisi:</span>
                      <p className="font-semibold text-gray-900">
                        {selectedItem.vehicle_number}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Informasi Produk */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                  <h3 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                    <span className="text-lg">📦</span> Informasi Produk
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="col-span-2">
                      <span className="text-gray-600">Nama Produk:</span>
                      <p className="font-semibold text-gray-900">
                        {(() => {
                          const product = products.find(
                            (p) => p.id === selectedItem.product_id
                          );
                          return product?.product_name || "-";
                        })()}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Kode Produk:</span>
                      <p className="font-semibold text-gray-900">
                        {(() => {
                          const product = products.find(
                            (p) => p.id === selectedItem.product_id
                          );
                          return product?.product_code || "-";
                        })()}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Total PCS:</span>
                      <p className="font-semibold text-gray-900">
                        {(() => {
                          const product = products.find(
                            (p) => p.id === selectedItem.product_id
                          );
                          const totalPcs = product
                            ? selectedItem.qty_carton * product.qty_per_carton
                            : 0;
                          return totalPcs.toLocaleString();
                        })()}{" "}
                        pcs
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Qty Pallet:</span>
                      <p className="font-semibold text-gray-900">
                        {selectedItem.locations.length} pallet
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Qty Carton:</span>
                      <p className="font-semibold text-gray-900">
                        {selectedItem.qty_carton} carton
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lokasi Pengambilan FEFO dengan QR Code */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                  <h3 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                    <span className="text-lg">📍</span> Lokasi Pengambilan FEFO
                  </h3>
                  <div className="space-y-3">
                    {selectedItem.locations.map(
                      (locationItem: any, idx: number) => {
                        const locationStr = `${locationItem.cluster}-L${locationItem.lorong}-B${locationItem.baris}-P${locationItem.level}`;

                        return (
                          <div
                            key={idx}
                            className="bg-white rounded-lg p-3 border border-purple-200 shadow-sm"
                          >
                            <div className="flex items-start gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="inline-block px-2 py-1 bg-purple-600 text-white rounded text-xs font-bold">
                                    #{idx + 1}
                                  </span>
                                  <span className="font-semibold text-gray-900 text-lg">
                                    {locationStr}
                                  </span>
                                </div>

                                <div className="text-sm space-y-1.5">
                                  <div className="flex justify-between border-b border-gray-50 pb-1">
                                    <span className="text-gray-600">
                                      BB Produk:
                                    </span>
                                    <span className="font-mono font-bold text-purple-600">
                                      {locationItem.bbProduk}
                                    </span>
                                  </div>

                                  <div className="flex justify-between border-b border-gray-50 pb-1">
                                    <span className="text-gray-600">
                                      Expired:
                                    </span>
                                    <span className="font-semibold text-gray-900">
                                      {(() => {
                                        // Extract YYMMDD from first 6 digits of BB Produk
                                        const bbProduk =
                                          locationItem.bbProduk || "";
                                        if (bbProduk.length >= 6) {
                                          const yy = bbProduk.substring(0, 2);
                                          const mm = bbProduk.substring(2, 4);
                                          const dd = bbProduk.substring(4, 6);
                                          const year = parseInt(yy) + 2000; // Assume 20xx
                                          const expDate = new Date(
                                            year,
                                            parseInt(mm) - 1,
                                            parseInt(dd)
                                          );
                                          return expDate.toLocaleDateString(
                                            "id-ID",
                                            {
                                              day: "2-digit",
                                              month: "short",
                                              year: "numeric",
                                            }
                                          );
                                        }
                                        return "-";
                                      })()}
                                    </span>
                                  </div>

                                  {/* Menampilkan Qty per Lokasi */}
                                  <div className="flex justify-between pt-1">
                                    <span className="text-gray-600 font-medium">
                                      Qty Diambil:
                                    </span>
                                    <span className="font-bold text-orange-600 text-base">
                                      {locationItem.qtyCarton || 0}{" "}
                                      <span className="text-xs font-normal text-gray-500">
                                        Carton
                                      </span>
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Barcode / QR Section */}
                              <div className="flex flex-col items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <QRCodeSVG
                                  value={locationItem.bbProduk}
                                  size={100}
                                  level="H"
                                  includeMargin={false}
                                />
                                <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase tracking-wider">
                                  QR BB Produk
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* Waktu Input */}
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="text-lg">⏰</span> Waktu Input
                  </h3>
                  <div className="text-sm">
                    <span className="text-gray-600">Dibuat pada:</span>
                    <p className="font-semibold text-gray-900">
                      {new Date(selectedItem.created_at).toLocaleString(
                        "id-ID",
                        {
                          dateStyle: "full",
                          timeStyle: "medium",
                        }
                      )}
                    </p>
                  </div>
                </div>

                {/* Status */}
                <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-4 border border-slate-200">
                  <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="text-lg">✓</span> Status Transaksi
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex px-4 py-2 text-sm font-bold rounded-lg bg-green-100 text-green-800">
                      ✓ SELESAI
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={handleCloseDetail}
                  className="px-6 py-2.5 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors"
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
