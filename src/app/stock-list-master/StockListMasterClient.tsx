"use client";

import { useState, useMemo, useEffect } from "react";
import ClusterConfigEditor from "@/components/cluster-config-editor";
import ProductHomeEditor from "@/components/product-home-editor";
import { ToastContainer, useToast } from "@/components/toast";
import { NotificationModal } from "@/components/notification-modal";
import type { ClusterConfig as MockClusterConfig, ClusterCellOverride as MockClusterCellOverride, ProductHome as MockProductHome } from "@/lib/mock/warehouse-config";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  createExpedition,
  updateExpedition,
  deleteExpedition,
  createClusterConfigAction,
  updateClusterConfigAction,
  deleteClusterConfigAction,
  saveCellOverrideAction,
  deleteCellOverrideAction,
  createProductHome,
  updateProductHome,
  deleteProductHome,
} from "./actions";

// Database types (snake_case)
interface ClusterConfig {
  id: string;
  warehouse_id: string;
  cluster_char: string;
  cluster_name: string;
  default_lorong_count: number;
  default_baris_count: number;
  default_pallet_level: number;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ClusterCellOverride {
  id: string;
  cluster_config_id: string;
  lorong_start: number;
  lorong_end: number;
  baris_start: number | null;
  baris_end: number | null;
  custom_baris_count: number | null;
  custom_pallet_level: number | null;
  is_transit_area: boolean;
  is_disabled: boolean;
  note: string | null;
  created_at: string;
  updated_at: string;
}

interface ProductHome {
  id: string;
  warehouse_id: string;
  product_id: string;
  cluster_char: string;
  lorong_start: number;
  lorong_end: number;
  baris_start: number;
  baris_end: number;
  max_pallet_per_location: number;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  products?: {
    product_code: string;
    product_name: string;
  } | null;
}

// Types from database
interface Product {
  id: string;
  warehouse_id: string;
  product_code: string;
  product_name: string;
  qty_per_carton: number;
  qty_carton_per_pallet: number;
  default_cluster: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Expedition {
  id: string;
  warehouse_id: string;
  expedition_code: string;
  expedition_name: string;
  contact_person: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ClusterConfig {
  id: string;
  warehouse_id: string;
  cluster_name: string;
  default_lorong_count: number;
  default_baris_count: number;
  default_pallet_per_cell: number;
  created_at: string;
  updated_at: string;
}

interface ProductHome {
  id: string;
  warehouse_id: string;
  product_code: string;
  cluster_name: string;
  lorong: number;
  baris: number;
  max_pallet_per_location: number;
  priority: number;
  created_at: string;
  updated_at: string;
}

interface StockListMasterClientProps {
  initialProducts: Product[];
  initialExpeditions: Expedition[];
  initialClusterConfigs: ClusterConfig[];
  initialCellOverrides: ClusterCellOverride[];
  initialProductHomes: ProductHome[];
  warehouseId: string;
}

// Adapter functions to convert database types to mock types
function dbClusterToMock(db: ClusterConfig): MockClusterConfig {
  return {
    id: db.id,
    warehouseId: db.warehouse_id,
    clusterChar: db.cluster_char || db.cluster_name,
    clusterName: db.cluster_name,
    description: db.description || "",
    isActive: db.is_active,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    defaultLorongCount: db.default_lorong_count,
    defaultBarisCount: db.default_baris_count,
    defaultPalletLevel: db.default_pallet_level,
  };
}

function dbOverrideToMock(db: ClusterCellOverride): MockClusterCellOverride {
  return {
    id: db.id,
    clusterConfigId: db.cluster_config_id,
    lorongStart: db.lorong_start,
    lorongEnd: db.lorong_end,
    barisStart: db.baris_start,
    barisEnd: db.baris_end,
    customBarisCount: db.custom_baris_count,
    customPalletLevel: db.custom_pallet_level,
    isTransitArea: db.is_transit_area,
    isDisabled: db.is_disabled,
    note: db.note || "",
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function dbProductHomeToMock(db: ProductHome): MockProductHome {
  return {
    id: db.id,
    warehouseId: db.warehouse_id,
    productId: db.products?.product_code || db.product_id,
    productCode: db.products?.product_code || '',
    productName: db.products?.product_name || 'N/A',
    clusterChar: db.cluster_char,
    lorongStart: db.lorong_start,
    lorongEnd: db.lorong_end,
    barisStart: db.baris_start,
    barisEnd: db.baris_end,
    maxPalletPerLocation: db.max_pallet_per_location,
    priority: db.priority,
    isActive: db.is_active,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

// Reverse mapping functions (Mock -> DB types)
function mockClusterToDb(mock: MockClusterConfig) {
  return {
    cluster_name: mock.clusterName,
    default_lorong_count: mock.defaultLorongCount,
    default_baris_count: mock.defaultBarisCount,
    default_pallet_level: mock.defaultPalletLevel,
    description: mock.description || null,
    is_active: mock.isActive,
  };
}

function mockOverrideToDb(mock: MockClusterCellOverride, clusterConfigId: string) {
  return {
    cluster_config_id: clusterConfigId,
    lorong_start: mock.lorongStart,
    lorong_end: mock.lorongEnd,
    baris_start: mock.barisStart,
    baris_end: mock.barisEnd,
    custom_baris_count: mock.customBarisCount || null,
    custom_pallet_level: mock.customPalletLevel || null,
    is_transit_area: mock.isTransitArea,
    is_disabled: mock.isDisabled,
    note: mock.note || null,
  };
}

function mockProductHomeToDb(mock: MockProductHome, warehouseId: string) {
  return {
    warehouse_id: warehouseId,
    product_id: mock.productId,
    cluster_char: mock.clusterChar,
    lorong_start: mock.lorongStart,
    lorong_end: mock.lorongEnd,
    baris_start: mock.barisStart,
    baris_end: mock.barisEnd,
    max_pallet_per_location: mock.maxPalletPerLocation,
    priority: mock.priority,
    is_active: mock.isActive,
  };
}

export default function StockListMasterClient({
  initialProducts,
  initialExpeditions,
  initialClusterConfigs,
  initialCellOverrides,
  initialProductHomes,
  warehouseId,
}: StockListMasterClientProps) {
  const { toasts, showToast, removeToast } = useToast();

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Tab state - persist to sessionStorage to maintain tab after refresh
  const [activeTab, setActiveTab] = useState<"produk" | "ekspedisi" | "cluster" | "product-home">(() => {
    if (typeof window !== "undefined") {
      const savedTab = sessionStorage.getItem("stock-list-master-active-tab");
      if (savedTab && ["produk", "ekspedisi", "cluster", "product-home"].includes(savedTab)) {
        return savedTab as "produk" | "ekspedisi" | "cluster" | "product-home";
      }
    }
    return "produk";
  });

  // Save activeTab to sessionStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("stock-list-master-active-tab", activeTab);
    }
  }, [activeTab]);

  // Product states
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [clusterFilter, setClusterFilter] = useState<string>("ALL");
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formProduct, setFormProduct] = useState<Partial<Product>>({});

  // Expedition states
  const [expeditions, setExpeditions] = useState<Expedition[]>(initialExpeditions);
  const [showAddExpeditionModal, setShowAddExpeditionModal] = useState(false);
  const [showEditExpeditionModal, setShowEditExpeditionModal] = useState(false);
  const [selectedExpedition, setSelectedExpedition] = useState<Expedition | null>(null);
  const [formExpedition, setFormExpedition] = useState<Partial<Expedition>>({});

  // Cluster states
  const [clusterConfigs, setClusterConfigs] = useState<ClusterConfig[]>(initialClusterConfigs);
  const [cellOverrides, setCellOverrides] = useState<ClusterCellOverride[]>(initialCellOverrides);

  // Product Home states
  const [productHomes, setProductHomes] = useState<ProductHome[]>(initialProductHomes);

  // Convert to mock types for child components
  const mockClusters = useMemo(() => clusterConfigs.map(dbClusterToMock), [clusterConfigs]);
  const mockOverrides = useMemo(() => cellOverrides.map(dbOverrideToMock), [cellOverrides]);
  const mockProductHomes = useMemo(() => productHomes.map(dbProductHomeToMock), [productHomes]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.product_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.product_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCluster = clusterFilter === "ALL" || p.default_cluster === clusterFilter;
      return matchesSearch && matchesCluster;
    });
  }, [products, searchQuery, clusterFilter]);

  // Product handlers
  const handleAddProduct = () => {
    setFormProduct({
      warehouse_id: warehouseId,
      product_code: "",
      product_name: "",
      qty_per_carton: 0,
      qty_carton_per_pallet: 0,
      default_cluster: null,
      is_active: true,
    });
    setShowAddProductModal(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setFormProduct({ ...product });
    setShowEditProductModal(true);
  };

  const handleSubmitAddProduct = async () => {
    if (!formProduct.product_code || !formProduct.product_name) {
      showToast("Kode produk dan nama produk harus diisi!", "error");
      return;
    }

    try {
      const newProduct = await createProduct({
        warehouse_id: warehouseId,
        product_code: formProduct.product_code,
        product_name: formProduct.product_name,
        qty_per_carton: formProduct.qty_per_carton || 0,
        qty_carton_per_pallet: formProduct.qty_carton_per_pallet || 0,
        default_cluster: formProduct.default_cluster || null,
        is_active: formProduct.is_active ?? true,
      });

      setProducts([...products, newProduct]);
      setShowAddProductModal(false);
      showToast(`✓ Produk "${formProduct.product_name}" berhasil ditambahkan!`, "success");
    } catch (error) {
      showToast("Gagal menambahkan produk. Silakan coba lagi.", "error");
    }
  };

  const handleSubmitEditProduct = async () => {
    if (!formProduct.product_code || !formProduct.product_name || !selectedProduct) {
      showToast("Kode produk dan nama produk harus diisi!", "error");
      return;
    }

    try {
      const updatedProduct = await updateProduct(selectedProduct.id, {
        product_code: formProduct.product_code,
        product_name: formProduct.product_name,
        qty_per_carton: formProduct.qty_per_carton,
        qty_carton_per_pallet: formProduct.qty_carton_per_pallet,
        default_cluster: formProduct.default_cluster,
        is_active: formProduct.is_active,
      });

      setProducts(products.map((p) => (p.id === selectedProduct.id ? updatedProduct : p)));
      setShowEditProductModal(false);
      setSelectedProduct(null);
      showToast(`✓ Produk "${formProduct.product_name}" berhasil diperbarui!`, "success");
    } catch (error) {
      showToast("Gagal memperbarui produk. Silakan coba lagi.", "error");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;

    setConfirmModal({
      isOpen: true,
      title: "Hapus Produk",
      message: `Apakah Anda yakin ingin menghapus produk "${product.product_name}"?`,
      onConfirm: async () => {
        try {
          await deleteProduct(id);
          setProducts(products.filter((p) => p.id !== id));
          showToast(`✓ Produk "${product.product_name}" berhasil dihapus!`, "success");
        } catch (error) {
          showToast("Gagal menghapus produk. Silakan coba lagi.", "error");
        }
      },
    });
  };

  // Expedition handlers
  const handleAddExpedition = () => {
    setFormExpedition({
      warehouse_id: warehouseId,
      expedition_code: "",
      expedition_name: "",
      contact_person: "",
      phone: "",
      is_active: true,
    });
    setShowAddExpeditionModal(true);
  };

  const handleEditExpedition = (expedition: Expedition) => {
    setSelectedExpedition(expedition);
    setFormExpedition({ ...expedition });
    setShowEditExpeditionModal(true);
  };

  const handleSubmitAddExpedition = async () => {
    if (!formExpedition.expedition_code || !formExpedition.expedition_name) {
      showToast("Kode dan nama ekspedisi harus diisi!", "error");
      return;
    }

    try {
      const newExpedition = await createExpedition({
        warehouse_id: warehouseId,
        expedition_code: formExpedition.expedition_code,
        expedition_name: formExpedition.expedition_name,
        contact_person: formExpedition.contact_person || "",
        phone: formExpedition.phone || "",
        is_active: formExpedition.is_active ?? true,
      });

      setExpeditions([...expeditions, newExpedition]);
      setShowAddExpeditionModal(false);
      showToast(`✓ Ekspedisi "${formExpedition.expedition_name}" berhasil ditambahkan!`, "success");
    } catch (error) {
      showToast("Gagal menambahkan ekspedisi. Kode ekspedisi mungkin sudah digunakan.", "error");
    }
  };

  const handleSubmitEditExpedition = async () => {
    if (!formExpedition.expedition_code || !formExpedition.expedition_name || !selectedExpedition) {
      showToast("Kode dan nama ekspedisi harus diisi!", "error");
      return;
    }

    try {
      const updatedExpedition = await updateExpedition(selectedExpedition.id, {
        expedition_name: formExpedition.expedition_name,
        contact_person: formExpedition.contact_person,
        phone: formExpedition.phone,
        is_active: formExpedition.is_active,
      });

      setExpeditions(expeditions.map((e) => (e.id === selectedExpedition.id ? updatedExpedition : e)));
      setShowEditExpeditionModal(false);
      setSelectedExpedition(null);
      showToast(`✓ Ekspedisi "${formExpedition.expedition_name}" berhasil diperbarui!`, "success");
    } catch (error) {
      showToast("Gagal memperbarui ekspedisi. Silakan coba lagi.", "error");
    }
  };

  const handleDeleteExpedition = async (id: string) => {
    const expedition = expeditions.find((e) => e.id === id);
    if (!expedition) return;

    setConfirmModal({
      isOpen: true,
      title: "Hapus Ekspedisi",
      message: `Apakah Anda yakin ingin menghapus ekspedisi "${expedition.expedition_name}"?`,
      onConfirm: async () => {
        try {
          await deleteExpedition(id);
          setExpeditions(expeditions.filter((e) => e.id !== id));
          showToast(`✓ Ekspedisi "${expedition.expedition_name}" berhasil dihapus!`, "success");
        } catch (error) {
          showToast("Gagal menghapus ekspedisi. Silakan coba lagi.", "error");
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <NotificationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type="confirm"
        showCancel={true}
        confirmText="Hapus"
        cancelText="Batal"
      />
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-linear-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-2xl">⚙️</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Master Data</h1>
              <p className="text-sm text-gray-600">
                Kelola data master produk, ekspedisi, cluster, dan product home assignment
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-xl p-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              onClick={() => setActiveTab("produk")}
              className={`px-6 py-4 rounded-xl font-semibold transition-all flex flex-col items-center gap-2 ${
                activeTab === "produk"
                  ? "bg-linear-to-br from-blue-500 to-blue-600 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <span className="text-2xl">📦</span>
              <span>Produk</span>
              <span className="text-xs opacity-75">{products.length} items</span>
            </button>
            <button
              onClick={() => setActiveTab("ekspedisi")}
              className={`px-6 py-4 rounded-xl font-semibold transition-all flex flex-col items-center gap-2 ${
                activeTab === "ekspedisi"
                  ? "bg-linear-to-br from-green-500 to-green-600 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <span className="text-2xl">🚚</span>
              <span>Ekspedisi</span>
              <span className="text-xs opacity-75">{expeditions.length} items</span>
            </button>
            <button
              onClick={() => setActiveTab("cluster")}
              className={`px-6 py-4 rounded-xl font-semibold transition-all flex flex-col items-center gap-2 ${
                activeTab === "cluster"
                  ? "bg-linear-to-br from-purple-500 to-purple-600 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <span className="text-2xl">🏗️</span>
              <span>Cluster Config</span>
              <span className="text-xs opacity-75">{clusterConfigs.length} clusters</span>
            </button>
            <button
              onClick={() => setActiveTab("product-home")}
              className={`px-6 py-4 rounded-xl font-semibold transition-all flex flex-col items-center gap-2 ${
                activeTab === "product-home"
                  ? "bg-linear-to-br from-orange-500 to-orange-600 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <span className="text-2xl">🏠</span>
              <span>Product Home</span>
              <span className="text-xs opacity-75">{productHomes.length} assignments</span>
            </button>
          </div>
        </div>

        {/* Tab Content - Produk */}
        {activeTab === "produk" && (
          <div className="space-y-6">
            {/* Filters & Add Button */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari produk atau kode..."
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cluster</label>
                  <select
                    value={clusterFilter}
                    onChange={(e) => setClusterFilter(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                  >
                    <option value="ALL">Semua Cluster</option>
                    {clusterConfigs.map((cluster) => (
                      <option key={cluster.cluster_name} value={cluster.cluster_name}>
                        Cluster {cluster.cluster_name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleAddProduct}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  <span className="text-lg">+</span>
                  <span>Tambah Produk</span>
                </button>
              </div>
            </div>

            {/* Product Table */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-linear-to-r from-blue-500 to-indigo-600 text-white">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold">Kode Produk</th>
                      <th className="px-6 py-4 text-left text-sm font-bold">Nama Produk</th>
                      <th className="px-6 py-4 text-center text-sm font-bold">Qty/Carton</th>
                      <th className="px-6 py-4 text-center text-sm font-bold">Qty/Pallet</th>
                      <th className="px-6 py-4 text-center text-sm font-bold">Cluster</th>
                      <th className="px-6 py-4 text-center text-sm font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-blue-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-mono text-gray-700">{product.product_code}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-800">{product.product_name}</td>
                        <td className="px-6 py-4 text-center text-sm font-semibold text-blue-600">
                          {product.qty_per_carton}
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-semibold text-green-600">
                          {product.qty_carton_per_pallet === -1 ? "-" : product.qty_carton_per_pallet}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {product.default_cluster ? (
                            <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-bold">
                              {product.default_cluster}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleEditProduct(product)}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700"
                            >
                              🗑️ Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredProducts.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📦</div>
                  <p className="text-gray-600 font-semibold">Tidak ada data yang sesuai</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Content - Ekspedisi */}
        {activeTab === "ekspedisi" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-6 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Daftar Ekspedisi</h2>
              <button
                onClick={handleAddExpedition}
                className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <span className="text-lg">+</span>
                <span>Tambah Ekspedisi</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-linear-to-r from-green-500 to-emerald-600 text-white">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold">Kode</th>
                      <th className="px-6 py-4 text-left text-sm font-bold">Nama Ekspedisi</th>
                      <th className="px-6 py-4 text-left text-sm font-bold">Contact Person</th>
                      <th className="px-6 py-4 text-left text-sm font-bold">Phone</th>
                      <th className="px-6 py-4 text-center text-sm font-bold">Status</th>
                      <th className="px-6 py-4 text-center text-sm font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {expeditions.map((expedition) => (
                      <tr key={expedition.id} className="hover:bg-green-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-mono text-gray-700">{expedition.expedition_code}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-800">{expedition.expedition_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{expedition.contact_person}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{expedition.phone}</td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                              expedition.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            }`}
                          >
                            {expedition.is_active ? "Aktif" : "Non-Aktif"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleEditExpedition(expedition)}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDeleteExpedition(expedition.id)}
                              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700"
                            >
                              🗑️ Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {expeditions.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🚚</div>
                  <p className="text-gray-600 font-semibold">Belum ada data ekspedisi</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Content - Cluster */}
        {activeTab === "cluster" && (
          <div className="space-y-6">
            <ClusterConfigEditor
              clusters={mockClusters}
              onUpdate={async (updatedMockClusters) => {
                try {
                  // Handle deletions: find clusters that exist in old but not in new
                  for (const oldMockCluster of mockClusters) {
                    const stillExists = updatedMockClusters.some(c => c.id === oldMockCluster.id);
                    if (!stillExists) {
                      // This cluster was deleted
                      const originalCluster = clusterConfigs.find(c => c.cluster_char === oldMockCluster.clusterChar);
                      if (originalCluster) {
                        const result = await deleteClusterConfigAction(originalCluster.id);
                        if (!result.success) {
                          showToast(result.message || `Gagal menghapus cluster ${oldMockCluster.clusterChar}. Silakan coba lagi.`, "error");
                          return;
                        }
                      }
                    }
                  }

                  // Handle creates and updates
                  for (const mockCluster of updatedMockClusters) {
                    // Check if this is a new cluster (temp ID starts with 'cluster-')
                    if (mockCluster.id.startsWith('cluster-')) {
                      // CREATE new cluster
                      const dbData = mockClusterToDb(mockCluster);
                      const result = await createClusterConfigAction({
                        warehouse_id: warehouseId,
                        cluster_char: mockCluster.clusterChar,
                        cluster_name: mockCluster.clusterName,
                        default_lorong_count: dbData.default_lorong_count!,
                        default_baris_count: dbData.default_baris_count!,
                        default_pallet_level: dbData.default_pallet_level!,
                        description: dbData.description,
                        is_active: dbData.is_active!,
                      });
                      if (!result.success) {
                        showToast(result.message || `Gagal membuat cluster ${mockCluster.clusterChar}. Silakan coba lagi.`, "error");
                        return;
                      }
                    } else {
                      // UPDATE existing cluster
                      const originalCluster = clusterConfigs.find(c => c.cluster_char === mockCluster.clusterChar);
                      if (originalCluster) {
                        const dbData = mockClusterToDb(mockCluster);
                        const result = await updateClusterConfigAction(originalCluster.id, dbData);
                        if (!result.success) {
                          showToast(result.message || `Gagal memperbarui cluster ${mockCluster.clusterChar}. Silakan coba lagi.`, "error");
                          return;
                        }
                      }
                    }
                  }
                  
                  showToast(`✓ Konfigurasi cluster berhasil disimpan!`, "success");
                  // Reload page to refresh data
                  window.location.reload();
                } catch (error) {
                  showToast("Gagal menyimpan konfigurasi cluster. Silakan coba lagi.", "error");
                }
              }}
              cellOverrides={mockOverrides}
              onUpdateOverrides={async (updatedMockOverrides) => {
                try {
                  // Find which cluster was edited by comparing old vs new overrides
                  const oldOverrideIds = new Set(cellOverrides.map(o => o.id));
                  const newOverrideIds = new Set(updatedMockOverrides.map(o => o.id));
                  
                  // Handle deletions: overrides that existed before but not now
                  for (const oldOverride of cellOverrides) {
                    if (!newOverrideIds.has(oldOverride.id)) {
                      // This override was deleted
                      const result = await deleteCellOverrideAction(oldOverride.id);
                      if (!result.success) {
                        showToast(`Gagal menghapus override. Silakan coba lagi.`, "error");
                        return;
                      }
                    }
                  }

                  // Handle creates and updates: only process overrides that are new or for edited cluster
                  for (const mockOverride of updatedMockOverrides) {
                    const isNewOverride = mockOverride.id.startsWith('cco-');
                    const isExistingOverride = oldOverrideIds.has(mockOverride.id);
                    
                    // Skip overrides that haven't changed (from other clusters)
                    if (isExistingOverride && !isNewOverride) {
                      const oldOverride = cellOverrides.find(o => o.id === mockOverride.id);
                      // Check if this override actually changed
                      if (oldOverride && 
                          oldOverride.lorong_start === mockOverride.lorongStart &&
                          oldOverride.lorong_end === mockOverride.lorongEnd &&
                          oldOverride.baris_start === mockOverride.barisStart &&
                          oldOverride.baris_end === mockOverride.barisEnd &&
                          oldOverride.custom_baris_count === mockOverride.customBarisCount &&
                          oldOverride.custom_pallet_level === mockOverride.customPalletLevel &&
                          oldOverride.is_transit_area === mockOverride.isTransitArea &&
                          oldOverride.is_disabled === mockOverride.isDisabled &&
                          (oldOverride.note || '') === (mockOverride.note || '')) {
                        // No changes, skip this override
                        continue;
                      }
                    }
                    
                    // Get the clusterConfigId from the mock override
                    const clusterConfigId = mockOverride.clusterConfigId;
                    
                    if (!clusterConfigId) {
                      showToast("Cluster config ID tidak ditemukan untuk override!", "error");
                      console.error("Missing clusterConfigId for override:", mockOverride);
                      continue;
                    }
                    
                    const dbData = mockOverrideToDb(mockOverride, clusterConfigId);
                    const result = await saveCellOverrideAction({ 
                      id: mockOverride.id, 
                      cluster_config_id: clusterConfigId,
                      lorong_start: dbData.lorong_start!,
                      lorong_end: dbData.lorong_end!,
                      baris_start: dbData.baris_start,
                      baris_end: dbData.baris_end,
                      custom_baris_count: dbData.custom_baris_count,
                      custom_pallet_level: dbData.custom_pallet_level,
                      is_transit_area: dbData.is_transit_area!,
                      is_disabled: dbData.is_disabled!,
                      note: dbData.note,
                    });

                    if (!result.success) {
                      showToast(`Gagal menyimpan override untuk lorong ${mockOverride.lorongStart}-${mockOverride.lorongEnd}: ${result.message}`, "error");
                      console.error("Error saving override:", result.message, mockOverride);
                      return;
                    }
                  }
                  
                  showToast(`✓ Cell overrides berhasil disimpan!`, "success");
                  // Reload page to refresh data
                  window.location.reload();
                } catch (error) {
                  console.error("Error saving overrides:", error);
                  showToast("Gagal menyimpan cell overrides. Silakan coba lagi.", "error");
                }
              }}
            />

            {/* Informasi Konfigurasi */}
            <div className="bg-linear-to-r from-blue-50 to-slate-50 border-2 border-blue-200 rounded-xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="text-3xl">📚</div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">Panduan Konfigurasi Cluster</h3>
                  <p className="text-sm text-slate-600">Penjelasan mengenai jenis-jenis konfigurasi yang tersedia</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Default Configuration */}
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">⚙️</span>
                    <h4 className="font-semibold text-blue-900">Default Configuration</h4>
                  </div>
                  <p className="text-sm text-slate-700">
                    Pengaturan standar untuk semua lorong dan baris di cluster. Menentukan jumlah lorong, baris, dan
                    kapasitas pallet per sel secara default.
                  </p>
                </div>

                {/* Cell Overrides */}
                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🔧</span>
                    <h4 className="font-semibold text-purple-900">Cell Overrides</h4>
                  </div>
                  <p className="text-sm text-slate-700">
                    Override konfigurasi untuk area tertentu yang berbeda dari default. Bisa untuk custom baris count,
                    pallet level, transit area, atau disable lokasi.
                    <span className="block mt-1 text-purple-700 font-medium">
                      Contoh: Lorong 1-3 hanya 2 pallet, Lorong 5 disabled karena tiang penyangga.
                    </span>
                  </p>
                </div>

                {/* Transit Area */}
                <div className="bg-white rounded-lg p-4 border border-orange-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🚚</span>
                    <h4 className="font-semibold text-orange-900">Transit Area</h4>
                  </div>
                  <p className="text-sm text-slate-700">
                    Area khusus untuk overflow produk yang tidak muat di lokasi home. Dikonfigurasi sebagai Cell
                    Override dengan flag &ldquo;Transit Area&rdquo;.
                    <span className="block mt-1 text-orange-700 font-medium">
                      Contoh: Lorong 11-12 dijadikan Transit Area untuk semua cluster.
                    </span>
                  </p>
                </div>

                {/* Disabled Areas */}
                <div className="bg-white rounded-lg p-4 border border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🚫</span>
                    <h4 className="font-semibold text-red-900">Disabled Areas</h4>
                  </div>
                  <p className="text-sm text-slate-700">
                    Area yang tidak bisa digunakan untuk penyimpanan karena ada penghalang fisik atau alasan safety.
                    <span className="block mt-1 text-red-700 font-medium">
                      Contoh: Area dekat pintu emergency, tiang penyangga, atau area maintenance.
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content - Product Home */}
        {activeTab === "product-home" && (
          <ProductHomeEditor
            productHomes={mockProductHomes}
            clusters={mockClusters}
            products={products.map((p) => ({ 
              id: p.id, 
              productCode: p.product_code, 
              productName: p.product_name 
            }))}
            onUpdate={async (updatedMockProductHomes) => {
              try {
                // Identify what changed: new items, updated items, or deleted items
                const existingIds = new Set(mockProductHomes.map(ph => ph.id));
                const updatedIds = new Set(updatedMockProductHomes.map(ph => ph.id));
                
                // Find deleted items
                const deletedIds = Array.from(existingIds).filter(id => !updatedIds.has(id));
                for (const id of deletedIds) {
                  await deleteProductHome(id);
                }
                
                // Process new and updated items
                for (const mockPH of updatedMockProductHomes) {
                  const isNew = mockPH.id.startsWith('ph-new-');
                  
                  if (isNew) {
                    // Create new product home
                    const dbData = mockProductHomeToDb(mockPH, warehouseId);
                    await createProductHome({
                      warehouse_id: warehouseId,
                      product_id: dbData.product_id!,
                      cluster_char: dbData.cluster_char!,
                      lorong_start: dbData.lorong_start!,
                      lorong_end: dbData.lorong_end!,
                      baris_start: dbData.baris_start!,
                      baris_end: dbData.baris_end!,
                      max_pallet_per_location: dbData.max_pallet_per_location!,
                      priority: dbData.priority!,
                      is_active: mockPH.isActive,
                    });
                  } else {
                    // Check if this item actually changed
                    const original = mockProductHomes.find(ph => ph.id === mockPH.id);
                    const hasChanges = !original || 
                      original.clusterChar !== mockPH.clusterChar ||
                      original.lorongStart !== mockPH.lorongStart ||
                      original.lorongEnd !== mockPH.lorongEnd ||
                      original.barisStart !== mockPH.barisStart ||
                      original.barisEnd !== mockPH.barisEnd ||
                      original.maxPalletPerLocation !== mockPH.maxPalletPerLocation ||
                      original.priority !== mockPH.priority ||
                      original.isActive !== mockPH.isActive;
                    
                    // Only update if there are actual changes
                    if (hasChanges) {
                      const dbData = mockProductHomeToDb(mockPH, warehouseId);
                      await updateProductHome(mockPH.id, {
                        cluster_char: dbData.cluster_char,
                        lorong_start: dbData.lorong_start,
                        lorong_end: dbData.lorong_end,
                        baris_start: dbData.baris_start,
                        baris_end: dbData.baris_end,
                        max_pallet_per_location: dbData.max_pallet_per_location,
                        priority: dbData.priority,
                        is_active: mockPH.isActive,
                      });
                    }
                  }
                }
                
                showToast(`✓ Product homes berhasil diperbarui!`, "success");
                // Reload page to refresh data
                window.location.reload();
              } catch (error) {
                showToast("Gagal memperbarui product homes. Silakan coba lagi.", "error");
              }
            }}
          />
        )}

        {/* Product Add/Edit Modals */}
        {(showAddProductModal || showEditProductModal) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
              <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-2xl">
                <h3 className="text-xl font-bold text-gray-800">
                  {showAddProductModal ? "Tambah Produk" : "Edit Produk"}
                </h3>
                <button
                  onClick={() => {
                    setShowAddProductModal(false);
                    setShowEditProductModal(false);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Kode Produk *</label>
                  <input
                    type="text"
                    value={formProduct.product_code || ""}
                    onChange={(e) => setFormProduct({ ...formProduct, product_code: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                    disabled={showEditProductModal}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Produk *</label>
                  <input
                    type="text"
                    value={formProduct.product_name || ""}
                    onChange={(e) => setFormProduct({ ...formProduct, product_name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Qty per Carton</label>
                    <input
                      type="number"
                      value={formProduct.qty_per_carton || 0}
                      onChange={(e) =>
                        setFormProduct({ ...formProduct, qty_per_carton: parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Qty per Pallet</label>
                    <input
                      type="number"
                      value={formProduct.qty_carton_per_pallet || 0}
                      onChange={(e) =>
                        setFormProduct({ ...formProduct, qty_carton_per_pallet: Number(e.target.value) })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Default Cluster</label>
                  <select
                    value={formProduct.default_cluster || ""}
                    onChange={(e) => setFormProduct({ ...formProduct, default_cluster: e.target.value || null })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                  >
                    <option value="">Pilih Cluster</option>
                    {clusterConfigs.map((cluster) => (
                      <option key={cluster.cluster_char} value={cluster.cluster_char}>
                        {cluster.cluster_char}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-white border-t border-gray-200 px-6 py-4 flex gap-3 rounded-b-2xl">
                <button
                  onClick={() => {
                    setShowAddProductModal(false);
                    setShowEditProductModal(false);
                  }}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  onClick={showAddProductModal ? handleSubmitAddProduct : handleSubmitEditProduct}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
                >
                  {showAddProductModal ? "Simpan" : "Update"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Expedition Add/Edit Modals */}
        {(showAddExpeditionModal || showEditExpeditionModal) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-2xl">
                <h3 className="text-xl font-bold text-gray-800">
                  {showAddExpeditionModal ? "Tambah Ekspedisi" : "Edit Ekspedisi"}
                </h3>
                <button
                  onClick={() => {
                    setShowAddExpeditionModal(false);
                    setShowEditExpeditionModal(false);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Kode Ekspedisi *</label>
                  <input
                    type="text"
                    value={formExpedition.expedition_code || ""}
                    onChange={(e) => setFormExpedition({ ...formExpedition, expedition_code: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500"
                    disabled={showEditExpeditionModal}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Ekspedisi *</label>
                  <input
                    type="text"
                    value={formExpedition.expedition_name || ""}
                    onChange={(e) => setFormExpedition({ ...formExpedition, expedition_name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Person</label>
                  <input
                    type="text"
                    value={formExpedition.contact_person || ""}
                    onChange={(e) => setFormExpedition({ ...formExpedition, contact_person: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                  <input
                    type="text"
                    value={formExpedition.phone || ""}
                    onChange={(e) => setFormExpedition({ ...formExpedition, phone: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActiveExpedition"
                    checked={formExpedition.is_active ?? true}
                    onChange={(e) => setFormExpedition({ ...formExpedition, is_active: e.target.checked })}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActiveExpedition" className="ml-2 block text-sm text-gray-700">
                    Aktif
                  </label>
                </div>
              </div>

              <div className="bg-white border-t border-gray-200 px-6 py-4 flex gap-3 rounded-b-2xl">
                <button
                  onClick={() => {
                    setShowAddExpeditionModal(false);
                    setShowEditExpeditionModal(false);
                  }}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  onClick={showAddExpeditionModal ? handleSubmitAddExpedition : handleSubmitEditExpedition}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700"
                >
                  {showAddExpeditionModal ? "Simpan" : "Update"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
