"use client";

import { useState } from "react";
import { type ClusterConfig } from "@/lib/mock/warehouse-config";
import { useToast, ToastContainer } from "./toast";
import { Save, Plus, Trash2, Edit2, X } from "lucide-react";

interface ClusterConfigEditorProps {
  clusters: ClusterConfig[];
  onUpdate: (clusters: ClusterConfig[]) => void;
}

export default function ClusterConfigEditor({ clusters, onUpdate }: ClusterConfigEditorProps) {
  const { toasts, removeToast, success, error } = useToast();
  const [selectedCluster, setSelectedCluster] = useState<ClusterConfig | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<ClusterConfig | null>(null);
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

  // Handler untuk select cluster
  const handleSelectCluster = (cluster: ClusterConfig) => {
    setSelectedCluster(cluster);
    setEditMode(false);
    setEditData(null);
  };

  // Handler untuk edit cluster
  const handleEditCluster = () => {
    if (!selectedCluster) return;
    setEditData(JSON.parse(JSON.stringify(selectedCluster))); // Deep clone
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditData(null);
  };

  const handleSaveEdit = () => {
    if (!editData) return;
    
    if (!editData.cluster || !editData.clusterName) {
      error("Cluster dan nama harus diisi!");
      return;
    }

    onUpdate(clusters.map((c) => (c.id === selectedCluster?.id ? editData : c)));
    success("Konfigurasi cluster berhasil diupdate!");
    
    setSelectedCluster(editData);
    setEditMode(false);
    setEditData(null);
  };

  // Handler untuk add cluster
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

  const handleSubmitAdd = () => {
    if (!formData.cluster || !formData.clusterName) {
      error("Cluster dan nama harus diisi!");
      return;
    }
    onUpdate([...clusters, formData]);
    success("Cluster baru berhasil ditambahkan!");
    setShowAddModal(false);
  };

  // Handler untuk delete cluster
  const handleDelete = () => {
    if (!selectedCluster) return;
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (selectedCluster) {
      onUpdate(clusters.filter((c) => c.id !== selectedCluster.id));
      success("Cluster berhasil dihapus!");
      setSelectedCluster(null);
    }
    setShowDeleteModal(false);
  };

  // Handler untuk custom lorong config
  const handleAddCustomLorong = () => {
    if (!editData) return;
    
    setEditData({
      ...editData,
      customLorongConfig: [
        ...(editData.customLorongConfig || []),
        { lorongRange: [1, 1], barisCount: editData.defaultBarisCount },
      ],
    });
  };

  const handleRemoveCustomLorong = (index: number) => {
    if (!editData) return;
    
    const updated = [...(editData.customLorongConfig || [])];
    updated.splice(index, 1);
    
    setEditData({
      ...editData,
      customLorongConfig: updated,
    });
  };

  const handleUpdateCustomLorong = (index: number, field: string, value: any) => {
    if (!editData) return;
    
    const updated = [...(editData.customLorongConfig || [])];
    if (field === "lorongStart") {
      updated[index].lorongRange[0] = value;
    } else if (field === "lorongEnd") {
      updated[index].lorongRange[1] = value;
    } else if (field === "barisCount") {
      updated[index].barisCount = value;
    } else if (field === "palletPerSel") {
      updated[index].palletPerSel = value;
    }
    
    setEditData({
      ...editData,
      customLorongConfig: updated,
    });
  };

  // Handler untuk custom cell config
  const handleAddCustomCell = () => {
    if (!editData) return;
    
    setEditData({
      ...editData,
      customCellConfig: [
        ...(editData.customCellConfig || []),
        { lorongRange: [1, 1], barisRange: [1, 1], palletPerSel: editData.defaultPalletPerSel },
      ],
    });
  };

  const handleRemoveCustomCell = (index: number) => {
    if (!editData) return;
    
    const updated = [...(editData.customCellConfig || [])];
    updated.splice(index, 1);
    
    setEditData({
      ...editData,
      customCellConfig: updated,
    });
  };

  const handleUpdateCustomCell = (index: number, field: string, value: any) => {
    if (!editData) return;
    
    const updated = [...(editData.customCellConfig || [])];
    if (field === "lorongStart") {
      updated[index].lorongRange[0] = value;
    } else if (field === "lorongEnd") {
      updated[index].lorongRange[1] = value;
    } else if (field === "barisStart") {
      updated[index].barisRange[0] = value;
    } else if (field === "barisEnd") {
      updated[index].barisRange[1] = value;
    } else if (field === "palletPerSel") {
      updated[index].palletPerSel = value;
    }
    
    setEditData({
      ...editData,
      customCellConfig: updated,
    });
  };

  // Handler untuk add modal custom config
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

  const displayCluster = editMode ? editData : selectedCluster;

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Konfigurasi Cluster</h2>
          <p className="text-slate-600 mt-1">
            Kelola struktur warehouse: Lorong, Baris, dan Kapasitas Pallet per Cluster
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span>Tambah Cluster</span>
        </button>
      </div>

      {/* 2-Column Layout: List & Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Cluster List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Daftar Cluster</h3>
            
            <div className="space-y-2">
              {clusters.filter(c => c.isActive).map((cluster) => (
                <button
                  key={cluster.id}
                  onClick={() => handleSelectCluster(cluster)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selectedCluster?.id === cluster.id
                      ? "border-blue-500 bg-blue-50 shadow-md"
                      : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-blue-500 text-white flex items-center justify-center font-bold text-lg">
                      {cluster.cluster}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-800">{cluster.clusterName}</h4>
                      <p className="text-xs text-slate-500">
                        {cluster.defaultLorongCount} Lorong × {cluster.defaultBarisCount} Baris
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {clusters.filter(c => c.isActive).length === 0 && (
              <div className="text-center py-8">
                <p className="text-slate-500 text-sm">Belum ada cluster</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Cluster Detail & Edit */}
        <div className="lg:col-span-2">
          {!displayCluster ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-semibold text-slate-600 mb-2">
                Pilih Cluster
              </h3>
              <p className="text-slate-500">
                Pilih cluster dari daftar untuk melihat atau mengedit konfigurasinya
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">
                      Cluster {displayCluster.cluster}
                    </h2>
                    <p className="text-blue-100">{displayCluster.clusterName}</p>
                  </div>
                  <div className="flex gap-2">
                    {!editMode ? (
                      <>
                        <button
                          onClick={handleEditCluster}
                          className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2 transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={handleDelete}
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg flex items-center gap-2 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Hapus</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handleSaveEdit}
                          className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg flex items-center gap-2 transition-all"
                        >
                          <Save className="w-4 h-4" />
                          <span>Simpan</span>
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2 transition-all"
                        >
                          <X className="w-4 h-4" />
                          <span>Batal</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Cluster (Huruf)
                    </label>
                    {editMode ? (
                      <input
                        type="text"
                        maxLength={1}
                        value={editData?.cluster || ""}
                        onChange={(e) => setEditData({ ...editData!, cluster: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                      />
                    ) : (
                      <div className="text-2xl font-bold text-slate-800">{displayCluster.cluster}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Nama Cluster
                    </label>
                    {editMode ? (
                      <input
                        type="text"
                        value={editData?.clusterName || ""}
                        onChange={(e) => setEditData({ ...editData!, clusterName: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                      />
                    ) : (
                      <div className="text-2xl font-bold text-slate-800">{displayCluster.clusterName}</div>
                    )}
                  </div>
                </div>

                {/* Default Configuration */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <h4 className="font-semibold text-blue-900 mb-4">Default Configuration</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Jumlah Lorong
                      </label>
                      {editMode ? (
                        <input
                          type="number"
                          min="1"
                          value={editData?.defaultLorongCount || 0}
                          onChange={(e) => setEditData({ ...editData!, defaultLorongCount: parseInt(e.target.value) || 0 })}
                          className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                        />
                      ) : (
                        <div className="text-xl font-bold text-slate-800">{displayCluster.defaultLorongCount}</div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Jumlah Baris
                      </label>
                      {editMode ? (
                        <input
                          type="number"
                          min="1"
                          value={editData?.defaultBarisCount || 0}
                          onChange={(e) => setEditData({ ...editData!, defaultBarisCount: parseInt(e.target.value) || 0 })}
                          className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                        />
                      ) : (
                        <div className="text-xl font-bold text-slate-800">{displayCluster.defaultBarisCount}</div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Pallet per Sel
                      </label>
                      {editMode ? (
                        <input
                          type="number"
                          min="1"
                          value={editData?.defaultPalletPerSel || 0}
                          onChange={(e) => setEditData({ ...editData!, defaultPalletPerSel: parseInt(e.target.value) || 0 })}
                          className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                        />
                      ) : (
                        <div className="text-xl font-bold text-slate-800">{displayCluster.defaultPalletPerSel}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Custom Lorong Config */}
                <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold text-purple-900">Custom Lorong Configuration</h4>
                    {editMode && (
                      <button
                        onClick={handleAddCustomLorong}
                        className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Tambah</span>
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {(displayCluster.customLorongConfig || []).map((config, index) => (
                      <div key={index} className="bg-white p-3 rounded-lg border border-purple-200">
                        {editMode ? (
                          <div className="flex gap-3 items-center">
                            <div className="flex-1 grid grid-cols-4 gap-2">
                              <div>
                                <label className="text-xs text-slate-600">Lorong Dari</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={config.lorongRange[0]}
                                  onChange={(e) => handleUpdateCustomLorong(index, "lorongStart", parseInt(e.target.value) || 1)}
                                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-slate-600">Lorong Sampai</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={config.lorongRange[1]}
                                  onChange={(e) => handleUpdateCustomLorong(index, "lorongEnd", parseInt(e.target.value) || 1)}
                                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-slate-600">Jumlah Baris</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={config.barisCount}
                                  onChange={(e) => handleUpdateCustomLorong(index, "barisCount", parseInt(e.target.value) || 1)}
                                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-slate-600">Pallet/Sel</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={config.palletPerSel || displayCluster.defaultPalletPerSel}
                                  onChange={(e) => handleUpdateCustomLorong(index, "palletPerSel", parseInt(e.target.value) || 1)}
                                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                                />
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveCustomLorong(index)}
                              className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="text-sm text-slate-700">
                            <span className="font-semibold">Lorong {config.lorongRange[0]}-{config.lorongRange[1]}</span>
                            {": "}
                            <span>{config.barisCount} Baris</span>
                            {config.palletPerSel && <span>, {config.palletPerSel} Pallet/Sel</span>}
                          </div>
                        )}
                      </div>
                    ))}
                    {(!displayCluster.customLorongConfig || displayCluster.customLorongConfig.length === 0) && (
                      <p className="text-sm text-slate-500 text-center py-2">
                        Belum ada custom lorong configuration
                      </p>
                    )}
                  </div>
                </div>

                {/* Custom Cell Config */}
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold text-green-900">Custom Cell Configuration</h4>
                    {editMode && (
                      <button
                        onClick={handleAddCustomCell}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Tambah</span>
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {(displayCluster.customCellConfig || []).map((config, index) => (
                      <div key={index} className="bg-white p-3 rounded-lg border border-green-200">
                        {editMode ? (
                          <div className="flex gap-3 items-center">
                            <div className="flex-1 grid grid-cols-5 gap-2">
                              <div>
                                <label className="text-xs text-slate-600">Lorong Dari</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={config.lorongRange[0]}
                                  onChange={(e) => handleUpdateCustomCell(index, "lorongStart", parseInt(e.target.value) || 1)}
                                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-slate-600">Lorong Sampai</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={config.lorongRange[1]}
                                  onChange={(e) => handleUpdateCustomCell(index, "lorongEnd", parseInt(e.target.value) || 1)}
                                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-slate-600">Baris Dari</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={config.barisRange[0]}
                                  onChange={(e) => handleUpdateCustomCell(index, "barisStart", parseInt(e.target.value) || 1)}
                                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-slate-600">Baris Sampai</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={config.barisRange[1]}
                                  onChange={(e) => handleUpdateCustomCell(index, "barisEnd", parseInt(e.target.value) || 1)}
                                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-slate-600">Pallet/Sel</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={config.palletPerSel}
                                  onChange={(e) => handleUpdateCustomCell(index, "palletPerSel", parseInt(e.target.value) || 1)}
                                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                                />
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveCustomCell(index)}
                              className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="text-sm text-slate-700">
                            <span className="font-semibold">
                              Lorong {config.lorongRange[0]}-{config.lorongRange[1]}, 
                              Baris {config.barisRange[0]}-{config.barisRange[1]}
                            </span>
                            {": "}
                            <span>{config.palletPerSel} Pallet/Sel</span>
                          </div>
                        )}
                      </div>
                    ))}
                    {(!displayCluster.customCellConfig || displayCluster.customCellConfig.length === 0) && (
                      <p className="text-sm text-slate-500 text-center py-2">
                        Belum ada custom cell configuration
                      </p>
                    )}
                  </div>
                </div>

                {/* In Transit Area */}
                <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                  <h4 className="font-semibold text-orange-900 mb-3">
                    In Transit Area Configuration
                  </h4>
                  <p className="text-xs text-orange-700 mb-3">
                    Area In Transit adalah zona buffer/overflow untuk produk yang tidak muat di lokasi home-nya.
                  </p>
                  {editMode ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Lorong Start (In Transit)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={editData?.inTransitLorongRange?.[0] || ""}
                          placeholder="Kosongkan jika tidak ada"
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (isNaN(val) || val === 0) {
                              const { inTransitLorongRange: _, ...rest } = editData!;
                              setEditData(rest as ClusterConfig);
                            } else {
                              setEditData({
                                ...editData!,
                                inTransitLorongRange: [val, editData?.inTransitLorongRange?.[1] || val] as [number, number],
                              });
                            }
                          }}
                          className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Lorong End (In Transit)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={editData?.inTransitLorongRange?.[1] || ""}
                          placeholder="Kosongkan jika tidak ada"
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (isNaN(val) || val === 0) {
                              const { inTransitLorongRange: _, ...rest } = editData!;
                              setEditData(rest as ClusterConfig);
                            } else {
                              setEditData({
                                ...editData!,
                                inTransitLorongRange: [editData?.inTransitLorongRange?.[0] || val, val] as [number, number],
                              });
                            }
                          }}
                          className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      {displayCluster.inTransitLorongRange && displayCluster.inTransitLorongRange[0] > 0 ? (
                        <div className="p-3 bg-orange-100 border border-orange-300 rounded-lg">
                          <p className="text-sm font-semibold text-orange-900">
                            ✅ In Transit Area: Lorong {displayCluster.inTransitLorongRange[0]} - {displayCluster.inTransitLorongRange[1]}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">Tidak ada area in transit</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">Tambah Cluster Baru</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-slate-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Cluster (A, B, C, dll.) *
                  </label>
                  <input
                    type="text"
                    maxLength={1}
                    value={formData.cluster}
                    onChange={(e) => setFormData({ ...formData, cluster: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                    placeholder="A"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Nama Cluster *
                  </label>
                  <input
                    type="text"
                    value={formData.clusterName}
                    onChange={(e) => setFormData({ ...formData, clusterName: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                    placeholder="Cluster A - Fast Moving"
                  />
                </div>
              </div>

              {/* Default Config */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <h4 className="font-semibold text-blue-900 mb-4">Default Configuration</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Jumlah Lorong
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.defaultLorongCount}
                      onChange={(e) =>
                        setFormData({ ...formData, defaultLorongCount: parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Jumlah Baris
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.defaultBarisCount}
                      onChange={(e) =>
                        setFormData({ ...formData, defaultBarisCount: parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Pallet per Sel
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.defaultPalletPerSel}
                      onChange={(e) =>
                        setFormData({ ...formData, defaultPalletPerSel: parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
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
                          <label className="text-xs text-slate-600">Lorong Dari</label>
                          <input
                            type="number"
                            min="1"
                            value={config.lorongRange[0]}
                            onChange={(e) => {
                              const newConfigs = [...(formData.customLorongConfig || [])];
                              newConfigs[index].lorongRange[0] = parseInt(e.target.value) || 1;
                              setFormData({ ...formData, customLorongConfig: newConfigs });
                            }}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-600">Lorong Sampai</label>
                          <input
                            type="number"
                            min="1"
                            value={config.lorongRange[1]}
                            onChange={(e) => {
                              const newConfigs = [...(formData.customLorongConfig || [])];
                              newConfigs[index].lorongRange[1] = parseInt(e.target.value) || 1;
                              setFormData({ ...formData, customLorongConfig: newConfigs });
                            }}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-600">Jumlah Baris</label>
                          <input
                            type="number"
                            min="1"
                            value={config.barisCount}
                            onChange={(e) => {
                              const newConfigs = [...(formData.customLorongConfig || [])];
                              newConfigs[index].barisCount = parseInt(e.target.value) || 1;
                              setFormData({ ...formData, customLorongConfig: newConfigs });
                            }}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-600">Pallet/Sel (optional)</label>
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
                            className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
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
                    <p className="text-sm text-slate-500 text-center py-2">
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
                          <label className="text-xs text-slate-600">Lorong Dari</label>
                          <input
                            type="number"
                            min="1"
                            value={config.lorongRange[0]}
                            onChange={(e) => {
                              const newConfigs = [...(formData.customCellConfig || [])];
                              newConfigs[index].lorongRange[0] = parseInt(e.target.value) || 1;
                              setFormData({ ...formData, customCellConfig: newConfigs });
                            }}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-600">Lorong Sampai</label>
                          <input
                            type="number"
                            min="1"
                            value={config.lorongRange[1]}
                            onChange={(e) => {
                              const newConfigs = [...(formData.customCellConfig || [])];
                              newConfigs[index].lorongRange[1] = parseInt(e.target.value) || 1;
                              setFormData({ ...formData, customCellConfig: newConfigs });
                            }}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-600">Baris Dari</label>
                          <input
                            type="number"
                            min="1"
                            value={config.barisRange[0]}
                            onChange={(e) => {
                              const newConfigs = [...(formData.customCellConfig || [])];
                              newConfigs[index].barisRange[0] = parseInt(e.target.value) || 1;
                              setFormData({ ...formData, customCellConfig: newConfigs });
                            }}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-600">Baris Sampai</label>
                          <input
                            type="number"
                            min="1"
                            value={config.barisRange[1]}
                            onChange={(e) => {
                              const newConfigs = [...(formData.customCellConfig || [])];
                              newConfigs[index].barisRange[1] = parseInt(e.target.value) || 1;
                              setFormData({ ...formData, customCellConfig: newConfigs });
                            }}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-600">Pallet/Sel</label>
                          <input
                            type="number"
                            min="1"
                            value={config.palletPerSel}
                            onChange={(e) => {
                              const newConfigs = [...(formData.customCellConfig || [])];
                              newConfigs[index].palletPerSel = parseInt(e.target.value) || 1;
                              setFormData({ ...formData, customCellConfig: newConfigs });
                            }}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
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
                    <p className="text-sm text-slate-500 text-center py-2">
                      Belum ada custom cell configuration
                    </p>
                  )}
                </div>
              </div>

              {/* In Transit Area */}
              <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                <h4 className="font-semibold text-orange-900 mb-3">
                  In Transit Area Configuration (Opsional)
                </h4>
                <p className="text-xs text-orange-700 mb-3">
                  Area In Transit adalah zona buffer/overflow untuk produk yang tidak muat di lokasi home-nya.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Lorong Start (In Transit)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.inTransitLorongRange?.[0] || ""}
                      placeholder="Kosongkan jika tidak ada"
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (isNaN(val) || val === 0) {
                          const { inTransitLorongRange: _, ...rest } = formData;
                          setFormData(rest);
                        } else {
                          setFormData({
                            ...formData,
                            inTransitLorongRange: [val, formData.inTransitLorongRange?.[1] || val] as [number, number],
                          });
                        }
                      }}
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Lorong End (In Transit)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.inTransitLorongRange?.[1] || ""}
                      placeholder="Kosongkan jika tidak ada"
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (isNaN(val) || val === 0) {
                          const { inTransitLorongRange: _, ...rest } = formData;
                          setFormData(rest);
                        } else {
                          setFormData({
                            ...formData,
                            inTransitLorongRange: [formData.inTransitLorongRange?.[0] || val, val] as [number, number],
                          });
                        }
                      }}
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500"
                    />
                  </div>
                </div>
                {formData.inTransitLorongRange && formData.inTransitLorongRange[0] > 0 && (
                  <div className="mt-3 p-3 bg-orange-100 border border-orange-300 rounded-lg">
                    <p className="text-sm font-semibold text-orange-900">
                      ✅ In Transit Area: Lorong {formData.inTransitLorongRange[0]} - {formData.inTransitLorongRange[1]}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50"
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedCluster && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Hapus Cluster?</h3>
              <p className="text-slate-600">
                Apakah Anda yakin ingin menghapus <strong>{selectedCluster.clusterName}</strong>?
                <br />
                Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50"
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
