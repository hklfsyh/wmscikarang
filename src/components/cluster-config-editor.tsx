"use client";

import { useState } from "react";
import { type ClusterConfig } from "@/lib/mock/warehouse-config";
import { useToast, ToastContainer } from "./toast";

interface ClusterConfigEditorProps {
  clusters: ClusterConfig[];
  onUpdate: (clusters: ClusterConfig[]) => void;
}

export default function ClusterConfigEditor({ clusters, onUpdate }: ClusterConfigEditorProps) {
  const { toasts, removeToast, error } = useToast();
  const [selectedCluster, setSelectedCluster] = useState<ClusterConfig | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [formData, setFormData] = useState<ClusterConfig>({
    id: "",
    cluster: "",
    clusterName: "",
    defaultLorongCount: 10,
    defaultBarisCount: 10,
    defaultPalletPerSel: 3,
    customLorongConfig: [],
    customCellConfig: [],
    isActive: true,
  });

  const handleAdd = () => {
    setFormData({
      id: `cluster-${Date.now()}`,
      cluster: "",
      clusterName: "",
      defaultLorongCount: 10,
      defaultBarisCount: 10,
      defaultPalletPerSel: 3,
      customLorongConfig: [],
      customCellConfig: [],
      isActive: true,
    });
    setShowAddModal(true);
  };

  const handleEdit = (cluster: ClusterConfig) => {
    setSelectedCluster(cluster);
    setFormData({ ...cluster });
    setShowEditModal(true);
  };

  const handleDelete = (cluster: ClusterConfig) => {
    setSelectedCluster(cluster);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (selectedCluster) {
      onUpdate(clusters.filter((c) => c.id !== selectedCluster.id));
    }
    setShowDeleteModal(false);
    setSelectedCluster(null);
  };

  const handleSubmitAdd = () => {
    if (!formData.cluster || !formData.clusterName) {
      error("Cluster dan nama harus diisi!");
      return;
    }
    onUpdate([...clusters, formData]);
    setShowAddModal(false);
  };

  const handleSubmitEdit = () => {
    if (!formData.cluster || !formData.clusterName) {
      error("Cluster dan nama harus diisi!");
      return;
    }
    onUpdate(clusters.map((c) => (c.id === selectedCluster?.id ? formData : c)));
    setShowEditModal(false);
    setSelectedCluster(null);
  };

  const addCustomLorongConfig = () => {
    setFormData({
      ...formData,
      customLorongConfig: [
        ...(formData.customLorongConfig || []),
        { lorongRange: [1, 1], barisCount: formData.defaultBarisCount },
      ],
    });
  };

  const removeCustomLorongConfig = (index: number) => {
    setFormData({
      ...formData,
      customLorongConfig: formData.customLorongConfig?.filter((_, i) => i !== index),
    });
  };

  const addCustomCellConfig = () => {
    setFormData({
      ...formData,
      customCellConfig: [
        ...(formData.customCellConfig || []),
        { lorongRange: [1, 1], barisRange: [1, 1], palletPerSel: formData.defaultPalletPerSel },
      ],
    });
  };

  const removeCustomCellConfig = (index: number) => {
    setFormData({
      ...formData,
      customCellConfig: formData.customCellConfig?.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Cluster Configuration</h2>
          <p className="text-sm text-gray-600 mt-1">
            Kelola struktur gudang: jumlah lorong, baris, dan kapasitas pallet per sel
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          <span className="text-lg">+</span>
          <span>Tambah Cluster</span>
        </button>
      </div>

      {/* Cluster List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clusters.map((cluster) => (
          <div
            key={cluster.id}
            className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6 hover:shadow-xl transition-all"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                    <span className="text-white text-xl font-bold">{cluster.cluster}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{cluster.clusterName}</h3>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        cluster.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {cluster.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Default Lorong:</span>
                <span className="text-sm font-bold text-gray-800">{cluster.defaultLorongCount}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Default Baris:</span>
                <span className="text-sm font-bold text-gray-800">{cluster.defaultBarisCount}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Default Pallet/Sel:</span>
                <span className="text-sm font-bold text-gray-800">{cluster.defaultPalletPerSel}</span>
              </div>
              {cluster.customLorongConfig && cluster.customLorongConfig.length > 0 && (
                <div className="pt-2">
                  <span className="text-xs font-semibold text-blue-600">
                    ⚙️ {cluster.customLorongConfig.length} Custom Lorong Config
                  </span>
                </div>
              )}
              {cluster.customCellConfig && cluster.customCellConfig.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-purple-600">
                    ⚙️ {cluster.customCellConfig.length} Custom Cell Config
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(cluster)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all"
              >
                ✏️ Edit
              </button>
              <button
                onClick={() => handleDelete(cluster)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-all"
              >
                🗑️ Hapus
              </button>
            </div>
          </div>
        ))}
      </div>

      {clusters.length === 0 && (
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-gray-600 font-semibold mb-2">Belum ada cluster konfigurasi</p>
          <p className="text-sm text-gray-500">Klik tombol "Tambah Cluster" untuk memulai</p>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">Tambah Cluster Baru</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cluster (A, B, C, dll.) *
                  </label>
                  <input
                    type="text"
                    maxLength={1}
                    value={formData.cluster}
                    onChange={(e) => setFormData({ ...formData, cluster: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                    placeholder="A"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nama Cluster *
                  </label>
                  <input
                    type="text"
                    value={formData.clusterName}
                    onChange={(e) => setFormData({ ...formData, clusterName: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                    placeholder="Cluster A - Fast Moving"
                  />
                </div>
              </div>

              {/* Default Config */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <h4 className="font-semibold text-blue-900 mb-4">Default Configuration</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Jumlah Lorong
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.defaultLorongCount}
                      onChange={(e) =>
                        setFormData({ ...formData, defaultLorongCount: parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Jumlah Baris
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.defaultBarisCount}
                      onChange={(e) =>
                        setFormData({ ...formData, defaultBarisCount: parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Pallet per Sel
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.defaultPalletPerSel}
                      onChange={(e) =>
                        setFormData({ ...formData, defaultPalletPerSel: parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Custom Lorong Config */}
              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold text-purple-900">Custom Lorong Configuration</h4>
                  <button
                    onClick={addCustomLorongConfig}
                    className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700"
                  >
                    + Tambah
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.customLorongConfig?.map((config, index) => (
                    <div key={index} className="flex gap-3 items-center bg-white p-3 rounded-lg">
                      <div className="flex-1 grid grid-cols-4 gap-2">
                        <div>
                          <label className="text-xs text-gray-600">Lorong Dari</label>
                          <input
                            type="number"
                            min="1"
                            value={config.lorongRange[0]}
                            onChange={(e) => {
                              const newConfigs = [...(formData.customLorongConfig || [])];
                              newConfigs[index].lorongRange[0] = parseInt(e.target.value) || 1;
                              setFormData({ ...formData, customLorongConfig: newConfigs });
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Lorong Sampai</label>
                          <input
                            type="number"
                            min="1"
                            value={config.lorongRange[1]}
                            onChange={(e) => {
                              const newConfigs = [...(formData.customLorongConfig || [])];
                              newConfigs[index].lorongRange[1] = parseInt(e.target.value) || 1;
                              setFormData({ ...formData, customLorongConfig: newConfigs });
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Jumlah Baris</label>
                          <input
                            type="number"
                            min="1"
                            value={config.barisCount}
                            onChange={(e) => {
                              const newConfigs = [...(formData.customLorongConfig || [])];
                              newConfigs[index].barisCount = parseInt(e.target.value) || 1;
                              setFormData({ ...formData, customLorongConfig: newConfigs });
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Pallet/Sel (optional)</label>
                          <input
                            type="number"
                            min="1"
                            value={config.palletPerSel || ""}
                            placeholder="Default"
                            onChange={(e) => {
                              const newConfigs = [...(formData.customLorongConfig || [])];
                              newConfigs[index].palletPerSel = parseInt(e.target.value) || undefined;
                              setFormData({ ...formData, customLorongConfig: newConfigs });
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => removeCustomLorongConfig(index)}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {(!formData.customLorongConfig || formData.customLorongConfig.length === 0) && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      Belum ada custom lorong configuration
                    </p>
                  )}
                </div>
              </div>

              {/* Custom Cell Config */}
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold text-green-900">Custom Cell Configuration</h4>
                  <button
                    onClick={addCustomCellConfig}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700"
                  >
                    + Tambah
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.customCellConfig?.map((config, index) => (
                    <div key={index} className="flex gap-3 items-center bg-white p-3 rounded-lg">
                      <div className="flex-1 grid grid-cols-5 gap-2">
                        <div>
                          <label className="text-xs text-gray-600">Lorong Dari</label>
                          <input
                            type="number"
                            min="1"
                            value={config.lorongRange[0]}
                            onChange={(e) => {
                              const newConfigs = [...(formData.customCellConfig || [])];
                              newConfigs[index].lorongRange[0] = parseInt(e.target.value) || 1;
                              setFormData({ ...formData, customCellConfig: newConfigs });
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Lorong Sampai</label>
                          <input
                            type="number"
                            min="1"
                            value={config.lorongRange[1]}
                            onChange={(e) => {
                              const newConfigs = [...(formData.customCellConfig || [])];
                              newConfigs[index].lorongRange[1] = parseInt(e.target.value) || 1;
                              setFormData({ ...formData, customCellConfig: newConfigs });
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Baris Dari</label>
                          <input
                            type="number"
                            min="1"
                            value={config.barisRange[0]}
                            onChange={(e) => {
                              const newConfigs = [...(formData.customCellConfig || [])];
                              newConfigs[index].barisRange[0] = parseInt(e.target.value) || 1;
                              setFormData({ ...formData, customCellConfig: newConfigs });
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Baris Sampai</label>
                          <input
                            type="number"
                            min="1"
                            value={config.barisRange[1]}
                            onChange={(e) => {
                              const newConfigs = [...(formData.customCellConfig || [])];
                              newConfigs[index].barisRange[1] = parseInt(e.target.value) || 1;
                              setFormData({ ...formData, customCellConfig: newConfigs });
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Pallet/Sel</label>
                          <input
                            type="number"
                            min="1"
                            value={config.palletPerSel}
                            onChange={(e) => {
                              const newConfigs = [...(formData.customCellConfig || [])];
                              newConfigs[index].palletPerSel = parseInt(e.target.value) || 1;
                              setFormData({ ...formData, customCellConfig: newConfigs });
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => removeCustomCellConfig(index)}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {(!formData.customCellConfig || formData.customCellConfig.length === 0) && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      Belum ada custom cell configuration
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitAdd}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal (same as Add Modal but with different handler) */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">Edit Cluster</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Same form as Add Modal */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cluster (A, B, C, dll.) *
                  </label>
                  <input
                    type="text"
                    maxLength={1}
                    value={formData.cluster}
                    onChange={(e) => setFormData({ ...formData, cluster: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nama Cluster *
                  </label>
                  <input
                    type="text"
                    value={formData.clusterName}
                    onChange={(e) => setFormData({ ...formData, clusterName: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <h4 className="font-semibold text-blue-900 mb-4">Default Configuration</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Jumlah Lorong
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.defaultLorongCount}
                      onChange={(e) =>
                        setFormData({ ...formData, defaultLorongCount: parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Jumlah Baris
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.defaultBarisCount}
                      onChange={(e) =>
                        setFormData({ ...formData, defaultBarisCount: parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Pallet per Sel
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.defaultPalletPerSel}
                      onChange={(e) =>
                        setFormData({ ...formData, defaultPalletPerSel: parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Custom Lorong Config */}
              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold text-purple-900">Custom Lorong Configuration</h4>
                  <button
                    onClick={addCustomLorongConfig}
                    className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700"
                  >
                    + Tambah
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.customLorongConfig?.map((config, index) => (
                    <div key={index} className="flex gap-3 items-center bg-white p-3 rounded-lg">
                      <div className="flex-1 grid grid-cols-4 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Lorong Start
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={config.lorongRange[0]}
                            onChange={(e) => {
                              const updated = [...(formData.customLorongConfig || [])];
                              updated[index] = {
                                ...updated[index],
                                lorongRange: [parseInt(e.target.value) || 1, config.lorongRange[1]],
                              };
                              setFormData({ ...formData, customLorongConfig: updated });
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Lorong End
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={config.lorongRange[1]}
                            onChange={(e) => {
                              const updated = [...(formData.customLorongConfig || [])];
                              updated[index] = {
                                ...updated[index],
                                lorongRange: [config.lorongRange[0], parseInt(e.target.value) || 1],
                              };
                              setFormData({ ...formData, customLorongConfig: updated });
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Jumlah Baris
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={config.barisCount}
                            onChange={(e) => {
                              const updated = [...(formData.customLorongConfig || [])];
                              updated[index] = {
                                ...updated[index],
                                barisCount: parseInt(e.target.value) || 1,
                              };
                              setFormData({ ...formData, customLorongConfig: updated });
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Pallet/Sel
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={config.palletPerSel || formData.defaultPalletPerSel}
                            onChange={(e) => {
                              const updated = [...(formData.customLorongConfig || [])];
                              updated[index] = {
                                ...updated[index],
                                palletPerSel: parseInt(e.target.value) || 1,
                              };
                              setFormData({ ...formData, customLorongConfig: updated });
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => removeCustomLorongConfig(index)}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {(!formData.customLorongConfig || formData.customLorongConfig.length === 0) && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      Belum ada custom lorong configuration
                    </p>
                  )}
                </div>
              </div>

              {/* Custom Cell Config */}
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold text-green-900">Custom Cell Configuration</h4>
                  <button
                    onClick={addCustomCellConfig}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700"
                  >
                    + Tambah
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.customCellConfig?.map((config, index) => (
                    <div key={index} className="flex gap-3 items-center bg-white p-3 rounded-lg">
                      <div className="flex-1 grid grid-cols-5 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Lorong Start
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={config.lorongRange[0]}
                            onChange={(e) => {
                              const updated = [...(formData.customCellConfig || [])];
                              updated[index] = {
                                ...updated[index],
                                lorongRange: [parseInt(e.target.value) || 1, config.lorongRange[1]],
                              };
                              setFormData({ ...formData, customCellConfig: updated });
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Lorong End
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={config.lorongRange[1]}
                            onChange={(e) => {
                              const updated = [...(formData.customCellConfig || [])];
                              updated[index] = {
                                ...updated[index],
                                lorongRange: [config.lorongRange[0], parseInt(e.target.value) || 1],
                              };
                              setFormData({ ...formData, customCellConfig: updated });
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Baris Start
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={config.barisRange[0]}
                            onChange={(e) => {
                              const updated = [...(formData.customCellConfig || [])];
                              updated[index] = {
                                ...updated[index],
                                barisRange: [parseInt(e.target.value) || 1, config.barisRange[1]],
                              };
                              setFormData({ ...formData, customCellConfig: updated });
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Baris End
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={config.barisRange[1]}
                            onChange={(e) => {
                              const updated = [...(formData.customCellConfig || [])];
                              updated[index] = {
                                ...updated[index],
                                barisRange: [config.barisRange[0], parseInt(e.target.value) || 1],
                              };
                              setFormData({ ...formData, customCellConfig: updated });
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Pallet/Sel
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={config.palletPerSel}
                            onChange={(e) => {
                              const updated = [...(formData.customCellConfig || [])];
                              updated[index] = {
                                ...updated[index],
                                palletPerSel: parseInt(e.target.value) || 1,
                              };
                              setFormData({ ...formData, customCellConfig: updated });
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => removeCustomCellConfig(index)}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {(!formData.customCellConfig || formData.customCellConfig.length === 0) && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      Belum ada custom cell configuration
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitEdit}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedCluster && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Hapus Cluster?</h3>
              <p className="text-gray-600">
                Apakah Anda yakin ingin menghapus <strong>{selectedCluster.clusterName}</strong>?
                <br />
                Tindakan ini tidak dapat dibatalkan.
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
