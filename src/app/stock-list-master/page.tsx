"use client";

import { useState, useMemo } from "react";
import { productMasterData, ekspedisiMaster, type ProductMaster } from "@/lib/mock/product-master";

export default function StockListMasterPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [clusterFilter, setClusterFilter] = useState<"ALL" | "A" | "B" | "C" | "D" | "E">("ALL");
  const [activeTab, setActiveTab] = useState<"produk" | "ekspedisi" | "cluster">("produk");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductMaster | null>(null);
  const [selectedEkspedisi, setSelectedEkspedisi] = useState<{code: string; name: string} | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{type: 'produk' | 'ekspedisi' | 'cluster', id: string, name: string} | null>(null);

  // State for data management
  const [products, setProducts] = useState<ProductMaster[]>(productMasterData);
  const [ekspedisis, setEkspedisis] = useState(ekspedisiMaster);

  // Form states
  const [formProduct, setFormProduct] = useState<ProductMaster>({
    id: '',
    productCode: '',
    productName: '',
    qtyPerCarton: 0,
    qtyPerPallet: 0,
    defaultCluster: ''
  });
  const [formEkspedisi, setFormEkspedisi] = useState<{code: string; name: string}>({
    code: '',
    name: ''
  });
  const [formCluster, setFormCluster] = useState<string>('');

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

  // Summary cluster
  const clusterSummary = useMemo(() => {
    const summary: { [key: string]: number } = {};
    products.forEach(product => {
      if (product.defaultCluster) {
        summary[product.defaultCluster] = (summary[product.defaultCluster] || 0) + 1;
      }
    });
    return Object.entries(summary).map(([cluster, count]) => ({ cluster, count }));
  }, [products]);

  const handleEdit = (product: ProductMaster) => {
    setSelectedProduct(product);
    setFormProduct({...product});
    setShowEditModal(true);
  };

  const handleDelete = (id: string) => {
    const product = products.find(p => p.id === id);
    if (product) {
      setDeleteTarget({
        type: 'produk',
        id: id,
        name: product.productName
      });
      setShowDeleteModal(true);
    }
  };

  const handleEditEkspedisi = (ekspedisi: {code: string; name: string}) => {
    setSelectedEkspedisi(ekspedisi);
    setFormEkspedisi({...ekspedisi});
    setShowEditModal(true);
  };

  const handleDeleteEkspedisi = (code: string) => {
    const ekspedisi = ekspedisis.find(e => e.code === code);
    if (ekspedisi) {
      setDeleteTarget({
        type: 'ekspedisi',
        id: code,
        name: ekspedisi.name
      });
      setShowDeleteModal(true);
    }
  };

  const handleEditCluster = (cluster: string) => {
    setSelectedCluster(cluster);
    setFormCluster(cluster);
    setShowEditModal(true);
  };

  const handleDeleteCluster = (cluster: string) => {
    setDeleteTarget({
      type: 'cluster',
      id: cluster,
      name: `Cluster ${cluster}`
    });
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'produk') {
      setProducts(products.filter(p => p.id !== deleteTarget.id));
    } else if (deleteTarget.type === 'ekspedisi') {
      setEkspedisis(ekspedisis.filter(e => e.code !== deleteTarget.id));
    } else if (deleteTarget.type === 'cluster') {
      setProducts(products.map(p => p.defaultCluster === deleteTarget.id ? {...p, defaultCluster: undefined} : p));
    }

    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  const handleAdd = () => {
    if (activeTab === "produk") {
      setFormProduct({
        id: '',
        productCode: '',
        productName: '',
        qtyPerCarton: 0,
        qtyPerPallet: 0,
        defaultCluster: ''
      });
    } else if (activeTab === "ekspedisi") {
      setFormEkspedisi({
        code: '',
        name: ''
      });
    } else if (activeTab === "cluster") {
      setFormCluster('');
    }
    setShowAddModal(true);
  };

  const handleSubmitAdd = () => {
    if (activeTab === "produk") {
      if (!formProduct.productCode || !formProduct.productName) {
        alert("Kode produk dan nama produk harus diisi!");
        return;
      }
      const newId = `PM${String(products.length + 1).padStart(3, '0')}`;
      setProducts([...products, {...formProduct, id: newId}]);
    } else if (activeTab === "ekspedisi") {
      if (!formEkspedisi.code || !formEkspedisi.name) {
        alert("Kode dan nama ekspedisi harus diisi!");
        return;
      }
      setEkspedisis([...ekspedisis, formEkspedisi]);
    } else if (activeTab === "cluster") {
      if (!formCluster) {
        alert("Nama cluster harus diisi!");
        return;
      }
      // For cluster, we don't add to a separate list, but perhaps add a product with this cluster
      // For simplicity, just alert
      alert(`Cluster ${formCluster} ditambahkan (demo)`);
    }
    setShowAddModal(false);
  };

  const handleSubmitEdit = () => {
    if (activeTab === "produk" && selectedProduct) {
      if (!formProduct.productCode || !formProduct.productName) {
        alert("Kode produk dan nama produk harus diisi!");
        return;
      }
      setProducts(products.map(p => p.id === selectedProduct.id ? formProduct : p));
    } else if (activeTab === "ekspedisi" && selectedEkspedisi) {
      if (!formEkspedisi.code || !formEkspedisi.name) {
        alert("Kode dan nama ekspedisi harus diisi!");
        return;
      }
      setEkspedisis(ekspedisis.map(e => e.code === selectedEkspedisi.code ? formEkspedisi : e));
    } else if (activeTab === "cluster" && selectedCluster) {
      if (!formCluster) {
        alert("Nama cluster harus diisi!");
        return;
      }
      // Update cluster in products
      setProducts(products.map(p => p.defaultCluster === selectedCluster ? {...p, defaultCluster: formCluster} : p));
    }
    setShowEditModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                Master Data
              </h1>
              <p className="text-sm text-slate-600">
                Kelola data master produk, ekspedisi, dan cluster
              </p>
            </div>
            <button
              onClick={handleAdd}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 justify-center sm:justify-start"
            >
              <span className="text-lg">+</span>
              <span>Tambah Data</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab("produk")}
              className={`flex-1 sm:flex-none px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === "produk"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <span>📦</span>
                <span>Produk</span>
                <span className="inline-flex items-center justify-center bg-white/20 px-2 py-0.5 rounded-full text-xs">
                  {products.length}
                </span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab("ekspedisi")}
              className={`flex-1 sm:flex-none px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === "ekspedisi"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <span>🚚</span>
                <span>Ekspedisi</span>
                <span className="inline-flex items-center justify-center bg-white/20 px-2 py-0.5 rounded-full text-xs">
                  {ekspedisis.length}
                </span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab("cluster")}
              className={`flex-1 sm:flex-none px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === "cluster"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <span>📊</span>
                <span>Cluster</span>
                <span className="inline-flex items-center justify-center bg-white/20 px-2 py-0.5 rounded-full text-xs">
                  {clusterSummary.length}
                </span>
              </span>
            </button>
          </div>
        </div>

        {/* Content based on tab */}
        {activeTab === "produk" && (
          <>
            {/* Filters for Produk */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🔍</span>
                <h3 className="text-sm font-bold text-slate-900">Filter & Pencarian</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Pencarian
                  </label>
                  <input
                    type="text"
                    placeholder="Cari produk atau kode..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Cluster Default
                  </label>
                  <select
                    value={clusterFilter}
                    onChange={(e) => setClusterFilter(e.target.value as typeof clusterFilter)}
                    className="w-full rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  >
                    <option value="ALL">Semua Cluster</option>
                    <option value="A">Cluster A</option>
                    <option value="B">Cluster B</option>
                    <option value="C">Cluster C</option>
                    <option value="D">Cluster D</option>
                    <option value="E">Cluster E</option>
                  </select>
                </div>
              </div>

              {(searchQuery || clusterFilter !== "ALL") && (
                <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
                  <p className="text-xs text-slate-600">
                    Menampilkan <span className="font-bold text-blue-600">{filteredProducts.length}</span> dari <span className="font-semibold">{products.length}</span> data
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setClusterFilter("ALL");
                    }}
                    className="rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all flex items-center gap-2"
                  >
                    <span>🔄</span>
                    <span>Reset Filter</span>
                  </button>
                </div>
              )}
            </div>

            {/* Table Produk */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Kode Produk</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Nama Produk</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700">Qty/Karton</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700">Qty/Pallet</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700">Cluster Default</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredProducts.map((product: ProductMaster) => (
                      <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-900">{product.id}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{product.productCode}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">{product.productName}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-semibold text-blue-600">
                            {product.qtyPerCarton}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-semibold text-emerald-600">
                            {product.qtyPerPallet}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {product.defaultCluster ? (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-semibold text-sm">
                              {product.defaultCluster}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEdit(product)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all shadow-sm hover:shadow-md flex items-center gap-1.5"
                            >
                              <span>✏️</span>
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-all shadow-sm hover:shadow-md flex items-center gap-1.5"
                            >
                              <span>🗑️</span>
                              <span>Hapus</span>
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
                  <div className="text-4xl mb-3">📦</div>
                  <p className="text-slate-600 font-medium">Tidak ada data yang sesuai</p>
                  <p className="text-sm text-slate-500 mt-1">Coba ubah filter atau tambah data baru</p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "ekspedisi" && (
          <>
            {/* Table Ekspedisi */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Kode</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Nama Ekspedisi</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {ekspedisis.map((ekspedisi) => (
                      <tr key={ekspedisi.code} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-900">{ekspedisi.code}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">{ekspedisi.name}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEditEkspedisi(ekspedisi)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all shadow-sm hover:shadow-md flex items-center gap-1.5"
                            >
                              <span>✏️</span>
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteEkspedisi(ekspedisi.code)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-all shadow-sm hover:shadow-md flex items-center gap-1.5"
                            >
                              <span>🗑️</span>
                              <span>Hapus</span>
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
                  <div className="text-4xl mb-3">🚚</div>
                  <p className="text-slate-600 font-medium">Tidak ada data ekspedisi</p>
                  <p className="text-sm text-slate-500 mt-1">Tambah data ekspedisi baru</p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "cluster" && (
          <>
            {/* Table Cluster */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Cluster</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700">Jumlah Produk</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {clusterSummary.map((item) => (
                      <tr key={item.cluster} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-semibold text-sm">
                            {item.cluster}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-semibold text-emerald-600">
                            {item.count}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEditCluster(item.cluster)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all shadow-sm hover:shadow-md flex items-center gap-1.5"
                            >
                              <span>✏️</span>
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteCluster(item.cluster)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-all shadow-sm hover:shadow-md flex items-center gap-1.5"
                            >
                              <span>🗑️</span>
                              <span>Hapus</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {clusterSummary.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">📊</div>
                  <p className="text-slate-600 font-medium">Tidak ada data cluster</p>
                  <p className="text-sm text-slate-500 mt-1">Tambah data cluster baru</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">
                      {activeTab === "produk" ? "📦" : activeTab === "ekspedisi" ? "🚚" : "📊"}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Tambah {activeTab === "produk" ? "Produk" : activeTab === "ekspedisi" ? "Ekspedisi" : "Cluster"} Baru
                    </h2>
                    <p className="text-sm text-blue-100">
                      Isi formulir di bawah dengan lengkap
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-white/80 hover:text-white hover:bg-white/20 w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                >
                  <span className="text-2xl leading-none">×</span>
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {activeTab === "produk" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Kode Produk <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formProduct.productCode}
                      onChange={(e) => setFormProduct({...formProduct, productCode: e.target.value})}
                      className="w-full rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      placeholder="Contoh: AQ-1100ML-BC"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Nama Produk <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formProduct.productName}
                      onChange={(e) => setFormProduct({...formProduct, productName: e.target.value})}
                      className="w-full rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      placeholder="Contoh: 1100ML AQUA LOCAL"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Qty/Karton
                      </label>
                      <input
                        type="number"
                        value={formProduct.qtyPerCarton}
                        onChange={(e) => setFormProduct({...formProduct, qtyPerCarton: Number(e.target.value)})}
                        className="w-full rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        placeholder="0"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Qty/Pallet
                      </label>
                      <input
                        type="number"
                        value={formProduct.qtyPerPallet}
                        onChange={(e) => setFormProduct({...formProduct, qtyPerPallet: Number(e.target.value)})}
                        className="w-full rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        placeholder="0"
                        min="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Cluster Default
                    </label>
                    <select
                      value={formProduct.defaultCluster}
                      onChange={(e) => setFormProduct({...formProduct, defaultCluster: e.target.value})}
                      className="w-full rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    >
                      <option value="">Tidak ada cluster</option>
                      <option value="A">Cluster A</option>
                      <option value="B">Cluster B</option>
                      <option value="C">Cluster C</option>
                      <option value="D">Cluster D</option>
                      <option value="E">Cluster E</option>
                    </select>
                  </div>
                </div>
              )}
              {activeTab === "ekspedisi" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Kode Ekspedisi <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formEkspedisi.code}
                      onChange={(e) => setFormEkspedisi({...formEkspedisi, code: e.target.value.toUpperCase()})}
                      className="w-full rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      placeholder="Contoh: HGS, SJP"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Nama Ekspedisi <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formEkspedisi.name}
                      onChange={(e) => setFormEkspedisi({...formEkspedisi, name: e.target.value})}
                      className="w-full rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      placeholder="Masukkan nama ekspedisi"
                    />
                  </div>
                </div>
              )}
              {activeTab === "cluster" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Nama Cluster <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formCluster}
                      onChange={(e) => setFormCluster(e.target.value.toUpperCase())}
                      className="w-full rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      placeholder="Contoh: A, B, C"
                      maxLength={1}
                    />
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <span className="text-blue-600 text-xl flex-shrink-0">ℹ️</span>
                      <p className="text-xs text-blue-800">
                        Cluster akan digunakan untuk mengelompokkan produk dalam gudang. Biasanya menggunakan huruf kapital seperti A, B, C, D, atau E.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex gap-3 flex-shrink-0">
              <button
                onClick={handleSubmitAdd}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <span>💾</span>
                <span>Simpan Data</span>
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-white border-2 border-slate-300 text-slate-700 py-3 rounded-lg font-semibold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
              >
                <span>❌</span>
                <span>Batal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">
                      {activeTab === "produk" ? "📦" : activeTab === "ekspedisi" ? "🚚" : "📊"}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Edit {activeTab === "produk" ? "Produk" : activeTab === "ekspedisi" ? "Ekspedisi" : "Cluster"}
                    </h2>
                    <p className="text-sm text-blue-100">
                      Perbarui informasi yang diperlukan
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-white/80 hover:text-white hover:bg-white/20 w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                >
                  <span className="text-2xl leading-none">×</span>
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {activeTab === "produk" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      ID Produk
                    </label>
                    <input
                      type="text"
                      value={formProduct.id}
                      disabled
                      className="w-full rounded-lg border-2 border-slate-200 px-4 py-2.5 text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Kode Produk <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formProduct.productCode}
                      onChange={(e) => setFormProduct({...formProduct, productCode: e.target.value})}
                      className="w-full rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      placeholder="Contoh: AQ-1100ML-BC"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Nama Produk <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formProduct.productName}
                      onChange={(e) => setFormProduct({...formProduct, productName: e.target.value})}
                      className="w-full rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      placeholder="Contoh: 1100ML AQUA LOCAL"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Qty/Karton
                      </label>
                      <input
                        type="number"
                        value={formProduct.qtyPerCarton}
                        onChange={(e) => setFormProduct({...formProduct, qtyPerCarton: Number(e.target.value)})}
                        className="w-full rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        placeholder="0"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Qty/Pallet
                      </label>
                      <input
                        type="number"
                        value={formProduct.qtyPerPallet}
                        onChange={(e) => setFormProduct({...formProduct, qtyPerPallet: Number(e.target.value)})}
                        className="w-full rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        placeholder="0"
                        min="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Cluster Default
                    </label>
                    <select
                      value={formProduct.defaultCluster}
                      onChange={(e) => setFormProduct({...formProduct, defaultCluster: e.target.value})}
                      className="w-full rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    >
                      <option value="">Tidak ada cluster</option>
                      <option value="A">Cluster A</option>
                      <option value="B">Cluster B</option>
                      <option value="C">Cluster C</option>
                      <option value="D">Cluster D</option>
                      <option value="E">Cluster E</option>
                    </select>
                  </div>
                </div>
              )}
              {activeTab === "ekspedisi" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Kode Ekspedisi <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formEkspedisi.code}
                      onChange={(e) => setFormEkspedisi({...formEkspedisi, code: e.target.value.toUpperCase()})}
                      className="w-full rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      placeholder="Contoh: HGS, SJP"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Nama Ekspedisi <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formEkspedisi.name}
                      onChange={(e) => setFormEkspedisi({...formEkspedisi, name: e.target.value})}
                      className="w-full rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      placeholder="Masukkan nama ekspedisi"
                    />
                  </div>
                </div>
              )}
              {activeTab === "cluster" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Nama Cluster Lama
                    </label>
                    <input
                      type="text"
                      value={selectedCluster || ''}
                      disabled
                      className="w-full rounded-lg border-2 border-slate-200 px-4 py-2.5 text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Nama Cluster Baru <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formCluster}
                      onChange={(e) => setFormCluster(e.target.value.toUpperCase())}
                      className="w-full rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all uppercase"
                      placeholder="Contoh: A, B, C"
                      maxLength={1}
                    />
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <span className="text-amber-600 text-xl flex-shrink-0">⚠️</span>
                      <p className="text-xs text-amber-800">
                        Mengubah nama cluster akan mempengaruhi semua produk yang menggunakan cluster ini. Pastikan perubahan sudah benar sebelum menyimpan.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex gap-3 flex-shrink-0">
              <button
                onClick={handleSubmitEdit}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <span>💾</span>
                <span>Simpan Perubahan</span>
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 bg-white border-2 border-slate-300 text-slate-700 py-3 rounded-lg font-semibold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
              >
                <span>❌</span>
                <span>Batal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-3xl">⚠️</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Konfirmasi Hapus
                  </h2>
                  <p className="text-sm text-red-100">
                    Tindakan ini tidak dapat dibatalkan
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-700 mb-2">
                Apakah Anda yakin ingin menghapus:
              </p>
              <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-4 mb-4">
                <p className="font-semibold text-slate-900 text-lg">
                  {deleteTarget.name}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {deleteTarget.type === 'produk' ? '📦 Produk' : deleteTarget.type === 'ekspedisi' ? '🚚 Ekspedisi' : '📊 Cluster'}
                </p>
              </div>
              {deleteTarget.type === 'cluster' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <div className="flex gap-3">
                    <span className="text-amber-600 text-xl flex-shrink-0">⚠️</span>
                    <p className="text-xs text-amber-800">
                      Produk yang menggunakan cluster ini akan kehilangan cluster default mereka.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex gap-3">
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <span>🗑️</span>
                <span>Ya, Hapus</span>
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTarget(null);
                }}
                className="flex-1 bg-white border-2 border-slate-300 text-slate-700 py-3 rounded-lg font-semibold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
              >
                <span>❌</span>
                <span>Batal</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
