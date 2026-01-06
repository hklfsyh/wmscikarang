"use client";

import { useState, useMemo, useEffect } from "react";
import { productMasterData, ekspedisiMaster, expeditionsMock, getExpeditionsByWarehouse, type ProductMaster, type Expedition as Ekspedisi } from "@/lib/mock/product-master";
import { clusterConfigs, productHomes, clusterCellOverrides, type ClusterConfig, type ProductHome, type ClusterCellOverride } from "@/lib/mock/warehouse-config";
import ClusterConfigEditor from "@/components/cluster-config-editor";
import ProductHomeEditor from "@/components/product-home-editor";
import { useToast, ToastContainer } from "@/components/toast";

export default function StockListMasterPage() {
  const [activeTab, setActiveTab] = useState<"produk" | "ekspedisi" | "cluster" | "product-home">("produk");
  const { showToast, toasts, removeToast } = useToast();

  // Warehouse context
  const [currentWarehouseId, setCurrentWarehouseId] = useState<string | null>(null);

  // State for data management
  const [products, setProducts] = useState<ProductMaster[]>(productMasterData);
  const [ekspedisis, setEkspedisis] = useState<Ekspedisi[]>([]);
  const [clusters, setClusters] = useState<ClusterConfig[]>(clusterConfigs);
  const [cellOverrides, setCellOverrides] = useState<ClusterCellOverride[]>(clusterCellOverrides);
  const [productHomesList, setProductHomesList] = useState<ProductHome[]>(productHomes);

  // Load warehouse context and expeditions
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      const warehouseId = user.warehouseId || "wh-001-cikarang"; // Default to Cikarang
      setCurrentWarehouseId(warehouseId);
      
      // Load expeditions for current warehouse
      const warehouseExpeditions = getExpeditionsByWarehouse(warehouseId);
      setEkspedisis(warehouseExpeditions);
    }
  }, []);

  // For Product tab
  const [searchQuery, setSearchQuery] = useState("");
  const [clusterFilter, setClusterFilter] = useState<"ALL" | "A" | "B" | "C" | "D" | "E">("ALL");
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductMaster | null>(null);
  const [formProduct, setFormProduct] = useState<ProductMaster>({
    id: "",
    warehouseId: "wh-001-cikarang",
    productCode: "",
    productName: "",
    category: "",
    unit: "carton",
    qtyPerCarton: 0,
    qtyCartonPerPallet: 0,
    defaultCluster: null,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // For Ekspedisi tab
  const [showAddEkspedisiModal, setShowAddEkspedisiModal] = useState(false);
  const [showEditEkspedisiModal, setShowEditEkspedisiModal] = useState(false);
  const [selectedEkspedisi, setSelectedEkspedisi] = useState<Ekspedisi | null>(null);
  const [formEkspedisi, setFormEkspedisi] = useState<Ekspedisi>({
    id: "",
    warehouseId: currentWarehouseId || "wh-001-cikarang",
    expeditionCode: "",
    expeditionName: "",
    contactPerson: "",
    phone: "",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Filter data produk
  const filteredProducts = useMemo(() => {
    return products.filter((product: ProductMaster) => {
      if (clusterFilter !== "ALL" && product.defaultCluster !== clusterFilter) {
        return false;
      }
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        return (
          product.productName.toLowerCase().includes(query) ||
          product.productCode.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [searchQuery, clusterFilter, products]);

  const handleAddProduct = () => {
    setFormProduct({
      id: "",
      warehouseId: "wh-001-cikarang",
      productCode: "",
      productName: "",
      category: "",
      unit: "carton",
      qtyPerCarton: 0,
      qtyCartonPerPallet: 0,
      defaultCluster: null,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setShowAddProductModal(true);
  };

  const handleEditProduct = (product: ProductMaster) => {
    setSelectedProduct(product);
    setFormProduct({ ...product });
    setShowEditProductModal(true);
  };

  const handleSubmitAddProduct = () => {
    if (!formProduct.productCode || !formProduct.productName) {
      showToast("Kode produk dan nama produk harus diisi!", "error");
      return;
    }
    const newId = `PM${String(products.length + 1).padStart(3, "0")}`;
    setProducts([...products, { ...formProduct, id: newId }]);
    setShowAddProductModal(false);
    showToast(`✓ Produk "${formProduct.productName}" berhasil ditambahkan!`, "success");
  };

  const handleSubmitEditProduct = () => {
    if (!formProduct.productCode || !formProduct.productName) {
      showToast("Kode produk dan nama produk harus diisi!", "error");
      return;
    }
    setProducts(products.map((p) => (p.id === selectedProduct?.id ? formProduct : p)));
    setShowEditProductModal(false);
    setSelectedProduct(null);
    showToast(`✓ Produk "${formProduct.productName}" berhasil diperbarui!`, "success");
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus produk ini?")) {
      setProducts(products.filter((p) => p.id !== id));
    }
  };

  const handleAddEkspedisi = () => {
    setFormEkspedisi({
      id: "",
      warehouseId: currentWarehouseId || "wh-001-cikarang",
      expeditionCode: "",
      expeditionName: "",
      contactPerson: "",
      phone: "",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setShowAddEkspedisiModal(true);
  };

  const handleEditEkspedisi = (ekspedisi: Ekspedisi) => {
    setSelectedEkspedisi(ekspedisi);
    setFormEkspedisi({ ...ekspedisi });
    setShowEditEkspedisiModal(true);
  };

  const handleSubmitAddEkspedisi = () => {
    if (!formEkspedisi.expeditionCode || !formEkspedisi.expeditionName) {
      showToast("Kode dan nama ekspedisi harus diisi!", "error");
      return;
    }
    
    const newId = `exp-${currentWarehouseId?.split('-')[2] || 'ckr'}-${String(ekspedisis.length + 1).padStart(3, "0")}`;
    const newEkspedisi = { ...formEkspedisi, id: newId };
    
    setEkspedisis([...ekspedisis, newEkspedisi]);
    setShowAddEkspedisiModal(false);
    showToast(`✓ Ekspedisi "${formEkspedisi.expeditionName}" berhasil ditambahkan!`, "success");
  };

  const handleSubmitEditEkspedisi = () => {
    if (!formEkspedisi.expeditionCode || !formEkspedisi.expeditionName) {
      showToast("Kode dan nama ekspedisi harus diisi!", "error");
      return;
    }
    
    const updatedEkspedisi = { ...formEkspedisi, updatedAt: new Date().toISOString() };
    setEkspedisis(ekspedisis.map((e) => (e.id === selectedEkspedisi?.id ? updatedEkspedisi : e)));
    setShowEditEkspedisiModal(false);
    setSelectedEkspedisi(null);
    showToast(`✓ Ekspedisi "${formEkspedisi.expeditionName}" berhasil diperbarui!`, "success");
  };

  const handleDeleteEkspedisi = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus ekspedisi ini?")) {
      setEkspedisis(ekspedisis.filter((e) => e.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
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
              <span className="text-xs opacity-75">{ekspedisis.length} items</span>
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
              <span className="text-xs opacity-75">{clusters.length} clusters</span>
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
              <span className="text-xs opacity-75">{productHomesList.length} assignments</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
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
                    onChange={(e) => setClusterFilter(e.target.value as typeof clusterFilter)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                  >
                    <option value="ALL">Semua Cluster</option>
                    <option value="A">Cluster A</option>
                    <option value="B">Cluster B</option>
                    <option value="C">Cluster C</option>
                    <option value="D">Cluster D</option>
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
                        <td className="px-6 py-4 text-sm font-mono text-gray-700">{product.productCode}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-800">{product.productName}</td>
                        <td className="px-6 py-4 text-center text-sm font-semibold text-blue-600">
                          {product.qtyPerCarton}
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-semibold text-green-600">
                          {product.qtyCartonPerPallet === -1 ? "-" : product.qtyCartonPerPallet}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {product.defaultCluster ? (
                            <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-bold">
                              {product.defaultCluster}
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

        {activeTab === "ekspedisi" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-6 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Daftar Ekspedisi</h2>
              <button
                onClick={handleAddEkspedisi}
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
                    {ekspedisis.map((ekspedisi) => (
                      <tr key={ekspedisi.id} className="hover:bg-green-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-mono text-gray-700">{ekspedisi.expeditionCode}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-800">{ekspedisi.expeditionName}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{ekspedisi.contactPerson}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{ekspedisi.phone}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                            ekspedisi.isActive 
                              ? "bg-green-100 text-green-700" 
                              : "bg-red-100 text-red-700"
                          }`}>
                            {ekspedisi.isActive ? "Aktif" : "Non-Aktif"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleEditEkspedisi(ekspedisi)}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDeleteEkspedisi(ekspedisi.id)}
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
              {ekspedisis.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🚚</div>
                  <p className="text-gray-600 font-semibold">Belum ada data ekspedisi</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "cluster" && (
          <div className="space-y-6">
            <ClusterConfigEditor 
              clusters={clusters} 
              onUpdate={setClusters}
              cellOverrides={cellOverrides}
              onUpdateOverrides={setCellOverrides}
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
                    Pengaturan standar untuk semua lorong dan baris di cluster. Menentukan jumlah lorong, baris, dan kapasitas pallet per sel secara default.
                  </p>
                </div>

                {/* Cell Overrides */}
                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🔧</span>
                    <h4 className="font-semibold text-purple-900">Cell Overrides</h4>
                  </div>
                  <p className="text-sm text-slate-700">
                    Override konfigurasi untuk area tertentu yang berbeda dari default. Bisa untuk custom baris count, pallet level, transit area, atau disable lokasi.
                    <span className="block mt-1 text-purple-700 font-medium">Contoh: Lorong 1-3 hanya 2 pallet, Lorong 5 disabled karena tiang penyangga.</span>
                  </p>
                </div>

                {/* Transit Area */}
                <div className="bg-white rounded-lg p-4 border border-orange-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🚚</span>
                    <h4 className="font-semibold text-orange-900">Transit Area</h4>
                  </div>
                  <p className="text-sm text-slate-700">
                    Area khusus untuk overflow produk yang tidak muat di lokasi home. Dikonfigurasi sebagai Cell Override dengan flag &ldquo;Transit Area&rdquo;.
                    <span className="block mt-1 text-orange-700 font-medium">Contoh: Lorong 11-12 dijadikan Transit Area untuk semua cluster.</span>
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
                    <span className="block mt-1 text-red-700 font-medium">Contoh: Area dekat pintu emergency, tiang penyangga, atau area maintenance.</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "product-home" && (
          <ProductHomeEditor
            productHomes={productHomesList}
            clusters={clusters}
            products={products.map(p => ({ productCode: p.productCode, productName: p.productName }))}
            onUpdate={setProductHomesList}
          />
        )}

        {/* Product Add/Edit Modals (simplified) */}
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
                    value={formProduct.productCode}
                    onChange={(e) => setFormProduct({ ...formProduct, productCode: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Produk *</label>
                  <input
                    type="text"
                    value={formProduct.productName}
                    onChange={(e) => setFormProduct({ ...formProduct, productName: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Qty per Carton</label>
                    <input
                      type="number"
                      value={formProduct.qtyPerCarton}
                      onChange={(e) => setFormProduct({ ...formProduct, qtyPerCarton: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Qty per Pallet</label>
                    <input
                      type="number"
                      value={formProduct.qtyCartonPerPallet}
                      onChange={(e) => setFormProduct({...formProduct, qtyCartonPerPallet: Number(e.target.value)})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Default Cluster</label>
                  <select
                    value={formProduct.defaultCluster || ""}
                    onChange={(e) => setFormProduct({ ...formProduct, defaultCluster: e.target.value || null })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                  >
                    <option value="">Pilih Cluster</option>
                    <option value="A">Cluster A</option>
                    <option value="B">Cluster B</option>
                    <option value="C">Cluster C</option>
                    <option value="D">Cluster D</option>
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

        {/* Ekspedisi Add/Edit Modals (simplified) */}
        {(showAddEkspedisiModal || showEditEkspedisiModal) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-2xl">
                <h3 className="text-xl font-bold text-gray-800">
                  {showAddEkspedisiModal ? "Tambah Ekspedisi" : "Edit Ekspedisi"}
                </h3>
                <button
                  onClick={() => {
                    setShowAddEkspedisiModal(false);
                    setShowEditEkspedisiModal(false);
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
                    value={formEkspedisi.expeditionCode}
                    onChange={(e) => setFormEkspedisi({ ...formEkspedisi, expeditionCode: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500"
                    disabled={showEditEkspedisiModal}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Ekspedisi *</label>
                  <input
                    type="text"
                    value={formEkspedisi.expeditionName}
                    onChange={(e) => setFormEkspedisi({ ...formEkspedisi, expeditionName: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Person *</label>
                  <input
                    type="text"
                    value={formEkspedisi.contactPerson}
                    onChange={(e) => setFormEkspedisi({ ...formEkspedisi, contactPerson: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone *</label>
                  <input
                    type="text"
                    value={formEkspedisi.phone}
                    onChange={(e) => setFormEkspedisi({ ...formEkspedisi, phone: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActiveEkspedisi"
                    checked={formEkspedisi.isActive}
                    onChange={(e) => setFormEkspedisi({ ...formEkspedisi, isActive: e.target.checked })}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActiveEkspedisi" className="ml-2 block text-sm text-gray-700">
                    Aktif
                  </label>
                </div>
              </div>

              <div className="bg-white border-t border-gray-200 px-6 py-4 flex gap-3 rounded-b-2xl">
                <button
                  onClick={() => {
                    setShowAddEkspedisiModal(false);
                    setShowEditEkspedisiModal(false);
                  }}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  onClick={showAddEkspedisiModal ? handleSubmitAddEkspedisi : handleSubmitEditEkspedisi}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700"
                >
                  {showAddEkspedisiModal ? "Simpan" : "Update"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
