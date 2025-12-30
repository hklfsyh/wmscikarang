"use client";

import { useState, useMemo, useEffect } from "react";
import { Navigation } from "@/components/navigation";

// Interface sesuai data dari database
interface StockItem {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  bbProduk: string;
  cluster: string;
  lorong: string;
  baris: string;
  level: string;
  qtyPallet: number;
  qtyCarton: number;
  expiredDate: string;
  inboundDate: string;
  status: string;
  isReceh: boolean;
  parentStockId?: string | null;
  productInfo?: {
    qtyPerCarton: number;
    qtyCartonPerPallet: number;
    defaultCluster: string;
  };
}

interface Product {
  id: string;
  product_name: string;
}

interface Warehouse {
  id: string;
  warehouse_code: string;
  city_name: string;
}

export default function StockListClient({
  userProfile,
  warehouse,
  initialStock,
  productsList,
}: {
  userProfile: any;
  warehouse: Warehouse | null;
  initialStock: StockItem[];
  productsList: Product[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCluster, setFilterCluster] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterProduct, setFilterProduct] = useState("all");
  const [sortBy, setSortBy] = useState<"expiredDate" | "inboundDate" | "productName">("expiredDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const itemsPerPage = 10;

  // Get unique products for filter
  const uniqueProducts = useMemo(() => {
    return productsList
      .map(product => [product.id, product.product_name] as [string, string])
      .sort((a, b) => a[1].localeCompare(b[1]));
  }, [productsList]);

  // Filter & Sort Logic
  const filteredAndSortedData = useMemo(() => {
    let filtered = [...initialStock];

    // Search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((item) => {
        const productName = item.productName || '';
        const productCode = item.productCode || '';
        const bbProdukString = item.bbProduk.toLowerCase();
        const locationString = `${item.cluster}-L${item.lorong}-B${item.baris}-${item.level}`.toLowerCase();
        
        return productName.toLowerCase().includes(search) ||
          productCode.toLowerCase().includes(search) ||
          bbProdukString.includes(search) ||
          locationString.includes(search);
      });
    }

    // Filter Cluster
    if (filterCluster !== "all") {
      filtered = filtered.filter((item) => item.cluster === filterCluster);
    }

    // Filter Status
    if (filterStatus !== "all") {
      filtered = filtered.filter((item) => item.status === filterStatus);
    }

    // Filter Product
    if (filterProduct !== "all") {
      filtered = filtered.filter((item) => item.productId === filterProduct);
    }

    // Sort
    filtered.sort((a, b) => {
      let compareValue = 0;
      if (sortBy === "expiredDate") {
        compareValue = new Date(a.expiredDate).getTime() - new Date(b.expiredDate).getTime();
      } else if (sortBy === "inboundDate") {
        compareValue = new Date(a.inboundDate).getTime() - new Date(b.inboundDate).getTime();
      } else if (sortBy === "productName") {
        compareValue = (a.productName || '').localeCompare(b.productName || '');
      }
      return sortOrder === "asc" ? compareValue : -compareValue;
    });

    return filtered;
  }, [initialStock, searchTerm, filterCluster, filterStatus, filterProduct, sortBy, sortOrder]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCluster, filterStatus, filterProduct]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredAndSortedData.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Statistics - DYNAMIC based on filtered data
  const stats = useMemo(() => {
    const data = filteredAndSortedData;
    const totalItems = data.length;
    const totalExpired = data.filter((item) => item.status === "expired").length;
    const totalHold = data.filter((item) => item.status === "hold").length;
    const totalRelease = data.filter((item) => item.status === "release").length;
    const totalReceh = data.filter((item) => item.status === "receh").length;
    const totalSalahCluster = data.filter((item) => item.status === "salah-cluster").length;
    const totalQtyCarton = data.reduce((sum, item) => sum + item.qtyCarton, 0);

    const now = new Date();
    const expiringSoon = data.filter((item) => {
      const expDate = new Date(item.expiredDate);
      const diffTime = expDate.getTime() - now.getTime();
      const diffDays = diffTime / (1000 * 3600 * 24);
      return diffDays < 180 && diffDays > 0;
    }).length;

    return { totalItems, totalExpired, totalHold, totalRelease, totalReceh, totalSalahCluster, totalQtyCarton, expiringSoon };
  }, [filteredAndSortedData]);

  // Status Badge
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      "expired": "bg-red-600 text-white",
      "hold": "bg-yellow-100 text-yellow-700",
      "release": "bg-green-100 text-green-700",
      "receh": "bg-purple-100 text-purple-700",
      "salah-cluster": "bg-red-100 text-red-700",
    };
    const labels: Record<string, string> = {
      "expired": "Expired",
      "hold": "Hold",
      "release": "Release",
      "receh": "Receh",
      "salah-cluster": "Salah Cluster",
    };
    return (
      <span className={`px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-semibold whitespace-nowrap ${styles[status] || "bg-gray-100 text-gray-700"}`}>
        {labels[status] || status}
      </span>
    );
  };

  // Days to Expired
  const getDaysToExpired = (expiredDate: string) => {
    const now = new Date();
    const expDate = new Date(expiredDate);
    const diffTime = expDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
    
    if (diffDays < 0) return <span className="text-red-600 font-bold">Expired!</span>;
    
    const months = Math.floor(diffDays / 30);
    const days = diffDays % 30;
    const displayText = months > 0 ? `${months}bln ${days}hr` : `${days} hari`;
    
    if (diffDays < 90) return <span className="text-orange-600 font-semibold">{displayText}</span>;
    if (diffDays < 180) return <span className="text-yellow-600 font-semibold">{displayText}</span>;
    return <span className="text-green-600">{displayText}</span>;
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  };

  // Open detail modal
  const handleViewDetail = (item: StockItem) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  return (
    <>
      <Navigation userProfile={userProfile} />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 lg:pl-8 p-4">
        <div className="w-full max-w-full">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 mb-3">
            <div className="flex items-center gap-2 sm:gap-3 mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-xl">
                📦
              </div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">
                Stock List (Pallet){warehouse?.city_name ? ` - ${warehouse.city_name}` : ""}
              </h1>
            </div>

            {/* Statistics Cards - Dynamic */}
            <div className="grid grid-cols-4 lg:grid-cols-8 gap-1.5 sm:gap-2">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-1.5 sm:p-2 text-center">
                <p className="text-blue-600 text-[10px] sm:text-xs font-medium truncate">Total</p>
                <p className="text-blue-900 text-sm sm:text-base lg:text-lg font-bold">{stats.totalItems}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-1.5 sm:p-2 text-center">
                <p className="text-red-600 text-[10px] sm:text-xs font-medium truncate">Expired</p>
                <p className="text-red-900 text-sm sm:text-base lg:text-lg font-bold">{stats.totalExpired}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-1.5 sm:p-2 text-center">
                <p className="text-green-600 text-[10px] sm:text-xs font-medium truncate">Release</p>
                <p className="text-green-900 text-sm sm:text-base lg:text-lg font-bold">{stats.totalRelease}</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-1.5 sm:p-2 text-center">
                <p className="text-yellow-600 text-[10px] sm:text-xs font-medium truncate">Hold</p>
                <p className="text-yellow-900 text-sm sm:text-base lg:text-lg font-bold">{stats.totalHold}</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-1.5 sm:p-2 text-center">
                <p className="text-purple-600 text-[10px] sm:text-xs font-medium truncate">Receh</p>
                <p className="text-purple-900 text-sm sm:text-base lg:text-lg font-bold">{stats.totalReceh}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-1.5 sm:p-2 text-center">
                <p className="text-red-600 text-[10px] sm:text-xs font-medium truncate">Salah</p>
                <p className="text-red-900 text-sm sm:text-base lg:text-lg font-bold">{stats.totalSalahCluster}</p>
              </div>
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-1.5 sm:p-2 text-center">
                <p className="text-indigo-600 text-[10px] sm:text-xs font-medium truncate">Carton</p>
                <p className="text-indigo-900 text-sm sm:text-base lg:text-lg font-bold">{stats.totalQtyCarton.toLocaleString()}</p>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-1.5 sm:p-2 text-center">
                <p className="text-orange-600 text-[10px] sm:text-xs font-medium truncate">Expiring</p>
                <p className="text-orange-900 text-sm sm:text-base lg:text-lg font-bold">{stats.expiringSoon}</p>
              </div>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 mb-3">
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-3">
              {/* Search */}
              <div className="col-span-2">
                <label className="block text-[10px] sm:text-xs font-semibold text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari produk, batch, lokasi..."
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>

              {/* Filter Product */}
              <div>
                <label className="block text-[10px] sm:text-xs font-semibold text-gray-700 mb-1">Produk</label>
                <select
                  value={filterProduct}
                  onChange={(e) => setFilterProduct(e.target.value)}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                >
                  <option value="all">Semua Produk</option>
                  {uniqueProducts.map(([id, name]) => (
                    <option key={id} value={id}>{name.length > 20 ? name.substring(0, 20) + '...' : name}</option>
                  ))}
                </select>
              </div>

              {/* Filter Cluster */}
              <div>
                <label className="block text-[10px] sm:text-xs font-semibold text-gray-700 mb-1">Cluster</label>
                <select
                  value={filterCluster}
                  onChange={(e) => setFilterCluster(e.target.value)}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                >
                  <option value="all">Semua</option>
                  <option value="A">Cluster A</option>
                  <option value="B">Cluster B</option>
                  <option value="C">Cluster C</option>
                  <option value="D">Cluster D</option>
                </select>
              </div>

              {/* Filter Status */}
              <div>
                <label className="block text-[10px] sm:text-xs font-semibold text-gray-700 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                >
                  <option value="all">Semua</option>
                  <option value="expired">Expired</option>
                  <option value="release">Release</option>
                  <option value="hold">Hold</option>
                  <option value="receh">Receh</option>
                  <option value="salah-cluster">Salah Cluster</option>
                </select>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-[10px] sm:text-xs font-semibold text-gray-700 mb-1">Sort By</label>
                <div className="flex gap-1">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as "expiredDate" | "inboundDate" | "productName")}
                    className="flex-1 min-w-0 px-2 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  >
                    <option value="expiredDate">Expired</option>
                    <option value="inboundDate">Inbound</option>
                    <option value="productName">Nama</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                    className="px-2 py-1.5 sm:py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 shrink-0"
                  >
                    {sortOrder === "asc" ? "↑" : "↓"}
                  </button>
                </div>
              </div>
            </div>

            {/* Result Count */}
            <div className="mt-2 text-[10px] sm:text-xs text-gray-600">
              Menampilkan <span className="font-bold text-gray-800">{startIndex + 1}-{Math.min(endIndex, filteredAndSortedData.length)}</span> dari{" "}
              <span className="font-bold text-gray-800">{filteredAndSortedData.length}</span> item
            </div>
          </div>

          {/* Stock Table */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px]">
                <thead className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                  <tr>
                    <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-bold w-8">No</th>
                    <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-bold">Produk</th>
                    <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-bold">Lokasi</th>
                    <th className="px-2 py-2 text-center text-[10px] sm:text-xs font-bold">Pallet</th>
                    <th className="px-2 py-2 text-center text-[10px] sm:text-xs font-bold">Carton</th>
                    <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-bold">Expired</th>
                    <th className="px-2 py-2 text-center text-[10px] sm:text-xs font-bold">Status</th>
                    <th className="px-2 py-2 text-center text-[10px] sm:text-xs font-bold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center">
                        <div className="text-4xl mb-2">📦</div>
                        <p className="text-gray-500 text-sm font-semibold">Tidak ada data ditemukan</p>
                      </td>
                    </tr>
                  ) : (
                    currentData.map((item, index) => (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                        <td className="px-2 py-1.5 text-[10px] sm:text-xs text-gray-600">{startIndex + index + 1}</td>
                        <td className="px-2 py-1.5">
                          <div className="font-semibold text-gray-800 text-[10px] sm:text-xs line-clamp-1">{item.productName || 'N/A'}</div>
                          <div className="text-[9px] sm:text-[10px] text-blue-600 font-mono">{item.productCode || 'N/A'}</div>
                        </td>
                        <td className="px-2 py-1.5">
                          <span className="inline-block px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] sm:text-xs font-semibold">
                            {item.cluster}-L{item.lorong}-B{item.baris}-{item.level}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-center text-[10px] sm:text-xs font-bold text-gray-800">{item.qtyPallet}</td>
                        <td className="px-2 py-1.5 text-center text-[10px] sm:text-xs font-bold text-gray-800">{item.qtyCarton}</td>
                        <td className="px-2 py-1.5">
                          <div className="text-[10px] sm:text-xs text-gray-700">{formatDate(item.expiredDate)}</div>
                          <div className="text-[9px] sm:text-[10px]">{getDaysToExpired(item.expiredDate)}</div>
                        </td>
                        <td className="px-2 py-1.5 text-center">{getStatusBadge(item.status)}</td>
                        <td className="px-2 py-1.5 text-center">
                          <button
                            onClick={() => handleViewDetail(item)}
                            className="px-2 py-1 bg-blue-600 text-white rounded text-[10px] sm:text-xs font-semibold hover:bg-blue-700 transition-colors"
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-1 p-2 sm:p-3 border-t border-gray-200">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-[10px] sm:text-xs bg-blue-500 text-white rounded font-semibold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  ←
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-2 py-1 text-[10px] sm:text-xs rounded font-semibold ${
                            currentPage === page ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className="text-gray-400 text-[10px]">...</span>;
                    }
                    return null;
                  })}
                </div>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-[10px] sm:text-xs bg-blue-500 text-white rounded font-semibold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 sm:p-5 text-white sticky top-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold">Detail Stock</h2>
                    <p className="text-xs sm:text-sm opacity-90 mt-1">
                      {selectedItem.cluster}-L{selectedItem.lorong}-B{selectedItem.baris}-{selectedItem.level}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-white/80 hover:text-white text-2xl font-light w-8 h-8 flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-4 sm:p-5 space-y-4">
                {/* Product Info */}
                <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
                  <p className="text-xs font-medium text-slate-500 mb-1">Produk</p>
                  <p className="font-bold text-slate-900 text-sm sm:text-base">{selectedItem.productName || 'N/A'}</p>
                  <p className="text-xs text-blue-600 font-mono mt-1">{selectedItem.productCode || 'N/A'}</p>
                </div>

                {/* BB Produk & Location */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
                    <p className="text-xs font-medium text-slate-500 mb-1">BB Produk</p>
                    <p className="font-semibold text-slate-900 text-xs sm:text-sm font-mono">
                      {selectedItem.bbProduk}
                    </p>
                    {selectedItem.isReceh && (
                      <p className="text-[10px] text-purple-600 mt-1">🔵 Pallet Receh (Tidak Penuh)</p>
                    )}
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
                    <p className="text-xs font-medium text-slate-500 mb-1">Lokasi</p>
                    <p className="font-semibold text-slate-900 text-sm sm:text-base">
                      {selectedItem.cluster}-L{selectedItem.lorong}-B{selectedItem.baris}-{selectedItem.level}
                    </p>
                  </div>
                </div>

                {/* Quantity Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200 text-center">
                    <p className="text-xs font-medium text-emerald-700 mb-1">Qty Pallet</p>
                    <p className="text-xl sm:text-2xl font-bold text-emerald-600">{selectedItem.qtyPallet}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 text-center">
                    <p className="text-xs font-medium text-blue-700 mb-1">Qty Carton</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-600">{selectedItem.qtyCarton}</p>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-slate-500 mb-1">Tanggal Inbound</p>
                    <p className="font-semibold text-slate-900 text-sm">{formatDate(selectedItem.inboundDate)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-slate-500 mb-1">Expired Date</p>
                    <p className="font-semibold text-slate-900 text-sm">{formatDate(selectedItem.expiredDate)}</p>
                    <div className="text-xs mt-1">{getDaysToExpired(selectedItem.expiredDate)}</div>
                  </div>
                </div>

                {/* Status */}
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-slate-500 mb-2">Status</p>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedItem.status)}
                    <span className="text-xs text-slate-600">
                      {selectedItem.status === "expired" && "⚠️ Produk sudah expired, harus segera dikeluarkan!"}
                      {selectedItem.status === "release" && "- Expired dekat, prioritas keluar (FEFO)"}
                      {selectedItem.status === "hold" && "- Expired masih jauh, belum perlu keluar"}
                      {selectedItem.status === "receh" && "- Pallet tidak penuh, ada sisa"}
                      {selectedItem.status === "salah-cluster" && "- Produk tidak sesuai cluster, perlu relokasi"}
                    </span>
                  </div>
                </div>

                {/* Product Master Info */}
                {selectedItem.productInfo && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs font-medium text-blue-700 mb-2">Info Produk Master</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div><span className="text-slate-500">Default Cluster:</span> <span className="font-semibold">{selectedItem.productInfo.defaultCluster || '-'}</span></div>
                      <div><span className="text-slate-500">Qty/Carton:</span> <span className="font-semibold">{selectedItem.productInfo.qtyPerCarton} pcs</span></div>
                      <div><span className="text-slate-500">Qty/Pallet:</span> <span className="font-semibold">{selectedItem.productInfo.qtyCartonPerPallet} carton</span></div>
                    </div>
                  </div>
                )}

                {/* Receh info - if parent_stock_id exists */}
                {selectedItem.parentStockId && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <p className="text-xs font-medium text-purple-700 mb-1">Info Receh</p>
                    <p className="text-sm text-purple-900">Pallet receh dengan parent stock ID: {selectedItem.parentStockId}</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-4 sm:px-5 pb-4 sm:pb-5">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="w-full rounded-lg bg-blue-500 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-600 transition-all shadow-lg"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}