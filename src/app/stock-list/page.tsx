"use client";

import { useState, useMemo } from "react";
import { stockListData } from "@/lib/mock/stocklistmock";

export default function StockListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCluster, setFilterCluster] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState<"expiredDate" | "inboundDate" | "productName">("expiredDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Filter & Sort Logic
  const filteredAndSortedData = useMemo(() => {
    let filtered = [...stockListData];

    // Search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.productName.toLowerCase().includes(search) ||
          item.productCode.toLowerCase().includes(search) ||
          item.batchNumber.toLowerCase().includes(search) ||
          item.lotNumber.toLowerCase().includes(search) ||
          `${item.location.cluster}-${item.location.lorong}-${item.location.baris}-${item.location.level}`
            .toLowerCase()
            .includes(search)
      );
    }

    // Filter Cluster
    if (filterCluster !== "all") {
      filtered = filtered.filter((item) => item.location.cluster === filterCluster);
    }

    // Filter Status
    if (filterStatus !== "all") {
      filtered = filtered.filter((item) => item.status === filterStatus);
    }

    // Sort
    filtered.sort((a, b) => {
      let compareValue = 0;

      if (sortBy === "expiredDate") {
        compareValue = new Date(a.expiredDate).getTime() - new Date(b.expiredDate).getTime();
      } else if (sortBy === "inboundDate") {
        compareValue = new Date(a.inboundDate).getTime() - new Date(b.inboundDate).getTime();
      } else if (sortBy === "productName") {
        compareValue = a.productName.localeCompare(b.productName);
      }

      return sortOrder === "asc" ? compareValue : -compareValue;
    });

    return filtered;
  }, [searchTerm, filterCluster, filterStatus, sortBy, sortOrder]);

  // Statistics
  const stats = useMemo(() => {
    const totalItems = stockListData.length;
    const totalAvailable = stockListData.filter((item) => item.status === "available").length;
    const totalReserved = stockListData.filter((item) => item.status === "reserved").length;
    const totalQuarantine = stockListData.filter((item) => item.status === "quarantine").length;

    const totalQtyCarton = stockListData.reduce((sum, item) => sum + item.qtyCarton, 0);
    const totalQtyPcs = stockListData.reduce((sum, item) => sum + item.qtyPcs, 0);

    // Expired soon (< 180 days)
    const now = new Date();
    const expiringSoon = stockListData.filter((item) => {
      const expDate = new Date(item.expiredDate);
      const diffTime = expDate.getTime() - now.getTime();
      const diffDays = diffTime / (1000 * 3600 * 24);
      return diffDays < 180 && diffDays > 0;
    }).length;

    return {
      totalItems,
      totalAvailable,
      totalReserved,
      totalQuarantine,
      totalQtyCarton,
      totalQtyPcs,
      expiringSoon,
    };
  }, []);

  // Status Badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return (
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
            Available
          </span>
        );
      case "reserved":
        return (
          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
            Reserved
          </span>
        );
      case "quarantine":
        return (
          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
            Quarantine
          </span>
        );
      default:
        return null;
    }
  };

  // Days to Expired
  const getDaysToExpired = (expiredDate: string) => {
    const now = new Date();
    const expDate = new Date(expiredDate);
    const diffTime = expDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
    
    if (diffDays < 0) {
      return <span className="text-red-600 font-bold">Expired!</span>;
    } else if (diffDays < 90) {
      return <span className="text-orange-600 font-semibold">{diffDays} days</span>;
    } else if (diffDays < 180) {
      return <span className="text-yellow-600 font-semibold">{diffDays} days</span>;
    } else {
      return <span className="text-green-600">{diffDays} days</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-800">Stock List</h1>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mt-6">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <p className="text-blue-600 text-sm font-semibold">Total Items</p>
              <p className="text-blue-900 text-2xl font-bold">{stats.totalItems}</p>
            </div>
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
              <p className="text-green-600 text-sm font-semibold">Available</p>
              <p className="text-green-900 text-2xl font-bold">{stats.totalAvailable}</p>
            </div>
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
              <p className="text-yellow-600 text-sm font-semibold">Reserved</p>
              <p className="text-yellow-900 text-2xl font-bold">{stats.totalReserved}</p>
            </div>
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <p className="text-red-600 text-sm font-semibold">Quarantine</p>
              <p className="text-red-900 text-2xl font-bold">{stats.totalQuarantine}</p>
            </div>
            <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
              <p className="text-purple-600 text-sm font-semibold">Total Carton</p>
              <p className="text-purple-900 text-2xl font-bold">{stats.totalQtyCarton}</p>
            </div>
            <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4">
              <p className="text-indigo-600 text-sm font-semibold">Total Pcs</p>
              <p className="text-indigo-900 text-2xl font-bold">{stats.totalQtyPcs.toLocaleString()}</p>
            </div>
            <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
              <p className="text-orange-600 text-sm font-semibold">Expiring Soon</p>
              <p className="text-orange-900 text-2xl font-bold">{stats.expiringSoon}</p>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari produk, batch, lokasi..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Filter Cluster */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Cluster
              </label>
              <select
                value={filterCluster}
                onChange={(e) => setFilterCluster(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
              >
                <option value="all">All Clusters</option>
                <option value="A">Cluster A</option>
                <option value="B">Cluster B</option>
                <option value="C">Cluster C</option>
                <option value="D">Cluster D</option>
              </select>
            </div>

            {/* Filter Status */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
              >
                <option value="all">All Status</option>
                <option value="available">Available</option>
                <option value="reserved">Reserved</option>
                <option value="quarantine">Quarantine</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Sort By
              </label>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                >
                  <option value="expiredDate">Expired Date</option>
                  <option value="inboundDate">Inbound Date</option>
                  <option value="productName">Product Name</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                >
                  {sortOrder === "asc" ? "↑" : "↓"}
                </button>
              </div>
            </div>
          </div>

          {/* Result Count */}
          <div className="mt-4 text-gray-600">
            Showing <span className="font-bold text-gray-800">{filteredAndSortedData.length}</span> of{" "}
            <span className="font-bold text-gray-800">{stats.totalItems}</span> items
          </div>
        </div>

        {/* Stock Table */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold">No</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">Product</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">Batch / Lot</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">Location</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">Quantity</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">Expired Date</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">Inbound Date</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedData.map((item, index) => (
                  <tr
                    key={item.id}
                    className="border-b border-gray-100 hover:bg-blue-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-600">{index + 1}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-800">{item.productName}</div>
                      <div className="text-xs text-gray-500">{item.productCode}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-700">{item.batchNumber}</div>
                      <div className="text-xs text-gray-500">{item.lotNumber}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-semibold">
                        {item.location.cluster}-{item.location.lorong}-{item.location.baris}-
                        {item.location.level}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-800">
                        {item.qtyPallet} pallet
                      </div>
                      <div className="text-sm text-gray-600">{item.qtyCarton} carton</div>
                      <div className="text-xs text-gray-500">{item.qtyPcs} pcs</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-700">{item.expiredDate}</div>
                      <div className="text-xs">{getDaysToExpired(item.expiredDate)}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.inboundDate}</td>
                    <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredAndSortedData.length === 0 && (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 text-gray-300 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <p className="text-gray-500 font-semibold">No items found</p>
              <p className="text-gray-400 text-sm">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
