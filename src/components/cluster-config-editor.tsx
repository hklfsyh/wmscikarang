"use client";

import { useState } from "react";
import { type ClusterConfig, type ClusterCellOverride } from "@/lib/mock/warehouse-config";
import { useToast, ToastContainer } from "./toast";
import { Save, Plus, Trash2, Edit2, X } from "lucide-react";

interface ClusterConfigEditorProps {
  clusters: ClusterConfig[];
  onUpdate: (clusters: ClusterConfig[]) => void;
  cellOverrides: ClusterCellOverride[];
  onUpdateOverrides: (overrides: ClusterCellOverride[]) => void;
}

export default function ClusterConfigEditor({ clusters, onUpdate, cellOverrides, onUpdateOverrides }: ClusterConfigEditorProps) {
  const { toasts, removeToast, success, error } = useToast();
  const [selectedCluster, setSelectedCluster] = useState<ClusterConfig | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<ClusterConfig | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [formData, setFormData] = useState<ClusterConfig>({
    id: "",
    warehouseId: "wh-001-cikarang",
    clusterChar: "",
    clusterName: "",
    defaultLorongCount: 10,
    defaultBarisCount: 10,
    defaultPalletLevel: 3,
    description: "",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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

    if (!editData.clusterChar || !editData.clusterName) {
      error("Cluster dan nama harus diisi!");
      return;
    }

    onUpdate(clusters.map((c) => (c.id === selectedCluster?.id ? editData : c)));
    success("Konfigurasi cluster berhasil diupdate!");

    setSelectedCluster(editData);
    setEditMode(false);
    setEditData(null);
  };

  const handleAdd = () => {
    setFormData({
      id: `cluster-${Date.now()}`,
      warehouseId: "wh-001-cikarang",
      clusterChar: "",
      clusterName: "",
      defaultLorongCount: 10,
      defaultBarisCount: 10,
      defaultPalletLevel: 3,
      description: "",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setShowAddModal(true);
  };

  const handleSubmitAdd = () => {
    if (!formData.clusterChar || !formData.clusterName) {
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

  // Helper function to get overrides for current cluster
  const getClusterOverrides = (clusterId: string) => {
    return cellOverrides.filter(override => override.clusterConfigId === clusterId);
  };

  // Handler untuk cell overrides
  const handleAddCellOverride = () => {
    if (!selectedCluster) return;

    const newOverride: ClusterCellOverride = {
      id: `cco-${Date.now()}`,
      clusterConfigId: selectedCluster.id,
      lorongStart: 1,
      lorongEnd: 1,
      barisStart: null,
      barisEnd: null,
      customBarisCount: null,
      customPalletLevel: null,
      isTransitArea: false,
      isDisabled: false,
      note: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onUpdateOverrides([...cellOverrides, newOverride]);
  };

  const handleUpdateCellOverride = (overrideId: string, field: string, value: string | number | boolean | null) => {
    const updated = cellOverrides.map(override =>
      override.id === overrideId
        ? { ...override, [field]: value, updatedAt: new Date().toISOString() }
        : override
    );
    onUpdateOverrides(updated);
  };

  const handleRemoveCellOverride = (overrideId: string) => {
    onUpdateOverrides(cellOverrides.filter(override => override.id !== overrideId));
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
                      {cluster.clusterChar}
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
                      Cluster {displayCluster.clusterChar}
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
                        value={editData?.clusterChar || ""}
                        onChange={(e) => setEditData({ ...editData!, clusterChar: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                      />
                    ) : (
                      <div className="text-2xl font-bold text-slate-800">{displayCluster.clusterChar}</div>
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
                          value={editData?.defaultPalletLevel || 0}
                          onChange={(e) => setEditData({ ...editData!, defaultPalletLevel: parseInt(e.target.value) || 0 })}
                          className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                        />
                      ) : (
                        <div className="text-xl font-bold text-slate-800">{displayCluster.defaultPalletLevel}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cell Overrides */}
                <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold text-purple-900">Cell Overrides</h4>
                    {editMode && (
                      <button
                        onClick={handleAddCellOverride}
                        className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Tambah Override</span>
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {getClusterOverrides(displayCluster?.id || "").map((override) => (
                      <div key={override.id} className="bg-white p-3 rounded-lg border border-purple-200">
                        {editMode ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-slate-600">Lorong Start</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={override.lorongStart}
                                  onChange={(e) => handleUpdateCellOverride(override.id, "lorongStart", parseInt(e.target.value) || 1)}
                                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-slate-600">Lorong End</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={override.lorongEnd}
                                  onChange={(e) => handleUpdateCellOverride(override.id, "lorongEnd", parseInt(e.target.value) || 1)}
                                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-slate-600">Baris Start (NULL = semua)</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={override.barisStart || ""}
                                  placeholder="Kosongkan untuk semua baris"
                                  onChange={(e) => handleUpdateCellOverride(override.id, "barisStart", e.target.value ? parseInt(e.target.value) : null)}
                                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-slate-600">Baris End (NULL = semua)</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={override.barisEnd || ""}
                                  placeholder="Kosongkan untuk semua baris"
                                  onChange={(e) => handleUpdateCellOverride(override.id, "barisEnd", e.target.value ? parseInt(e.target.value) : null)}
                                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-slate-600">Custom Baris Count (NULL = default)</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={override.customBarisCount || ""}
                                  placeholder="Kosongkan untuk default"
                                  onChange={(e) => handleUpdateCellOverride(override.id, "customBarisCount", e.target.value ? parseInt(e.target.value) : null)}
                                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-slate-600">Custom Pallet Level (NULL = default)</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={override.customPalletLevel || ""}
                                  placeholder="Kosongkan untuk default"
                                  onChange={(e) => handleUpdateCellOverride(override.id, "customPalletLevel", e.target.value ? parseInt(e.target.value) : null)}
                                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-slate-600">Area Transit</label>
                                <select
                                  value={override.isTransitArea ? "true" : "false"}
                                  onChange={(e) => handleUpdateCellOverride(override.id, "isTransitArea", e.target.value === "true")}
                                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                                >
                                  <option value="false">Tidak</option>
                                  <option value="true">Ya</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-xs text-slate-600">Disabled</label>
                                <select
                                  value={override.isDisabled ? "true" : "false"}
                                  onChange={(e) => handleUpdateCellOverride(override.id, "isDisabled", e.target.value === "true")}
                                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                                >
                                  <option value="false">Tidak</option>
                                  <option value="true">Ya</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="text-xs text-slate-600">Catatan</label>
                              <textarea
                                value={override.note}
                                onChange={(e) => handleUpdateCellOverride(override.id, "note", e.target.value)}
                                placeholder="Alasan override..."
                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                                rows={2}
                              />
                            </div>
                            <div className="flex justify-end">
                              <button
                                onClick={() => handleRemoveCellOverride(override.id)}
                                className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-slate-700 space-y-1">
                            <div className="font-semibold">
                              Lorong {override.lorongStart}-{override.lorongEnd}
                              {override.barisStart && override.barisEnd && `, Baris ${override.barisStart}-${override.barisEnd}`}
                              {!override.barisStart && !override.barisEnd && ", Semua Baris"}
                            </div>
                            <div className="flex gap-4 text-xs">
                              {override.customBarisCount && <span>Baris: {override.customBarisCount}</span>}
                              {override.customPalletLevel && <span>Pallet: {override.customPalletLevel}</span>}
                              {override.isTransitArea && <span className="text-orange-600 font-semibold">TRANSIT AREA</span>}
                              {override.isDisabled && <span className="text-red-600 font-semibold">DISABLED</span>}
                            </div>
                            {override.note && <div className="text-xs text-slate-500 italic">{override.note}</div>}
                          </div>
                        )}
                      </div>
                    ))}
                    {getClusterOverrides(displayCluster?.id || "").length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-2">
                        Belum ada cell overrides untuk cluster ini
                      </p>
                    )}
                  </div>
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
                    value={formData.clusterChar}
                    onChange={(e) => setFormData({ ...formData, clusterChar: e.target.value.toUpperCase() })}
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
                      value={formData.defaultPalletLevel}
                      onChange={(e) =>
                        setFormData({ ...formData, defaultPalletLevel: parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                    />
                  </div>
                </div>
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