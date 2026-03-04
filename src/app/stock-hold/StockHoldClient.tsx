"use client";

import { useState, useEffect, useMemo } from "react";
import { Navigation } from "@/components/navigation";
import {
  holdStockByProduct,
  holdStockByProductAndBB,
  unholdStock,
} from "./actions";
import { useToast, ToastContainer } from "@/components/toast";

interface StockItem {
  id: string;
  warehouseId: string;
  productId: string;
  productCode: string;
  productName: string;
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
  fefoStatus: string;
  isHold: boolean;
  holdReason: string | null;
  holdBy: string | null;
  holdAt: string | null;
  holdNote: string | null;
  holdByUser: {
    id: string;
    username: string;
    fullName: string;
  } | null;
}

interface StockHoldClientProps {
  userProfile: {
    username: string;
    role: string;
    full_name: string;
    warehouse_id: string;
  };
  warehouseName: string;
  initialStock: StockItem[];
}

export default function StockHoldClient({
  userProfile,
  warehouseName,
  initialStock,
}: StockHoldClientProps) {
  const { toasts, showToast, removeToast } = useToast();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Held stocks state
  const [heldStocks, setHeldStocks] = useState<StockItem[]>([]);
  const [isLoadingHeld, setIsLoadingHeld] = useState(true);

  // Modal state
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdMode, setHoldMode] = useState<"product" | "bb" | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );
  const [selectedProductName, setSelectedProductName] = useState<string>("");
  const [selectedBB, setSelectedBB] = useState<string | null>(null);
  const [holdReason, setHoldReason] = useState("");
  const [holdNote, setHoldNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<"search" | "held">("search");

  // Load held stocks on mount
  useEffect(() => {
    loadHeldStocks();
  }, []);

  const loadHeldStocks = () => {
    // Filter held stocks from initialStock
    const held = initialStock.filter((stock) => stock.isHold);
    setHeldStocks(held);
    setIsLoadingHeld(false);
  };

  // Real-time filtering and grouping
  const { groupedResults, totalStocks } = useMemo(() => {
    if (!searchQuery.trim()) {
      return { groupedResults: [], totalStocks: 0 };
    }

    const search = searchQuery.toLowerCase();
    const filtered = initialStock.filter((item) => {
      const bbProdukString = item.bbProduk.toLowerCase();
      const productCodeString = item.productCode.toLowerCase();
      const productNameString = item.productName.toLowerCase();
      const locationString =
        `${item.cluster}-${item.lorong}-${item.baris}-${item.level}`.toLowerCase();

      return (
        bbProdukString.includes(search) ||
        productCodeString.includes(search) ||
        productNameString.includes(search) ||
        locationString.includes(search)
      );
    });

    // Group by product
    const productMap = new Map<
      string,
      {
        productId: string;
        productCode: string;
        productName: string;
        totalQtyCarton: number;
        totalStocks: number;
        notHeldStocks: number;
        totalStocksInWarehouse: number; // Total stock produk di warehouse (not filtered)
        isPartialResult: boolean; // Apakah hasil search hanya menampilkan sebagian stock
        bbGroups: Map<
          string,
          {
            bbProduk: string;
            totalQtyCarton: number;
            stocks: StockItem[];
            notHeldCount: number;
          }
        >;
      }
    >();

    filtered.forEach((stock) => {
      if (!productMap.has(stock.productId)) {
        // Hitung total stock dari produk ini di warehouse (tidak di-filter search)
        const totalStocksInWarehouse = initialStock.filter(
          (s) => s.productId === stock.productId
        ).length;

        productMap.set(stock.productId, {
          productId: stock.productId,
          productCode: stock.productCode,
          productName: stock.productName,
          totalQtyCarton: 0,
          totalStocks: 0,
          notHeldStocks: 0,
          totalStocksInWarehouse,
          isPartialResult: false, // Will be set after counting
          bbGroups: new Map(),
        });
      }

      const product = productMap.get(stock.productId)!;
      product.totalQtyCarton += stock.qtyCarton;
      product.totalStocks += 1;
      if (!stock.isHold) product.notHeldStocks += 1;

      if (!product.bbGroups.has(stock.bbProduk)) {
        product.bbGroups.set(stock.bbProduk, {
          bbProduk: stock.bbProduk,
          totalQtyCarton: 0,
          stocks: [],
          notHeldCount: 0,
        });
      }

      const bbGroup = product.bbGroups.get(stock.bbProduk)!;
      bbGroup.totalQtyCarton += stock.qtyCarton;
      bbGroup.stocks.push(stock);
      if (!stock.isHold) bbGroup.notHeldCount += 1;
    });

    // Mark products as partial if search filtered out some stocks
    productMap.forEach((product) => {
      product.isPartialResult = product.totalStocks < product.totalStocksInWarehouse;
    });

    const grouped = Array.from(productMap.values()).map((product) => ({
      ...product,
      bbGroups: Array.from(product.bbGroups.values()),
    }));

    return { groupedResults: grouped, totalStocks: filtered.length };
  }, [searchQuery, initialStock]);

  const openHoldModalForProduct = (
    productId: string,
    productName: string
  ) => {
    setHoldMode("product");
    setSelectedProductId(productId);
    setSelectedProductName(productName);
    setSelectedBB(null);
    setHoldReason("");
    setHoldNote("");
    setShowHoldModal(true);
  };

  const openHoldModalForBB = (
    productId: string,
    productName: string,
    bbProduk: string
  ) => {
    setHoldMode("bb");
    setSelectedProductId(productId);
    setSelectedProductName(productName);
    setSelectedBB(bbProduk);
    setHoldReason("");
    setHoldNote("");
    setShowHoldModal(true);
  };

  const closeHoldModal = () => {
    setShowHoldModal(false);
    setHoldMode(null);
    setSelectedProductId(null);
    setSelectedProductName("");
    setSelectedBB(null);
    setHoldReason("");
    setHoldNote("");
  };

  const handleHoldStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !holdReason.trim()) {
      showToast("Alasan hold harus diisi", "error");
      return;
    }

    setIsSubmitting(true);
    let result;

    if (holdMode === "product") {
      result = await holdStockByProduct(
        selectedProductId,
        holdReason.trim(),
        holdNote.trim() || undefined
      );
    } else if (holdMode === "bb" && selectedBB) {
      result = await holdStockByProductAndBB(
        selectedProductId,
        selectedBB,
        holdReason.trim(),
        holdNote.trim() || undefined
      );
    } else {
      showToast("Mode hold tidak valid", "error");
      setIsSubmitting(false);
      return;
    }

    if (result.success) {
      showToast(result.message || "Stock berhasil di-hold", "success");
      closeHoldModal();

      // Reload page untuk refresh data dari server
      window.location.reload();
    } else {
      showToast(result.error || "Gagal hold stock", "error");
    }
    setIsSubmitting(false);
  };

  const handleUnholdStock = async (stockId: string) => {
    if (!confirm("Apakah Anda yakin ingin unhold stock ini?")) {
      return;
    }

    const result = await unholdStock(stockId);
    if (result.success) {
      showToast(result.message || "Stock berhasil di-unhold", "success");

      // Reload page untuk refresh data dari server
      window.location.reload();
    } else {
      showToast(result.error || "Gagal unhold stock", "error");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userProfile={userProfile} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Stock Hold Management
          </h1>
          <p className="text-gray-600 mt-1">
            Warehouse: <span className="font-semibold">{warehouseName}</span>
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("search")}
                className={`${
                  activeTab === "search"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Search Stock
              </button>
              <button
                onClick={() => setActiveTab("held")}
                className={`${
                  activeTab === "held"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm relative`}
              >
                Held Stocks
                {heldStocks.length > 0 && (
                  <span className="ml-2 bg-red-100 text-red-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {heldStocks.length}
                  </span>
                )}
              </button>
            </nav>
          </div>
        </div>

        {/* Search Tab */}
        {activeTab === "search" && (
          <div>
            {/* Search Input - Real-time */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari berdasarkan BB Produk, Product Code, atau Product Name..."
                  className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              {searchQuery.trim() && (
                <p className="text-sm text-gray-500 mt-2">
                  Ditemukan {totalStocks} stock dari {groupedResults.length}{" "}
                  produk
                </p>
              )}
            </div>

            {/* Grouped Search Results */}
            {groupedResults.length > 0 && (
              <div className="space-y-6">
                {groupedResults.map((product) => (
                  <div
                    key={product.productId}
                    className="bg-white rounded-lg shadow overflow-hidden"
                  >
                    {/* Product Header */}
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900">
                            {product.productName}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Kode: {product.productCode} | Total Qty:{" "}
                            {product.totalQtyCarton} carton | Total Lokasi:{" "}
                            {product.totalStocks}
                            {product.isPartialResult && (
                              <span className="text-orange-600 font-semibold">
                                {" "}
                                (dari total {product.totalStocksInWarehouse}{" "}
                                stock di warehouse)
                              </span>
                            )}
                          </p>
                        </div>
                        {!product.isPartialResult && (
                          <button
                            onClick={() =>
                              openHoldModalForProduct(
                                product.productId,
                                product.productName
                              )
                            }
                            disabled={product.notHeldStocks === 0}
                            className={`px-4 py-2 rounded-lg font-medium text-white transition-colors ${
                              product.notHeldStocks === 0
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-red-600 hover:bg-red-700"
                            }`}
                            title={
                              product.notHeldStocks === 0
                                ? "Semua stock sudah di-hold"
                                : `Hold semua ${product.notHeldStocks} stock dari produk ini (SEMUA BB dan lokasi)`
                            }
                          >
                            <div className="flex items-center gap-2">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                              </svg>
                              <span>Hold Semua Produk</span>
                              {product.notHeldStocks > 0 && (
                                <span className="bg-white text-red-600 px-2 py-0.5 rounded text-xs font-bold">
                                  {product.totalStocksInWarehouse}
                                </span>
                              )}
                            </div>
                          </button>
                        )}
                        {product.isPartialResult && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2">
                            <p className="text-xs text-yellow-800 font-medium">
                              ⚠️ Hasil pencarian tidak lengkap
                            </p>
                            <p className="text-xs text-yellow-700 mt-1">
                              Gunakan "Hold BB Ini" untuk hold BB spesifik,
                              <br />
                              atau search "{product.productCode}" untuk hold
                              semua produk
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* BB Groups */}
                    <div className="divide-y divide-gray-200">
                      {product.bbGroups.map((bbGroup) => (
                        <div key={bbGroup.bbProduk} className="p-4">
                          {/* BB Header */}
                          <div className="flex items-center justify-between mb-3 bg-gray-50 p-3 rounded-lg">
                            <div>
                              <span className="font-semibold text-gray-900">
                                BB: {bbGroup.bbProduk}
                              </span>
                              <span className="text-sm text-gray-600 ml-4">
                                {bbGroup.stocks.length} lokasi | Total:{" "}
                                {bbGroup.totalQtyCarton} carton
                              </span>
                            </div>
                            <button
                              onClick={() =>
                                openHoldModalForBB(
                                  product.productId,
                                  product.productName,
                                  bbGroup.bbProduk
                                )
                              }
                              disabled={bbGroup.notHeldCount === 0}
                              className={`px-3 py-1.5 text-sm rounded font-medium text-white transition-colors ${
                                bbGroup.notHeldCount === 0
                                  ? "bg-gray-400 cursor-not-allowed"
                                  : "bg-orange-600 hover:bg-orange-700"
                              }`}
                              title={
                                bbGroup.notHeldCount === 0
                                  ? "Semua stock BB ini sudah di-hold"
                                  : `Hold ${bbGroup.notHeldCount} stock dengan BB ini`
                              }
                            >
                              <div className="flex items-center gap-1.5">
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                  />
                                </svg>
                                <span>Hold BB Ini</span>
                                {bbGroup.notHeldCount > 0 && (
                                  <span className="bg-white text-orange-600 px-1.5 py-0.5 rounded text-xs font-bold">
                                    {bbGroup.notHeldCount}
                                  </span>
                                )}
                              </div>
                            </button>
                          </div>

                          {/* Stock Locations Table */}
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                    Lokasi
                                  </th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                    Qty
                                  </th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                    Expired
                                  </th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                    Status
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {bbGroup.stocks.map((stock) => (
                                  <tr
                                    key={stock.id}
                                    className={
                                      stock.isHold ? "bg-red-50" : "bg-white"
                                    }
                                  >
                                    <td className="px-3 py-2 text-sm font-mono">
                                      {stock.cluster}-{stock.lorong}-
                                      {stock.baris}-{stock.level}
                                    </td>
                                    <td className="px-3 py-2 text-sm">
                                      {stock.qtyPallet}p / {stock.qtyCarton}c
                                    </td>
                                    <td className="px-3 py-2 text-sm">
                                      {formatDate(stock.expiredDate)}
                                    </td>
                                    <td className="px-3 py-2 text-sm">
                                      {stock.isHold ? (
                                        <div>
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                            HOLD
                                          </span>
                                          <div className="text-xs text-gray-500 mt-1">
                                            {stock.holdReason}
                                          </div>
                                          {stock.holdNote && (
                                            <div className="text-xs text-gray-400 italic">
                                              {stock.holdNote}
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          AVAILABLE
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Held Stocks Tab */}
        {activeTab === "held" && (
          <div>
            {isLoadingHeld ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                Loading held stocks...
              </div>
            ) : heldStocks.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                Tidak ada stock yang di-hold
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          BB Produk
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Product
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Lokasi
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Hold Info
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {heldStocks.map((stock) => (
                        <tr key={stock.id} className="bg-red-50">
                          <td className="px-4 py-3 text-sm font-mono">
                            {stock.bbProduk}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="font-medium text-gray-900">
                              {stock.productCode}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {stock.productName}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm font-mono">
                            {stock.cluster}-{stock.lorong}-{stock.baris}-
                            {stock.level}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {stock.qtyPallet}p / {stock.qtyCarton}c
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="space-y-1">
                              <div className="font-medium text-red-800">
                                {stock.holdReason}
                              </div>
                              {stock.holdNote && (
                                <div className="text-xs text-gray-600">
                                  Note: {stock.holdNote}
                                </div>
                              )}
                              <div className="text-xs text-gray-500">
                                By: {stock.holdByUser?.fullName || "Unknown"}
                              </div>
                              <div className="text-xs text-gray-500">
                                At: {stock.holdAt && formatDateTime(stock.holdAt)}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <button
                              onClick={() => handleUnholdStock(stock.id)}
                              className="text-green-600 hover:text-green-900 font-medium"
                            >
                              Unhold
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hold Modal */}
      {showHoldModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {holdMode === "product"
                  ? "Hold Semua Stock Produk"
                  : "Hold Stock dengan BB Tertentu"}
              </h3>

              {/* Stock Info */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-sm">
                  <div className="font-medium text-gray-900">
                    {selectedProductName}
                  </div>
                  {holdMode === "bb" && selectedBB && (
                    <div className="text-gray-600 mt-1">BB: {selectedBB}</div>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    {holdMode === "product"
                      ? "Semua stock dari produk ini akan di-hold (semua BB dan lokasi)"
                      : `Semua stock dengan BB ${selectedBB} akan di-hold (semua lokasi)`}
                  </div>
                </div>
              </div>

              <form onSubmit={handleHoldStock}>
                {/* Hold Reason */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alasan Hold <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={holdReason}
                    onChange={(e) => setHoldReason(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Pilih alasan...</option>
                    <option value="Kontaminasi">Kontaminasi</option>
                    <option value="Quality Issue">Quality Issue</option>
                    <option value="Expired Soon">Expired Soon</option>
                    <option value="Investigation">Investigation</option>
                    <option value="Pending Approval">Pending Approval</option>
                    <option value="Damaged">Damaged</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Hold Note */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Catatan (Optional)
                  </label>
                  <textarea
                    value={holdNote}
                    onChange={(e) => setHoldNote(e.target.value)}
                    rows={3}
                    placeholder="Tambahkan catatan tambahan..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeHoldModal}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 font-medium"
                  >
                    {isSubmitting
                      ? "Menyimpan..."
                      : holdMode === "product"
                      ? "Hold Semua Produk"
                      : "Hold BB Ini"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
