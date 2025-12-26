// File: src/components/permutasi-form.tsx
// Permutasi - Relokasi Stock yang Salah Cluster / Di In Transit

"use client";

import { useState, useMemo, useEffect } from "react";
import { stockListData, StockItem } from "@/lib/mock/stocklistmock";
import { getProductByCode, productMasterData } from "@/lib/mock/product-master";
import {
  getClusterConfig,
  getBarisCountForLorong,
  getPalletCapacityForCell,
  validateProductLocation,
  getValidLocationsForProduct,
  isInTransitLocation,
  clusterConfigs,
} from "@/lib/mock/warehouse-config";
import { permutasiHistoryData, PermutasiHistory } from "@/lib/mock/permutasi-history";
import { CheckCircle, XCircle, ArrowRightLeft, MapPin } from "lucide-react";

interface WrongLocationStock extends StockItem {
  homeCluster: string;
  reason: "salah-cluster" | "in-transit";
}

interface RecommendedLocation {
  clusterChar: string;
  lorong: string;
  baris: string;
  level: string;
}

export function PermutasiForm() {
  const [currentWarehouseId, setCurrentWarehouseId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"salah-cluster" | "in-transit" | "history">("salah-cluster");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [itemToMove, setItemToMove] = useState<WrongLocationStock | null>(null);
  const [recommendedLocation, setRecommendedLocation] = useState<RecommendedLocation | null>(null);
  const [autoRecommend, setAutoRecommend] = useState(true);
  const [manualLocation, setManualLocation] = useState({ clusterChar: "", lorong: "", baris: "", pallet: "" });
  const [moveReason, setMoveReason] = useState("");

  // Modal states
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState<"success" | "error" | "warning">("success");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showBatchConfirmModal, setShowBatchConfirmModal] = useState(false);

  const showNotification = (title: string, message: string, type: "success" | "error" | "warning") => {
    setNotificationTitle(title);
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotificationModal(true);
  };

  const success = (message: string) => showNotification("✅ Berhasil", message, "success");
  const error = (message: string) => showNotification("❌ Error", message, "error");

  // Load warehouse context
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentWarehouseId(user.warehouseId || null);
    }
  }, []);

  // Get wrong location stocks
  const wrongLocationStocks = useMemo((): WrongLocationStock[] => {
    const result: WrongLocationStock[] = [];

    stockListData.forEach((stock) => {
      const lorongNum = stock.lorong;
      const barisNum = stock.baris;

      // Check if In Transit
      const inTransit = isInTransitLocation(stock.cluster, lorongNum);

      // Get product info
      const product = productMasterData.find(p => p.id === stock.productId);
      const productCode = product?.productCode || "UNKNOWN";
      const homeCluster = product?.defaultCluster || "?";

      if (inTransit) {
        result.push({
          ...stock,
          homeCluster,
          reason: "in-transit",
        });
      } else {
        // Check if wrong cluster
        const validation = validateProductLocation(productCode, stock.cluster, lorongNum, barisNum);
        if (!validation.isValid) {
          result.push({
            ...stock,
            homeCluster,
            reason: "salah-cluster",
          });
        }
      }
    });

    return result;
  }, []);

  // Filter by tab
  const filteredStocks = useMemo(() => {
    if (activeTab === "salah-cluster") {
      return wrongLocationStocks.filter((s) => s.reason === "salah-cluster");
    } else if (activeTab === "in-transit") {
      return wrongLocationStocks.filter((s) => s.reason === "in-transit");
    }
    return [];
  }, [wrongLocationStocks, activeTab]);

  // Cluster & Location Options
  const clusterOptions = useMemo(() => clusterConfigs.filter((c) => c.isActive).map((c) => c.clusterChar), []);

  const lorongOptions = useMemo(() => {
    if (!manualLocation.clusterChar) return [];
    const config = getClusterConfig(manualLocation.clusterChar);
    if (!config) return [];
    return Array.from({ length: config.defaultLorongCount }, (_, i) => `L${i + 1}`);
  }, [manualLocation.clusterChar]);

  const barisOptions = useMemo(() => {
    if (!manualLocation.clusterChar || !manualLocation.lorong) return [];
    const lorongNum = parseInt(manualLocation.lorong.replace("L", ""));
    const barisCount = getBarisCountForLorong(manualLocation.clusterChar, lorongNum);
    return Array.from({ length: barisCount }, (_, i) => `B${i + 1}`);
  }, [manualLocation.clusterChar, manualLocation.lorong]);

  const palletOptions = useMemo(() => {
    if (!manualLocation.clusterChar || !manualLocation.lorong || !manualLocation.baris) return [];
    const lorongNum = parseInt(manualLocation.lorong.replace("L", ""));
    const barisNum = parseInt(manualLocation.baris.replace("B", ""));
    const palletCapacity = getPalletCapacityForCell(manualLocation.clusterChar, lorongNum, barisNum);
    return Array.from({ length: palletCapacity }, (_, i) => `P${i + 1}`);
  }, [manualLocation.clusterChar, manualLocation.lorong, manualLocation.baris]);

  // Find recommended location for a product
  const findRecommendedLocation = (productCode: string): RecommendedLocation | null => {
    const productHome = getValidLocationsForProduct(productCode);
    const product = getProductByCode(productCode);
    const cluster = productHome?.clusterChar || product?.defaultCluster || "";

    if (!cluster) return null;

    const clusterConfig = getClusterConfig(cluster);
    if (!clusterConfig) return null;

    const lorongStart = productHome ? productHome.lorongRange[0] : 1;
    const lorongEnd = productHome ? productHome.lorongRange[1] : clusterConfig.defaultLorongCount;

    for (let lorongNum = lorongStart; lorongNum <= lorongEnd; lorongNum++) {
      if (isInTransitLocation(cluster, lorongNum)) continue;

      const maxBaris = getBarisCountForLorong(cluster, lorongNum);
      const barisStart = productHome ? productHome.barisRange[0] : 1;
      const barisEnd = productHome ? Math.min(productHome.barisRange[1], maxBaris) : maxBaris;

      for (let barisNum = barisStart; barisNum <= barisEnd; barisNum++) {
        const maxPallet = getPalletCapacityForCell(cluster, lorongNum, barisNum);
        const productMaxPallet = productHome ? productHome.maxPalletPerLocation : 999;
        const effectiveMaxPallet = Math.min(maxPallet, productMaxPallet);

        for (let palletNum = 1; palletNum <= effectiveMaxPallet; palletNum++) {
          const lorong = `L${lorongNum}`;
          const baris = `B${barisNum}`;
          const level = `P${palletNum}`;

          const locationExists = stockListData.some(
            (item) =>
              item.cluster === cluster &&
              item.lorong === parseInt(lorong.replace('L', '')) &&
              item.baris === parseInt(baris.replace('B', '')) &&
              item.level === parseInt(level.replace('P', ''))
          );

          if (!locationExists) {
            return { clusterChar: cluster, lorong, baris, level };
          }
        }
      }
    }

    return null;
  };

  // Handle select item
  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedItems.size === filteredStocks.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredStocks.map((s) => s.id)));
    }
  };

  // Open move modal for single item
  const openMoveModal = (stock: WrongLocationStock) => {
    setItemToMove(stock);
    setAutoRecommend(true);
    setManualLocation({ clusterChar: stock.homeCluster, lorong: "", baris: "", pallet: "" });
    setMoveReason(stock.reason === "in-transit" ? "Relokasi dari In Transit" : "Koreksi cluster");
    setRecommendedLocation(null);
    setShowMoveModal(true);
  };

  // Handle recommend button
  const handleRecommend = () => {
    if (!itemToMove) return;
    const product = productMasterData.find(p => p.id === itemToMove.productId);
    const productCode = product?.productCode || "UNKNOWN";
    const recommended = findRecommendedLocation(productCode);
    if (recommended) {
      // Verify it's not occupied
      const isOccupied = stockListData.some(
        (s) =>
          s.cluster === recommended.clusterChar &&
          s.lorong === parseInt(recommended.lorong.replace('L', '')) &&
          s.baris === parseInt(recommended.baris.replace('B', '')) &&
          s.level === parseInt(recommended.level.replace('P', ''))
      );
      if (isOccupied) {
        error("Lokasi yang ditemukan sudah terisi. Coba lagi.");
        setRecommendedLocation(null);
      } else {
        setRecommendedLocation(recommended);
        success(`Lokasi ditemukan: ${recommended.clusterChar}-${recommended.lorong}-${recommended.baris}-${recommended.level}`);
      }
    } else {
      error("Tidak ada lokasi kosong yang sesuai dengan product home.");
      setRecommendedLocation(null);
    }
  };

  // Open confirm modal before move
  const handleMoveClick = () => {
    if (!itemToMove) return;

    if (!moveReason.trim()) {
      error("Alasan pemindahan wajib diisi.");
      return;
    }

    if (autoRecommend) {
      if (!recommendedLocation) {
        error("Mohon cari rekomendasi lokasi terlebih dahulu.");
        return;
      }
    } else {
      if (!manualLocation.clusterChar || !manualLocation.lorong || !manualLocation.baris || !manualLocation.pallet) {
        error("Mohon lengkapi lokasi tujuan.");
        return;
      }
      // Check if manual location is occupied
      const isOccupied = stockListData.some(
        (s) =>
          s.cluster === manualLocation.clusterChar &&
          s.lorong === parseInt(manualLocation.lorong.replace('L', '')) &&
          s.baris === parseInt(manualLocation.baris.replace('B', '')) &&
          s.level === parseInt(manualLocation.pallet.replace('P', ''))
      );
      if (isOccupied) {
        error("Lokasi tujuan sudah terisi!");
        return;
      }
    }

    setShowConfirmModal(true);
  };

  // Confirm move
  const confirmMove = () => {
    if (!itemToMove) return;

    let targetLocation: { clusterChar: string; lorong: string; baris: string; level: string };

    if (autoRecommend) {
      targetLocation = recommendedLocation!;
    } else {
      targetLocation = {
        clusterChar: manualLocation.clusterChar,
        lorong: manualLocation.lorong,
        baris: manualLocation.baris,
        level: manualLocation.pallet,
      };
    }

    // Find and update stock
    const stockIndex = stockListData.findIndex((s) => s.id === itemToMove.id);
    if (stockIndex !== -1) {
      const stock = stockListData[stockIndex];
      const oldLocation = `${stock.cluster}-L${stock.lorong}-B${stock.baris}-P${stock.level}`;
      const newLocation = `${targetLocation.clusterChar}-${targetLocation.lorong}-${targetLocation.baris}-${targetLocation.level}`;

      // Update stock location
      stockListData[stockIndex].cluster = targetLocation.clusterChar;
      stockListData[stockIndex].lorong = parseInt(targetLocation.lorong.replace('L', ''));
      stockListData[stockIndex].baris = parseInt(targetLocation.baris.replace('B', ''));
      stockListData[stockIndex].level = parseInt(targetLocation.level.replace('P', ''));

      // Add to permutasi history
      const newPermutasi: PermutasiHistory = {
        id: `pmt-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(permutasiHistoryData.length + 1).padStart(3, "0")}`,
        warehouse_id: "wh-001-cikarang",
        transaction_code: `PMT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(permutasiHistoryData.length + 1).padStart(4, "0")}`,
        stock_id: `stk-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`,
        product_id: itemToMove.productId,
        qty_carton: itemToMove.qtyCarton,
        from_cluster: itemToMove.cluster,
        from_lorong: itemToMove.lorong,
        from_baris: itemToMove.baris,
        from_level: itemToMove.level,
        to_cluster: targetLocation.clusterChar,
        to_lorong: parseInt(targetLocation.lorong.replace('L', '')),
        to_baris: parseInt(targetLocation.baris.replace('B', '')),
        to_level: parseInt(targetLocation.level.replace('P', '')),
        reason: moveReason,
        moved_by: "usr-003", // Dewi Lestari (admin_warehouse)
        moved_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      permutasiHistoryData.unshift(newPermutasi);

      success(`Stock berhasil dipindahkan dari ${oldLocation} ke ${newLocation}`);
    }

    setShowConfirmModal(false);
    setShowMoveModal(false);
    setItemToMove(null);
    setRecommendedLocation(null);
    setMoveReason("");
    setSelectedItems(new Set());
  };

  // Open batch confirm modal
  const handleBatchMoveClick = () => {
    if (selectedItems.size === 0) {
      error("Pilih minimal 1 item untuk dipindahkan.");
      return;
    }
    setShowBatchConfirmModal(true);
  };

  // Move selected items (batch)
  const confirmBatchMove = () => {
    let movedCount = 0;
    let failedCount = 0;

    selectedItems.forEach((id) => {
      const stock = filteredStocks.find((s) => s.id === id);
      if (!stock) return;

      const product = productMasterData.find(p => p.id === stock.productId);
      const productCode = product?.productCode || "UNKNOWN";
      const recommended = findRecommendedLocation(productCode);
      if (recommended) {
        // Verify not occupied
        const isOccupied = stockListData.some(
          (s) =>
            s.cluster === recommended.clusterChar &&
            s.lorong === parseInt(recommended.lorong.replace('L', '')) &&
            s.baris === parseInt(recommended.baris.replace('B', '')) &&
            s.level === parseInt(recommended.level.replace('P', ''))
        );

        if (!isOccupied) {
          const stockIndex = stockListData.findIndex((s) => s.id === id);
          if (stockIndex !== -1) {
            stockListData[stockIndex].cluster = recommended.clusterChar;
            stockListData[stockIndex].lorong = parseInt(recommended.lorong.replace('L', ''));
            stockListData[stockIndex].baris = parseInt(recommended.baris.replace('B', ''));
            stockListData[stockIndex].level = parseInt(recommended.level.replace('P', ''));

            const newPermutasi: PermutasiHistory = {
              id: `pmt-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(permutasiHistoryData.length + movedCount + 1).padStart(3, "0")}`,
              warehouse_id: "wh-001-cikarang",
              transaction_code: `PMT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(permutasiHistoryData.length + movedCount + 1).padStart(4, "0")}`,
              stock_id: `stk-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`,
              product_id: stock.productId,
              qty_carton: stock.qtyCarton,
              from_cluster: stock.cluster,
              from_lorong: stock.lorong,
              from_baris: stock.baris,
              from_level: stock.level,
              to_cluster: recommended.clusterChar,
              to_lorong: parseInt(recommended.lorong.replace('L', '')),
              to_baris: parseInt(recommended.baris.replace('B', '')),
              to_level: parseInt(recommended.level.replace('P', '')),
              reason: stock.reason === "in-transit" ? "Relokasi dari In Transit (batch)" : "Koreksi cluster (batch)",
              moved_by: "usr-003",
              moved_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            };
            permutasiHistoryData.unshift(newPermutasi);

            movedCount++;
          }
        } else {
          failedCount++;
        }
      } else {
        failedCount++;
      }
    });

    setShowBatchConfirmModal(false);

    if (movedCount > 0) {
      success(`${movedCount} item berhasil dipindahkan.${failedCount > 0 ? ` ${failedCount} item gagal (lokasi tidak tersedia).` : ""}`);
    } else {
      error("Tidak ada item yang berhasil dipindahkan. Tidak ada lokasi kosong yang sesuai.");
    }

    setSelectedItems(new Set());
  };

  // Today's history
  const todayHistory = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return permutasiHistoryData.filter((h) => h.moved_at.startsWith(todayStr));
  }, []);

  // Modal backdrop click handler
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>, closeModal: () => void) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-violet-500 rounded-xl flex items-center justify-center">
                <ArrowRightLeft className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Permutasi Stock</h1>
                <p className="text-sm text-gray-600">Relokasi produk yang salah cluster atau berada di In Transit</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
            <button
              onClick={() => setActiveTab("salah-cluster")}
              className={`px-4 md:px-6 py-2 md:py-3 rounded-xl font-semibold transition-all text-sm md:text-base ${
                activeTab === "salah-cluster"
                  ? "bg-red-500 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              🔴 Salah Cluster
              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {wrongLocationStocks.filter((s) => s.reason === "salah-cluster").length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("in-transit")}
              className={`px-4 md:px-6 py-2 md:py-3 rounded-xl font-semibold transition-all text-sm md:text-base ${
                activeTab === "in-transit"
                  ? "bg-amber-500 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              🟡 Di In Transit
              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {wrongLocationStocks.filter((s) => s.reason === "in-transit").length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 md:px-6 py-2 md:py-3 rounded-xl font-semibold transition-all text-sm md:text-base ${
                activeTab === "history"
                  ? "bg-violet-500 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              📋 Riwayat Hari Ini
              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">{todayHistory.length}</span>
            </button>
          </div>

          {/* Content */}
          {activeTab !== "history" ? (
            <>
              {/* Action Bar */}
              {filteredStocks.length > 0 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedItems.size === filteredStocks.length && filteredStocks.length > 0}
                        onChange={handleSelectAll}
                        className="w-5 h-5 text-violet-600 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Pilih Semua ({selectedItems.size}/{filteredStocks.length})
                      </span>
                    </label>
                  </div>
                  {selectedItems.size > 0 && (
                    <button
                      onClick={handleBatchMoveClick}
                      className="w-full sm:w-auto px-6 py-2 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors shadow-lg"
                    >
                      🚚 Pindahkan {selectedItems.size} Item (Auto)
                    </button>
                  )}
                </div>
              )}

              {/* Table */}
              {filteredStocks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">{activeTab === "salah-cluster" ? "✅" : "📭"}</div>
                  <p className="text-gray-500 font-medium">
                    {activeTab === "salah-cluster" ? "Tidak ada produk yang salah cluster" : "Tidak ada produk di In Transit"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className={`text-white ${activeTab === "salah-cluster" ? "bg-red-500" : "bg-amber-500"}`}>
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-bold">
                          <input
                            type="checkbox"
                            checked={selectedItems.size === filteredStocks.length && filteredStocks.length > 0}
                            onChange={handleSelectAll}
                            className="w-4 h-4"
                          />
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-bold uppercase">Produk</th>
                        <th className="px-3 py-3 text-left text-xs font-bold uppercase hidden md:table-cell">BB Pallet</th>
                        <th className="px-3 py-3 text-center text-xs font-bold uppercase">Qty</th>
                        <th className="px-3 py-3 text-center text-xs font-bold uppercase">Lokasi</th>
                        <th className="px-3 py-3 text-center text-xs font-bold uppercase hidden sm:table-cell">Seharusnya</th>
                        <th className="px-3 py-3 text-center text-xs font-bold uppercase">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredStocks.map((stock) => (
                        <tr
                          key={stock.id}
                          className={`hover:bg-gray-50 transition-colors ${selectedItems.has(stock.id) ? "bg-violet-50" : ""}`}
                        >
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={selectedItems.has(stock.id)}
                              onChange={() => handleSelectItem(stock.id)}
                              className="w-4 h-4 text-violet-600 rounded"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <div className="font-medium text-gray-900 text-sm">{productMasterData.find(p => p.id === stock.productId)?.productCode || 'UNKNOWN'}</div>
                            <div className="text-gray-500 text-xs truncate max-w-[150px] md:max-w-[200px]">{productMasterData.find(p => p.id === stock.productId)?.productName || 'Unknown Product'}</div>
                          </td>
                          <td className="px-3 py-3 text-xs font-mono text-gray-600 hidden md:table-cell">
                            {stock.bbProduk}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="font-bold text-gray-900">{stock.qtyCarton}</span>
                            <span className="text-gray-500 text-xs ml-1">ctn</span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span
                              className={`inline-block px-2 py-1 rounded-lg text-xs font-bold ${
                                stock.reason === "in-transit" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
                              }`}
                            >
                              {stock.cluster}-L{stock.lorong}-B{stock.baris}-P{stock.level}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center hidden sm:table-cell">
                            <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-lg text-xs font-bold">
                              Cluster {stock.homeCluster}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <button
                              onClick={() => openMoveModal(stock)}
                              className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-semibold hover:bg-violet-700 transition-colors"
                            >
                              <MapPin className="w-3 h-3 inline mr-1" />
                              Pindah
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            // History Tab
            <>
              {todayHistory.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-gray-500 font-medium">Belum ada permutasi hari ini</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-violet-500 text-white">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-bold uppercase">Waktu</th>
                        <th className="px-3 py-3 text-left text-xs font-bold uppercase">Produk</th>
                        <th className="px-3 py-3 text-center text-xs font-bold uppercase">Qty</th>
                        <th className="px-3 py-3 text-center text-xs font-bold uppercase">Dari</th>
                        <th className="px-3 py-3 text-center text-xs font-bold uppercase">Ke</th>
                        <th className="px-3 py-3 text-left text-xs font-bold uppercase">Alasan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {todayHistory.map((h) => {
                        const product = productMasterData.find(p => p.id === h.product_id);
                        const fromLocation = `${h.from_cluster}-L${h.from_lorong}-B${h.from_baris}-P${h.from_level}`;
                        const toLocation = `${h.to_cluster}-L${h.to_lorong}-B${h.to_baris}-P${h.to_level}`;
                        return (
                        <tr key={h.id} className="hover:bg-violet-50 transition-colors">
                          <td className="px-3 py-3 text-sm text-gray-900">
                            {new Date(h.moved_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="px-3 py-3">
                            <div className="font-medium text-gray-900 text-sm">{product?.productCode || "UNKNOWN"}</div>
                            <div className="text-gray-500 text-xs truncate max-w-[150px]">{product?.productName || "Unknown Product"}</div>
                          </td>
                          <td className="px-3 py-3 text-center font-bold text-gray-900">{h.qty_carton} ctn</td>
                          <td className="px-3 py-3 text-center">
                            <span className="inline-block px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-mono">
                              {fromLocation}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-mono">
                              {toLocation}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600">{h.reason}</td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Summary Cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🔴</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Salah Cluster</p>
                <p className="text-2xl font-bold text-red-600">
                  {wrongLocationStocks.filter((s) => s.reason === "salah-cluster").length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🟡</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Di In Transit</p>
                <p className="text-2xl font-bold text-amber-600">
                  {wrongLocationStocks.filter((s) => s.reason === "in-transit").length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📋</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Permutasi Hari Ini</p>
                <p className="text-2xl font-bold text-violet-600">{todayHistory.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Move Modal */}
      {showMoveModal && itemToMove && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => handleBackdropClick(e, () => setShowMoveModal(false))}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-4 rounded-t-2xl">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Pindahkan Stock
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Stock Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 mb-3">📦 Informasi Stock:</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Produk:</span>
                    <span className="font-semibold text-gray-900">{productMasterData.find(p => p.id === itemToMove.productId)?.productCode || 'UNKNOWN'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nama:</span>
                    <span className="font-semibold text-gray-900 text-right max-w-[200px] truncate">{productMasterData.find(p => p.id === itemToMove.productId)?.productName || 'Unknown Product'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Qty:</span>
                    <span className="font-semibold text-gray-900">{itemToMove.qtyCarton} karton</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Lokasi Saat Ini:</span>
                    <span className="font-semibold text-red-600">
                      {itemToMove.cluster}-L{itemToMove.lorong}-B{itemToMove.baris}-P{itemToMove.level}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Home Cluster:</span>
                    <span className="font-semibold text-green-600">Cluster {itemToMove.homeCluster}</span>
                  </div>
                </div>
              </div>

              {/* Reason Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Alasan Pemindahan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={moveReason}
                  onChange={(e) => setMoveReason(e.target.value)}
                  placeholder="Masukkan alasan pemindahan..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                />
              </div>

              {/* Location Mode */}
              <div className="bg-violet-50 border-2 border-violet-200 rounded-xl p-4">
                <h3 className="font-semibold text-violet-900 mb-3">📍 Lokasi Tujuan</h3>
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={autoRecommend}
                      onChange={() => setAutoRecommend(true)}
                      className="w-4 h-4 text-violet-600"
                    />
                    <span className="text-sm font-medium text-violet-800">Auto Recommend</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!autoRecommend}
                      onChange={() => setAutoRecommend(false)}
                      className="w-4 h-4 text-violet-600"
                    />
                    <span className="text-sm font-medium text-violet-800">Manual</span>
                  </label>
                </div>

                {autoRecommend ? (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleRecommend}
                      className="w-full px-4 py-2 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors"
                    >
                      🔍 Cari Rekomendasi
                    </button>

                    {recommendedLocation && (
                      <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                        <p className="text-sm text-green-800">
                          <strong>Lokasi Tersedia:</strong>{" "}
                          <span className="font-mono">
                            {recommendedLocation.clusterChar}-{recommendedLocation.lorong}-{recommendedLocation.baris}-{recommendedLocation.level}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Cluster</label>
                      <select
                        value={manualLocation.clusterChar}
                        onChange={(e) => setManualLocation({ ...manualLocation, clusterChar: e.target.value, lorong: "", baris: "", pallet: "" })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                      >
                        <option value="">Pilih</option>
                        {clusterOptions.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Lorong</label>
                      <select
                        value={manualLocation.lorong}
                        onChange={(e) => setManualLocation({ ...manualLocation, lorong: e.target.value, baris: "", pallet: "" })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                      >
                        <option value="">Pilih</option>
                        {lorongOptions.map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Baris</label>
                      <select
                        value={manualLocation.baris}
                        onChange={(e) => setManualLocation({ ...manualLocation, baris: e.target.value, pallet: "" })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                      >
                        <option value="">Pilih</option>
                        {barisOptions.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Pallet</label>
                      <select
                        value={manualLocation.pallet}
                        onChange={(e) => setManualLocation({ ...manualLocation, pallet: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                      >
                        <option value="">Pilih</option>
                        {palletOptions.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowMoveModal(false);
                    setItemToMove(null);
                    setRecommendedLocation(null);
                    setMoveReason("");
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300"
                >
                  Batal
                </button>
                <button onClick={handleMoveClick} className="flex-1 bg-violet-600 text-white py-3 rounded-xl font-semibold hover:bg-violet-700">
                  Pindahkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Move Modal */}
      {showConfirmModal && itemToMove && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => handleBackdropClick(e, () => setShowConfirmModal(false))}
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-6">
              <h3 className="text-xl font-bold text-white text-center">Konfirmasi Pemindahan</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700 text-center mb-4">Yakin ingin memindahkan stock ini?</p>
              <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm space-y-1">
                <p>
                  <strong>Produk:</strong> {productMasterData.find(p => p.id === itemToMove.productId)?.productCode || 'UNKNOWN'}
                </p>
                <p>
                  <strong>Dari:</strong>{" "}
                  <span className="text-red-600">
                    {itemToMove.cluster}-L{itemToMove.lorong}-B{itemToMove.baris}-P{itemToMove.level}
                  </span>
                </p>
                <p>
                  <strong>Ke:</strong>{" "}
                  <span className="text-green-600">
                    {autoRecommend
                      ? `${recommendedLocation?.clusterChar}-${recommendedLocation?.lorong}-${recommendedLocation?.baris}-${recommendedLocation?.level}`
                      : `${manualLocation.clusterChar}-${manualLocation.lorong}-${manualLocation.baris}-${manualLocation.pallet}`}
                  </span>
                </p>
                <p>
                  <strong>Alasan:</strong> {moveReason}
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirmModal(false)} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300">
                  Batal
                </button>
                <button onClick={confirmMove} className="flex-1 bg-violet-600 text-white py-3 rounded-xl font-semibold hover:bg-violet-700">
                  Ya, Pindahkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Confirm Modal */}
      {showBatchConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => handleBackdropClick(e, () => setShowBatchConfirmModal(false))}
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-6">
              <h3 className="text-xl font-bold text-white text-center">Konfirmasi Batch Move</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700 text-center mb-4">
                Yakin ingin memindahkan <strong>{selectedItems.size} item</strong> secara otomatis ke lokasi yang sesuai?
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800">
                <p>⚠️ Item yang tidak memiliki lokasi kosong di home cluster tidak akan dipindahkan.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowBatchConfirmModal(false)} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300">
                  Batal
                </button>
                <button onClick={confirmBatchMove} className="flex-1 bg-violet-600 text-white py-3 rounded-xl font-semibold hover:bg-violet-700">
                  Ya, Pindahkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      {showNotificationModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => handleBackdropClick(e, () => setShowNotificationModal(false))}
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div
              className={`p-6 ${
                notificationType === "success"
                  ? "bg-gradient-to-r from-violet-500 to-purple-600"
                  : notificationType === "error"
                  ? "bg-gradient-to-r from-red-500 to-pink-600"
                  : "bg-gradient-to-r from-amber-500 to-orange-600"
              }`}
            >
              <div className="flex flex-col items-center text-center">
                {notificationType === "success" ? (
                  <CheckCircle className="h-16 w-16 text-white mb-3" />
                ) : (
                  <XCircle className="h-16 w-16 text-white mb-3" />
                )}
                <h3 className="text-xl font-bold text-white">{notificationTitle}</h3>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-700 text-center whitespace-pre-line">{notificationMessage}</p>
              <button
                onClick={() => setShowNotificationModal(false)}
                className="w-full mt-4 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300"
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
