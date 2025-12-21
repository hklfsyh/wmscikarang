"use client";

import { useState } from "react";
import { type ProductHome, type ClusterConfig } from "@/lib/mock/warehouse-config";
import { useToast, ToastContainer } from "./toast";

interface ProductHomeEditorProps {
  productHomes: ProductHome[];
  clusters: ClusterConfig[];
  products: Array<{ productCode: string; productName: string }>;
  onUpdate: (productHomes: ProductHome[]) => void;
}

export default function ProductHomeEditor({
  productHomes,
  clusters,
  products,
  onUpdate,
}: ProductHomeEditorProps) {
  const { toasts, removeToast, error } = useToast();
  const [selectedProductHome, setSelectedProductHome] = useState<ProductHome | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCluster, setFilterCluster] = useState("all");

  const [formData, setFormData] = useState<ProductHome>({
    id: "",
    productCode: "",
    productName: "",
    homeCluster: "",
    allowedLorongRange: [1, 10],
    allowedBarisRange: [1, 10],
    maxPalletPerLocation: 3,
    isActive: true,
  });

  const filteredProductHomes = productHomes.filter((ph) => {
    if (filterCluster !== "all" && ph.homeCluster !== filterCluster) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        ph.productCode.toLowerCase().includes(search) ||
        ph.productName.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const handleAdd = () => {
    setFormData({
      id: `ph-${Date.now()}`,
      productCode: "",
      productName: "",
      homeCluster: clusters[0]?.cluster || "A",
      allowedLorongRange: [1, 10],
      allowedBarisRange: [1, 10],
      maxPalletPerLocation: 3,
      isActive: true,
    });
    setShowAddModal(true);
  };

  const handleEdit = (productHome: ProductHome) => {
    setSelectedProductHome(productHome);
    setFormData({ ...productHome });
    setShowEditModal(true);
  };

  const handleDelete = (productHome: ProductHome) => {
    setSelectedProductHome(productHome);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (selectedProductHome) {
      onUpdate(productHomes.filter((ph) => ph.id !== selectedProductHome.id));
    }
    setShowDeleteModal(false);
    setSelectedProductHome(null);
  };

  const handleSubmitAdd = () => {
    if (!formData.productCode || !formData.homeCluster) {
      error("Product code dan home cluster harus diisi!");
      return;
    }
    onUpdate([...productHomes, formData]);
    setShowAddModal(false);
  };

  const handleSubmitEdit = () => {
    if (!formData.productCode || !formData.homeCluster) {
      error("Product code dan home cluster harus diisi!");
      return;
    }
    onUpdate(productHomes.map((ph) => (ph.id === selectedProductHome?.id ? formData : ph)));
    setShowEditModal(false);
    setSelectedProductHome(null);
  };

  const handleProductSelect = (productCode: string) => {
    const product = products.find((p) => p.productCode === productCode);
    if (product) {
      setFormData({
        ...formData,
        productCode: product.productCode,
        productName: product.productName,
      });
    }
  };

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Product Home Assignment</h2>
          <p className="text-sm text-gray-600 mt-1">
            Atur lokasi &quot;rumah&quot; produk: cluster, lorong, baris, dan kapasitas maksimal
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="px-4 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          <span className="text-lg">+</span>
          <span>Assign Product</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Search Product</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari kode atau nama produk..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Filter Cluster</label>
            <select
              value={filterCluster}
              onChange={(e) => setFilterCluster(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
            >
              <option value="all">Semua Cluster</option>
              {clusters.map((cluster) => (
                <option key={cluster.id} value={cluster.cluster}>
                  Cluster {cluster.cluster}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Product Homes Table */}
      <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-linear-to-r from-green-500 to-blue-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold">Product Code</th>
                <th className="px-6 py-4 text-left text-sm font-bold">Product Name</th>
                <th className="px-6 py-4 text-center text-sm font-bold">Home Cluster</th>
                <th className="px-6 py-4 text-center text-sm font-bold">Lorong Range</th>
                <th className="px-6 py-4 text-center text-sm font-bold">Baris Range</th>
                <th className="px-6 py-4 text-center text-sm font-bold">Max Pallet/Loc</th>
                <th className="px-6 py-4 text-center text-sm font-bold">Status</th>
                <th className="px-6 py-4 text-center text-sm font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProductHomes.map((ph) => (
                <tr key={ph.id} className="hover:bg-blue-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-gray-700">{ph.productCode}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-800">{ph.productName}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-bold">
                      {ph.homeCluster}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-semibold text-gray-700">
                      {ph.allowedLorongRange[0]} - {ph.allowedLorongRange[1]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-semibold text-gray-700">
                      {ph.allowedBarisRange[0]} - {ph.allowedBarisRange[1]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-bold">
                      {ph.maxPalletPerLocation}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        ph.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {ph.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handleEdit(ph)}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(ph)}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-all"
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

        {filteredProductHomes.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏠</div>
            <p className="text-gray-600 font-semibold mb-2">
              {searchTerm || filterCluster !== "all"
                ? "Tidak ada product home yang sesuai"
                : "Belum ada product home assignment"}
            </p>
            <p className="text-sm text-gray-500">
              {searchTerm || filterCluster !== "all"
                ? "Coba ubah filter pencarian"
                : 'Klik tombol "Assign Product" untuk memulai'}
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">
                {showAddModal ? "Assign Product Home" : "Edit Product Home"}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Product Selection */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <h4 className="font-semibold text-blue-900 mb-4">Product Information</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Select Product *
                    </label>
                    <select
                      value={formData.productCode}
                      onChange={(e) => handleProductSelect(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                      disabled={showEditModal}
                    >
                      <option value="">-- Pilih Produk --</option>
                      {products.map((product) => (
                        <option key={product.productCode} value={product.productCode}>
                          {product.productCode} - {product.productName}
                        </option>
                      ))}
                    </select>
                  </div>
                  {formData.productName && (
                    <div className="bg-white p-3 rounded-lg border border-blue-300">
                      <p className="text-sm text-gray-600">Selected Product:</p>
                      <p className="font-semibold text-gray-800">{formData.productName}</p>
                      <p className="text-xs text-gray-500 font-mono">{formData.productCode}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Home Cluster & Location Constraints */}
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <h4 className="font-semibold text-green-900 mb-4">Home Cluster & Location Rules</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Home Cluster *
                    </label>
                    <select
                      value={formData.homeCluster}
                      onChange={(e) => setFormData({ ...formData, homeCluster: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500"
                    >
                      {clusters.map((cluster) => (
                        <option key={cluster.id} value={cluster.cluster}>
                          Cluster {cluster.cluster} - {cluster.clusterName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Lorong Dari
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.allowedLorongRange[0]}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            allowedLorongRange: [
                              parseInt(e.target.value) || 1,
                              formData.allowedLorongRange[1],
                            ],
                          })
                        }
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Lorong Sampai
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.allowedLorongRange[1]}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            allowedLorongRange: [
                              formData.allowedLorongRange[0],
                              parseInt(e.target.value) || 1,
                            ],
                          })
                        }
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Baris Dari
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.allowedBarisRange[0]}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            allowedBarisRange: [
                              parseInt(e.target.value) || 1,
                              formData.allowedBarisRange[1],
                            ],
                          })
                        }
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Baris Sampai
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.allowedBarisRange[1]}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            allowedBarisRange: [
                              formData.allowedBarisRange[0],
                              parseInt(e.target.value) || 1,
                            ],
                          })
                        }
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Capacity Constraint */}
              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                <h4 className="font-semibold text-purple-900 mb-4">Capacity Constraint</h4>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Max Pallet per Location
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxPalletPerLocation}
                    onChange={(e) =>
                      setFormData({ ...formData, maxPalletPerLocation: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500"
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    Jumlah maksimal pallet yang boleh disimpan per lokasi (lorong-baris-level)
                  </p>
                </div>
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm font-semibold text-gray-700">
                  Product Home Active
                </label>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                }}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={showAddModal ? handleSubmitAdd : handleSubmitEdit}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700"
              >
                {showAddModal ? "Simpan" : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedProductHome && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Hapus Product Home?</h3>
              <p className="text-gray-600">
                Apakah Anda yakin ingin menghapus assignment untuk{" "}
                <strong>{selectedProductHome.productName}</strong>?
                <br />
                Produk ini akan kehilangan aturan lokasi &quot;rumah&quot;nya.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
