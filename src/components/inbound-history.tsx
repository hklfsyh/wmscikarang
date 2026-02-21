"use client";

import { useState, useMemo } from "react";
import { Search, Calendar, TruckIcon, FileDown, ArrowLeft, Edit, Trash2 } from "lucide-react";
import * as XLSX from 'xlsx';
import { Navigation } from "@/components/navigation";
import { cancelInboundAction } from "@/app/inbound/actions";
import { useRouter } from "next/navigation";

// --- INTERFACES ---
interface Product {
  id: string;
  product_code: string;
  product_name: string;
  qty_per_carton: number;
}

interface Expedition {
  id: string;
  expedition_code: string;
  expedition_name: string;
  warehouse_id: string;
}

interface User {
  id: string;
  full_name: string;
  username: string;
}

interface InboundHistory {
  id: string;
  transactionCode: string;
  productId: string;
  arrivalTime: string;
  expeditionId: string;
  driverName: string;
  vehicleNumber: string;
  dnNumber: string;
  bbProduk: string;
  expiredDate: string;
  qtyCarton: number;
  receivedBy: string;
  notes: string;
  locations: Array<{
    cluster: string;
    lorong: number;
    baris: number;
    level: number;
    qtyCarton: number;
    isReceh: boolean;
  }>;
}

interface InboundHistoryPageProps {
  userProfile?: any;
  historyData: InboundHistory[];
  products: Product[];
  expeditions: Expedition[];
  users: User[];
}

export function InboundHistoryPage({ 
  userProfile, 
  historyData = [], 
  products = [],
  expeditions = [],
  users = []
}: InboundHistoryPageProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "completed" | "partial">("all");
  const [selectedItem, setSelectedItem] = useState<InboundHistory | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Modal confirmations
  const [showBatalModal, setShowBatalModal] = useState(false);
  const [itemToBatal, setItemToBatal] = useState<InboundHistory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- LOGIKA FILTER (MENGGUNAKAN DATA DARI PROPS) ---
  const filteredData = useMemo(() => {
    return historyData.filter((item) => {
      const product = products.find(p => p.id === item.productId);
      const expedition = expeditions.find(e => e.id === item.expeditionId);
      const user = users.find(u => u.id === item.receivedBy);
      const searchLower = searchQuery.toLowerCase();

      const matchesSearch =
        searchQuery === "" ||
        item.transactionCode.toLowerCase().includes(searchLower) ||
        (product?.product_name.toLowerCase().includes(searchLower) || false) ||
        (product?.product_code.toLowerCase().includes(searchLower) || false) ||
        item.driverName.toLowerCase().includes(searchLower) ||
        item.vehicleNumber.toLowerCase().includes(searchLower) ||
        item.dnNumber.toLowerCase().includes(searchLower) ||
        (expedition?.expedition_name.toLowerCase().includes(searchLower) || false) ||
        (user?.full_name.toLowerCase().includes(searchLower) || false);

      const itemDate = new Date(item.arrivalTime);
      const matchesStartDate = !startDate || itemDate >= new Date(startDate);
      const matchesEndDate = !endDate || itemDate <= new Date(endDate);

      // Status filter (all transactions are completed in new schema)
      const matchesStatus = selectedStatus === "all" || selectedStatus === "completed";

      return matchesSearch && matchesStartDate && matchesEndDate && matchesStatus;
    });
  }, [searchQuery, startDate, endDate, selectedStatus, historyData, products, expeditions, users]);

  // --- FORMAT HELPERS ---
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

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

  const handleReset = () => {
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setSelectedStatus("all");
  };

  const handleViewDetail = (item: InboundHistory) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedItem(null);
  };

  // Handle Edit - Populate form di inbound-form component
  const handleEdit = (item: InboundHistory) => {
    // Store data to localStorage untuk dipopulate di form
    localStorage.setItem('inbound_edit_data', JSON.stringify(item));
    router.push('/inbound?mode=edit');
  };

  // Handle Batal - Show confirmation modal
  const handleBatal = (item: InboundHistory) => {
    setItemToBatal(item);
    setShowBatalModal(true);
  };

  // Confirm Batal Action
  const confirmBatal = async () => {
    if (!itemToBatal) return;
    
    setIsSubmitting(true);
    try {
      const result = await cancelInboundAction(itemToBatal.id);
      
      if (result.success) {
        alert(`✓ ${result.message}`);
        setShowBatalModal(false);
        setItemToBatal(null);
        setShowDetailModal(false);
        setSelectedItem(null);
        router.refresh(); // Refresh data
      } else {
        alert(`✗ ${result.message}`);
      }
    } catch (error: any) {
      alert(`✗ Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- EXPORT TO EXCEL ---
  const exportToExcel = () => {
    const exportData = filteredData.map((item, index) => {
      const product = products.find(p => p.id === item.productId);
      const expedition = expeditions.find(e => e.id === item.expeditionId);
      const user = users.find(u => u.id === item.receivedBy);
      const totalPcs = (product?.qty_per_carton || 0) * item.qtyCarton;
      return {
        'No': index + 1,
        'Kode Transaksi': item.transactionCode,
        'Tanggal': formatDate(item.arrivalTime),
        'Ekspedisi': expedition?.expedition_name || item.expeditionId || '-',
        'Pengemudi': item.driverName,
        'No. Polisi': item.vehicleNumber,
        'No. DN': item.dnNumber,
        'Kode Produk': product?.product_code || '-',
        'Nama Produk': product?.product_name || '-',
        'Qty Lokasi': item.locations.length,
        'Qty Carton': item.qtyCarton,
        'Total Pcs': totalPcs,
        'BB Produk': item.bbProduk,
        'Expired Date': formatDate(item.expiredDate),
        'Lokasi': item.locations.map(loc => `${loc.cluster}-L${loc.lorong}-B${loc.baris}-P${loc.level}`).join(', '),
        'Diterima Oleh': user?.full_name || item.receivedBy || '-',
        'Waktu Kedatangan': formatDateTime(item.arrivalTime),
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Riwayat Inbound');

    const date = new Date();
    const filename = `Riwayat_Inbound_${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      <Navigation userProfile={userProfile} />
      <div className="lg:pl-10 p-4 md:p-6 space-y-3 sm:space-y-4">
        
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

          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            <span className="text-[10px] sm:text-xs font-semibold text-gray-700">Status:</span>
            <button
              onClick={() => setSelectedStatus("all")}
              className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs rounded-lg font-semibold transition-all ${
                selectedStatus === "all" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setSelectedStatus("completed")}
              className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs rounded-lg font-semibold transition-all ${
                selectedStatus === "completed" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Selesai
            </button>
            <button
              onClick={() => setSelectedStatus("partial")}
              className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs rounded-lg font-semibold transition-all ${
                selectedStatus === "partial" ? "bg-yellow-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
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

          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-[10px] sm:text-xs text-gray-600">
              {filteredData.length} transaksi ditemukan
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
                    const product = products.find(p => p.id === item.productId);
                    const expedition = expeditions.find(e => e.id === item.expeditionId);
                    return (
                      <tr key={item.id} className="hover:bg-blue-50 transition-colors">
                        <td className="px-2 py-1.5 text-[10px] sm:text-xs text-gray-700 whitespace-nowrap">
                          {formatDate(item.arrivalTime)}
                        </td>
                        <td className="px-2 py-1.5">
                          <span className="inline-block px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] sm:text-xs font-bold">
                            {expedition?.expedition_name || item.expeditionId || '-'}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-[10px] sm:text-xs font-semibold text-gray-800 whitespace-nowrap max-w-[100px] truncate">
                          {item.driverName}
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="text-[10px] sm:text-xs max-w-[150px]">
                            <div className="font-mono text-blue-600">{product?.product_code || '-'}</div>
                            <div className="font-semibold text-gray-800 truncate">
                              {product?.product_name || '-'}
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
                      {formatDate(selectedItem.arrivalTime)} - {expeditions.find(e => e.id === selectedItem.expeditionId)?.expedition_name || selectedItem.expeditionId || '-'}
                    </p>
                  </div>
                  <button
                    onClick={handleCloseDetail}
                    className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="text-2xl">🚚</span> Informasi Pengiriman
                  </h3>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl text-sm">
                    <div><p className="text-xs text-gray-600">Kode Transaksi</p><p className="font-mono font-semibold">{selectedItem.transactionCode}</p></div>
                    <div><p className="text-xs text-gray-600">Tanggal</p><p className="font-semibold">{formatDate(selectedItem.arrivalTime)}</p></div>
                    <div><p className="text-xs text-gray-600">Ekspedisi</p><p className="font-semibold">{expeditions.find(e => e.id === selectedItem.expeditionId)?.expedition_name || selectedItem.expeditionId || '-'}</p></div>
                    <div><p className="text-xs text-gray-600">Pengemudi</p><p className="font-semibold">{selectedItem.driverName}</p></div>
                    <div><p className="text-xs text-gray-600">Diterima Oleh</p><p className="font-semibold">{(() => {
                      const receivedByUser = users.find(u => u.id === selectedItem.receivedBy);
                      return receivedByUser?.full_name || '-';
                    })()}</p></div>
                    <div><p className="text-xs text-gray-600">No. Polisi</p><p className="font-mono font-semibold">{selectedItem.vehicleNumber}</p></div>
                    <div><p className="text-xs text-gray-600">No. DN</p><p className="font-mono font-semibold">{selectedItem.dnNumber}</p></div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="text-2xl">📦</span> Informasi Produk
                  </h3>
                  <div className="bg-blue-50 p-4 rounded-xl space-y-3">
                    <div>
                      <p className="text-xs text-gray-600">Kode Produk</p>
                      <p className="font-mono font-bold text-blue-600 text-lg">{products.find(p => p.id === selectedItem.productId)?.product_code || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Nama Produk</p>
                      <p className="font-semibold">{products.find(p => p.id === selectedItem.productId)?.product_name || '-'}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 pt-3 border-t border-blue-200">
                      <div className="text-center"><p className="text-xs text-gray-600">Qty Lokasi</p><p className="text-2xl font-bold text-green-600">{selectedItem.locations.length}</p></div>
                      <div className="text-center"><p className="text-xs text-gray-600">Qty Carton</p><p className="text-2xl font-bold text-blue-600">{selectedItem.qtyCarton}</p></div>
                      <div className="text-center"><p className="text-xs text-gray-600">Total Pcs</p><p className="text-2xl font-bold text-purple-600">{((products.find(p => p.id === selectedItem.productId)?.qty_per_carton || 0) * selectedItem.qtyCarton).toLocaleString()}</p></div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="text-2xl">📍</span> Lokasi Penyimpanan
                  </h3>
                  <div className="space-y-2">
                    {selectedItem.locations.map((loc, idx) => (
                      <div key={idx} className="bg-green-50 p-3 rounded-xl border border-green-200 text-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div><p className="text-xs text-gray-600">Lokasi</p><p className="font-mono font-semibold text-green-700">{loc.cluster}-L{loc.lorong}-B{loc.baris}-P{loc.level}</p></div>
                          <div><p className="text-xs text-gray-600">Qty</p><p className="font-semibold">{loc.qtyCarton} ctn{loc.isReceh ? ' (Receh)' : ''}</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer with Edit/Batal Buttons */}
              <div className="bg-gray-50 p-4 sticky bottom-0 border-t">
                <div className="flex gap-2">
                  {userProfile?.role === "admin_warehouse" && (
                    <>
                      <button
                        onClick={() => handleEdit(selectedItem)}
                        className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleBatal(selectedItem)}
                        className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Batal
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleCloseDetail}
                    className={`${userProfile?.role === "admin_warehouse" ? 'flex-1' : 'w-full'} px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors`}
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Batal Confirmation Modal */}
        {showBatalModal && itemToBatal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="bg-red-500 p-4 text-white rounded-t-2xl">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Trash2 className="w-6 h-6" />
                  Konfirmasi Pembatalan
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-gray-700">
                  Apakah Anda yakin ingin <strong className="text-red-600">membatalkan</strong> transaksi ini?
                </p>
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                  <p className="text-sm text-red-800 font-semibold mb-2">⚠️ Peringatan:</p>
                  <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
                    <li>Semua stock dari transaksi ini akan dihapus</li>
                    <li>Trigger FEFO akan otomatis memperbarui antrian</li>
                    <li>Data transaksi akan dihapus permanent</li>
                    <li>Aksi ini <strong>TIDAK BISA</strong> dibatalkan</li>
                  </ul>
                </div>
                <div className="bg-gray-100 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Kode Transaksi:</p>
                  <p className="font-mono font-bold text-gray-900">{itemToBatal.transactionCode}</p>
                </div>
              </div>
              <div className="bg-gray-50 p-4 flex gap-2 rounded-b-2xl">
                <button
                  onClick={() => {
                    setShowBatalModal(false);
                    setItemToBatal(null);
                  }}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Tidak, Kembali
                </button>
                <button
                  onClick={confirmBatal}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Memproses...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Ya, Batalkan
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}