"use client";

import { useState } from "react";
import { Navigation } from "@/components/navigation";
import { 
  clusterConfigs, 
  type ClusterConfig,
  type CustomLorongConfig,
  type CustomCellConfig,
} from "@/lib/mock/warehouse-config";
import { useToast, ToastContainer } from "@/components/toast";
import { Save, Plus, Trash2, Edit2, X } from "lucide-react";

export default function ClusterConfigPage() {
  const { toasts, removeToast, success } = useToast();
  const [selectedCluster, setSelectedCluster] = useState<ClusterConfig | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<ClusterConfig | null>(null);

  const handleSelectCluster = (cluster: ClusterConfig) => {
    setSelectedCluster(cluster);
    setEditMode(false);
    setEditData(null);
  };

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
    
    // In real app, this would call API to update
    success("Konfigurasi cluster berhasil disimpan!");
    
    // Update local state
    setSelectedCluster(editData);
    setEditMode(false);
    setEditData(null);
  };

  const handleAddCustomLorong = () => {
    if (!editData) return;
    
    const newCustomLorong: CustomLorongConfig = {
      lorongRange: [1, 1],
      barisCount: editData.defaultBarisCount,
      palletPerSel: editData.defaultPalletPerSel,
    };
    
    setEditData({
      ...editData,
      customLorongConfig: [...(editData.customLorongConfig || []), newCustomLorong],
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

  const handleUpdateCustomLorong = (index: number, field: keyof CustomLorongConfig, value: any) => {
    if (!editData) return;
    
    const updated = [...(editData.customLorongConfig || [])];
    updated[index] = { ...updated[index], [field]: value };
    
    setEditData({
      ...editData,
      customLorongConfig: updated,
    });
  };

  const handleAddCustomCell = () => {
    if (!editData) return;
    
    const newCustomCell: CustomCellConfig = {
      lorongRange: [1, 1],
      barisRange: [1, 1],
      palletPerSel: editData.defaultPalletPerSel,
    };
    
    setEditData({
      ...editData,
      customCellConfig: [...(editData.customCellConfig || []), newCustomCell],
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

  const handleUpdateCustomCell = (index: number, field: keyof CustomCellConfig, value: any) => {
    if (!editData) return;
    
    const updated = [...(editData.customCellConfig || [])];
    updated[index] = { ...updated[index], [field]: value };
    
    setEditData({
      ...editData,
      customCellConfig: updated,
    });
  };

  const displayCluster = editMode ? editData : selectedCluster;

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            Konfigurasi Cluster
          </h1>
          <p className="text-slate-600">
            Kelola struktur warehouse: Lorong, Baris, dan Kapasitas Pallet per Cluster
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Cluster List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Daftar Cluster</h2>
              
              <div className="space-y-2">
                {clusterConfigs.filter(c => c.isActive).map((cluster) => (
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
                        <h3 className="font-semibold text-slate-800">{cluster.clusterName}</h3>
                        <p className="text-xs text-slate-500">
                          {cluster.defaultLorongCount} Lorong × {cluster.defaultBarisCount} Baris
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
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
                <div className="bg-linear-to-r from-blue-500 to-blue-600 p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold mb-1">
                        Cluster {displayCluster.cluster}
                      </h2>
                      <p className="text-blue-100">{displayCluster.clusterName}</p>
                    </div>
                    {!editMode ? (
                      <button
                        onClick={handleEditCluster}
                        className="flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors font-semibold"
                      >
                        <Edit2 size={18} />
                        Edit
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors font-semibold"
                        >
                          <Save size={18} />
                          Simpan
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex items-center gap-2 bg-white text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors font-semibold"
                        >
                          <X size={18} />
                          Batal
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Default Configuration */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm">Default</span>
                      Konfigurasi Dasar
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-slate-50 rounded-lg p-4 border-2 border-slate-200">
                        <label className="text-xs font-semibold text-slate-600 uppercase mb-2 block">
                          Jumlah Lorong
                        </label>
                        {editMode ? (
                          <input
                            type="number"
                            min="1"
                            value={editData?.defaultLorongCount || 0}
                            onChange={(e) => setEditData(editData ? {...editData, defaultLorongCount: parseInt(e.target.value)} : null)}
                            className="w-full text-2xl font-bold text-slate-800 bg-white border-2 border-slate-300 rounded px-3 py-2 focus:border-blue-500 focus:outline-none"
                          />
                        ) : (
                          <p className="text-3xl font-bold text-slate-800">
                            {displayCluster.defaultLorongCount}
                          </p>
                        )}
                      </div>
                      
                      <div className="bg-slate-50 rounded-lg p-4 border-2 border-slate-200">
                        <label className="text-xs font-semibold text-slate-600 uppercase mb-2 block">
                          Jumlah Baris
                        </label>
                        {editMode ? (
                          <input
                            type="number"
                            min="1"
                            value={editData?.defaultBarisCount || 0}
                            onChange={(e) => setEditData(editData ? {...editData, defaultBarisCount: parseInt(e.target.value)} : null)}
                            className="w-full text-2xl font-bold text-slate-800 bg-white border-2 border-slate-300 rounded px-3 py-2 focus:border-blue-500 focus:outline-none"
                          />
                        ) : (
                          <p className="text-3xl font-bold text-slate-800">
                            {displayCluster.defaultBarisCount}
                          </p>
                        )}
                      </div>
                      
                      <div className="bg-slate-50 rounded-lg p-4 border-2 border-slate-200">
                        <label className="text-xs font-semibold text-slate-600 uppercase mb-2 block">
                          Pallet per Sel
                        </label>
                        {editMode ? (
                          <input
                            type="number"
                            min="1"
                            value={editData?.defaultPalletPerSel || 0}
                            onChange={(e) => setEditData(editData ? {...editData, defaultPalletPerSel: parseInt(e.target.value)} : null)}
                            className="w-full text-2xl font-bold text-slate-800 bg-white border-2 border-slate-300 rounded px-3 py-2 focus:border-blue-500 focus:outline-none"
                          />
                        ) : (
                          <p className="text-3xl font-bold text-slate-800">
                            {displayCluster.defaultPalletPerSel}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* In Transit Range */}
                    {displayCluster.inTransitLorongRange && (
                      <div className="mt-4 bg-red-50 border-2 border-red-200 rounded-lg p-4">
                        <label className="text-xs font-semibold text-red-700 uppercase mb-2 block">
                          🚚 In Transit Area (Buffer/Overflow)
                        </label>
                        {editMode ? (
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-red-700">Lorong</span>
                            <input
                              type="number"
                              min="1"
                              value={editData?.inTransitLorongRange?.[0] || 1}
                              onChange={(e) => setEditData(editData ? {
                                ...editData, 
                                inTransitLorongRange: [parseInt(e.target.value), editData.inTransitLorongRange?.[1] || 1]
                              } : null)}
                              className="w-20 text-lg font-bold text-red-700 bg-white border-2 border-red-300 rounded px-2 py-1 focus:border-red-500 focus:outline-none"
                            />
                            <span className="text-sm text-red-700">s/d</span>
                            <input
                              type="number"
                              min="1"
                              value={editData?.inTransitLorongRange?.[1] || 1}
                              onChange={(e) => setEditData(editData ? {
                                ...editData, 
                                inTransitLorongRange: [editData.inTransitLorongRange?.[0] || 1, parseInt(e.target.value)]
                              } : null)}
                              className="w-20 text-lg font-bold text-red-700 bg-white border-2 border-red-300 rounded px-2 py-1 focus:border-red-500 focus:outline-none"
                            />
                          </div>
                        ) : (
                          <p className="text-xl font-bold text-red-700">
                            Lorong {displayCluster.inTransitLorongRange[0]} - {displayCluster.inTransitLorongRange[1]}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Custom Lorong Configuration */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <span className="bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-sm">Custom</span>
                        Konfigurasi Lorong Khusus
                      </h3>
                      {editMode && (
                        <button
                          onClick={handleAddCustomLorong}
                          className="flex items-center gap-2 bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-colors text-sm font-semibold"
                        >
                          <Plus size={16} />
                          Tambah
                        </button>
                      )}
                    </div>

                    {(!displayCluster.customLorongConfig || displayCluster.customLorongConfig.length === 0) ? (
                      <div className="bg-slate-50 rounded-lg p-6 text-center border-2 border-dashed border-slate-300">
                        <p className="text-slate-500">Tidak ada konfigurasi lorong khusus</p>
                        {editMode && (
                          <p className="text-xs text-slate-400 mt-1">Klik "Tambah" untuk menambah konfigurasi</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {displayCluster.customLorongConfig.map((config, index) => (
                          <div key={index} className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                            <div className="flex items-center gap-4">
                              <div className="flex-1 grid grid-cols-3 gap-3">
                                <div>
                                  <label className="text-xs font-semibold text-slate-600 mb-1 block">
                                    Lorong Range
                                  </label>
                                  {editMode ? (
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        min="1"
                                        value={config.lorongRange[0]}
                                        onChange={(e) => handleUpdateCustomLorong(index, 'lorongRange', [parseInt(e.target.value), config.lorongRange[1]])}
                                        className="w-full text-sm font-semibold bg-white border-2 border-slate-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
                                      />
                                      <span className="text-xs">-</span>
                                      <input
                                        type="number"
                                        min="1"
                                        value={config.lorongRange[1]}
                                        onChange={(e) => handleUpdateCustomLorong(index, 'lorongRange', [config.lorongRange[0], parseInt(e.target.value)])}
                                        className="w-full text-sm font-semibold bg-white border-2 border-slate-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
                                      />
                                    </div>
                                  ) : (
                                    <p className="text-sm font-bold text-slate-800">
                                      L{config.lorongRange[0]} - L{config.lorongRange[1]}
                                    </p>
                                  )}
                                </div>
                                
                                <div>
                                  <label className="text-xs font-semibold text-slate-600 mb-1 block">
                                    Jumlah Baris
                                  </label>
                                  {editMode ? (
                                    <input
                                      type="number"
                                      min="1"
                                      value={config.barisCount}
                                      onChange={(e) => handleUpdateCustomLorong(index, 'barisCount', parseInt(e.target.value))}
                                      className="w-full text-sm font-semibold bg-white border-2 border-slate-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
                                    />
                                  ) : (
                                    <p className="text-sm font-bold text-slate-800">{config.barisCount}</p>
                                  )}
                                </div>
                                
                                <div>
                                  <label className="text-xs font-semibold text-slate-600 mb-1 block">
                                    Pallet per Sel
                                  </label>
                                  {editMode ? (
                                    <input
                                      type="number"
                                      min="1"
                                      value={config.palletPerSel || displayCluster.defaultPalletPerSel}
                                      onChange={(e) => handleUpdateCustomLorong(index, 'palletPerSel', parseInt(e.target.value))}
                                      className="w-full text-sm font-semibold bg-white border-2 border-slate-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
                                    />
                                  ) : (
                                    <p className="text-sm font-bold text-slate-800">
                                      {config.palletPerSel || displayCluster.defaultPalletPerSel}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              {editMode && (
                                <button
                                  onClick={() => handleRemoveCustomLorong(index)}
                                  className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Custom Cell Configuration */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <span className="bg-purple-100 text-purple-600 px-3 py-1 rounded-full text-sm">Custom</span>
                        Konfigurasi Sel Khusus
                      </h3>
                      {editMode && (
                        <button
                          onClick={handleAddCustomCell}
                          className="flex items-center gap-2 bg-purple-500 text-white px-3 py-1.5 rounded-lg hover:bg-purple-600 transition-colors text-sm font-semibold"
                        >
                          <Plus size={16} />
                          Tambah
                        </button>
                      )}
                    </div>

                    {(!displayCluster.customCellConfig || displayCluster.customCellConfig.length === 0) ? (
                      <div className="bg-slate-50 rounded-lg p-6 text-center border-2 border-dashed border-slate-300">
                        <p className="text-slate-500">Tidak ada konfigurasi sel khusus</p>
                        {editMode && (
                          <p className="text-xs text-slate-400 mt-1">Klik "Tambah" untuk menambah konfigurasi</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {displayCluster.customCellConfig.map((config, index) => (
                          <div key={index} className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                            <div className="flex items-center gap-4">
                              <div className="flex-1 grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs font-semibold text-slate-600 mb-1 block">
                                    Lorong Range
                                  </label>
                                  {editMode ? (
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        min="1"
                                        value={config.lorongRange[0]}
                                        onChange={(e) => handleUpdateCustomCell(index, 'lorongRange', [parseInt(e.target.value), config.lorongRange[1]])}
                                        className="w-full text-sm font-semibold bg-white border-2 border-slate-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
                                      />
                                      <span className="text-xs">-</span>
                                      <input
                                        type="number"
                                        min="1"
                                        value={config.lorongRange[1]}
                                        onChange={(e) => handleUpdateCustomCell(index, 'lorongRange', [config.lorongRange[0], parseInt(e.target.value)])}
                                        className="w-full text-sm font-semibold bg-white border-2 border-slate-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
                                      />
                                    </div>
                                  ) : (
                                    <p className="text-sm font-bold text-slate-800">
                                      L{config.lorongRange[0]} - L{config.lorongRange[1]}
                                    </p>
                                  )}
                                </div>
                                
                                <div>
                                  <label className="text-xs font-semibold text-slate-600 mb-1 block">
                                    Baris Range
                                  </label>
                                  {editMode ? (
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        min="1"
                                        value={config.barisRange[0]}
                                        onChange={(e) => handleUpdateCustomCell(index, 'barisRange', [parseInt(e.target.value), config.barisRange[1]])}
                                        className="w-full text-sm font-semibold bg-white border-2 border-slate-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
                                      />
                                      <span className="text-xs">-</span>
                                      <input
                                        type="number"
                                        min="1"
                                        value={config.barisRange[1]}
                                        onChange={(e) => handleUpdateCustomCell(index, 'barisRange', [config.barisRange[0], parseInt(e.target.value)])}
                                        className="w-full text-sm font-semibold bg-white border-2 border-slate-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
                                      />
                                    </div>
                                  ) : (
                                    <p className="text-sm font-bold text-slate-800">
                                      B{config.barisRange[0]} - B{config.barisRange[1]}
                                    </p>
                                  )}
                                </div>
                                
                                <div className="col-span-2">
                                  <label className="text-xs font-semibold text-slate-600 mb-1 block">
                                    Pallet per Sel
                                  </label>
                                  {editMode ? (
                                    <input
                                      type="number"
                                      min="1"
                                      value={config.palletPerSel}
                                      onChange={(e) => handleUpdateCustomCell(index, 'palletPerSel', parseInt(e.target.value))}
                                      className="w-full text-sm font-semibold bg-white border-2 border-slate-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
                                    />
                                  ) : (
                                    <p className="text-sm font-bold text-slate-800">{config.palletPerSel}</p>
                                  )}
                                </div>
                              </div>
                              
                              {editMode && (
                                <button
                                  onClick={() => handleRemoveCustomCell(index)}
                                  className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                    <h4 className="font-semibold text-blue-900 mb-2">💡 Cara Penggunaan:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• <strong>Default:</strong> Konfigurasi yang berlaku untuk semua lorong/sel jika tidak ada custom</li>
                      <li>• <strong>Custom Lorong:</strong> Atur jumlah baris berbeda untuk lorong tertentu (contoh: L26 hanya 6 baris)</li>
                      <li>• <strong>Custom Sel:</strong> Atur kapasitas pallet berbeda untuk sel tertentu (contoh: L1-L3, B1-B9 = 2 pallet)</li>
                      <li>• <strong>In Transit:</strong> Area buffer untuk produk overflow yang rumah aslinya penuh</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
