"use client";

import { useState } from "react";
import { Navigation } from "@/components/navigation";
import { type Warehouse } from "@/lib/mock/product-master";
import { ConfirmationModal } from "@/components/confirmation-modal";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { createWarehouse, updateWarehouse, deleteWarehouse, toggleWarehouseStatus } from "./actions";

interface UserProfile {
  username: string;
  role: string;
  full_name: string;
}

export default function WarehouseManagementClient({ 
  userProfile, 
  initialWarehouses 
}: { 
  userProfile: UserProfile;
  initialWarehouses: Warehouse[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [warehouses] = useState<Warehouse[]>(initialWarehouses);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false); // Tambahkan ini
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [deletingWarehouse, setDeletingWarehouse] = useState<Warehouse | null>(null); // Tambahkan ini
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    warehouseCode: "",
    cityName: "",
    address: "",
    phone: "",
  });

  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    type: "confirm" as "confirm" | "alert" | "success" | "error" | "warning",
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const resetForm = () => {
    setFormData({ warehouseCode: "", cityName: "", address: "", phone: "" });
    setEditingWarehouse(null);
  };

  const handleAddWarehouse = async () => {
    if (!formData.warehouseCode || !formData.cityName || !formData.address) {
      setConfirmationModal({
        isOpen: true, type: "error", title: "Data Tidak Lengkap",
        message: "Kode, Kota, dan Alamat harus diisi!",
        onConfirm: () => {},
      });
      return;
    }

    setLoading(true);
    const result = await createWarehouse(formData);

    if (result.error) {
      setConfirmationModal({
        isOpen: true, type: "error", title: "Gagal",
        message: result.error,
        onConfirm: () => {},
      });
    } else {
      setShowAddModal(false);
      resetForm();
      setConfirmationModal({
        isOpen: true, type: "success", title: "Berhasil",
        message: "Gudang baru berhasil ditambahkan!",
        onConfirm: () => router.refresh(),
      });
    }
    setLoading(false);
  };

  const handleEditWarehouse = async () => {
    if (!editingWarehouse) return;
    setLoading(true);

    const result = await updateWarehouse(editingWarehouse.id, formData);

    if (result.error) {
      setConfirmationModal({
        isOpen: true, type: "error", title: "Gagal",
        message: result.error,
        onConfirm: () => {},
      });
    } else {
      setShowEditModal(false);
      resetForm();
      setConfirmationModal({
        isOpen: true, type: "success", title: "Berhasil",
        message: "Data gudang berhasil diperbarui!",
        onConfirm: () => router.refresh(),
      });
    }
    setLoading(false);
  };

  const handleToggleStatus = async (warehouse: Warehouse) => {
    const { error } = await supabase
      .from("warehouses")
      .update({ is_active: !warehouse.isActive })
      .eq("id", warehouse.id);

    if (!error) window.location.reload();
  };

  const handleDeleteWarehouse = async () => {
    if (!deletingWarehouse) return;
    setLoading(true);

    const result = await deleteWarehouse(deletingWarehouse.id);

    if (result.error) {
      setConfirmationModal({
        isOpen: true, type: "error", title: "Gagal",
        message: result.error,
        onConfirm: () => {},
      });
    } else {
      setShowDeleteModal(false);
      setDeletingWarehouse(null);
      setConfirmationModal({
        isOpen: true, type: "success", title: "Terhapus",
        message: "Gudang berhasil dihapus!",
        onConfirm: () => router.refresh(),
      });
    }
    setLoading(false);
  };

  const openEditModal = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      warehouseCode: warehouse.warehouseCode,
      cityName: warehouse.cityName,
      address: warehouse.address,
      phone: warehouse.phone || "",
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (warehouse: Warehouse) => {
    setDeletingWarehouse(warehouse);
    setShowDeleteModal(true);
  };

  return (
    <>
      <Navigation userProfile={userProfile} />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 lg:pl-8">
        <div className="w-full max-w-full space-y-3 sm:space-y-4 p-4">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xl p-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Management Warehouse</h1>
              <p className="text-sm text-gray-600">Kelola master data gudang</p>
            </div>
            <button
              onClick={() => { resetForm(); setShowAddModal(true); }}
              className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-semibold shadow-lg"
            >
              + Tambah Gudang
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-indigo-600 text-white text-sm">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Kode</th>
                    <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Kota</th>
                    <th className="px-4 py-3 text-left font-bold uppercase tracking-wider hidden md:table-cell">Alamat</th>
                    <th className="px-4 py-3 text-center font-bold uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-center font-bold uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {warehouses.map((wh) => (
                    <tr key={wh.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono font-bold text-indigo-600">{wh.warehouseCode}</td>
                      <td className="px-4 py-3 text-sm font-semibold">{wh.cityName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{wh.address}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleStatus(wh)}
                          className={`px-2 py-1 rounded-lg text-xs font-bold ${wh.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                        >
                          {wh.isActive ? "✓ Aktif" : "✗ Nonaktif"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => openEditModal(wh)}
                            className="px-2 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openDeleteModal(wh)}
                            className="px-2 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* MODAL SECTION - WITH CLICK OUTSIDE TO CLOSE */}
        {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
                <h2 className="text-xl font-bold">{showEditModal ? "Edit" : "Tambah"} Gudang</h2>
                <button onClick={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }}>✕</button>
              </div>
              <div className="p-6 space-y-4">
                <input disabled={loading} type="text" value={formData.warehouseCode} onChange={(e) => setFormData({...formData, warehouseCode: e.target.value})} placeholder="Kode Gudang (WH-CKR)" className="w-full px-4 py-2 border rounded-xl" />
                <input disabled={loading} type="text" value={formData.cityName} onChange={(e) => setFormData({...formData, cityName: e.target.value})} placeholder="Nama Kota" className="w-full px-4 py-2 border rounded-xl" />
                <textarea disabled={loading} value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} placeholder="Alamat Lengkap" rows={3} className="w-full px-4 py-2 border rounded-xl" />
                <input disabled={loading} type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="Nomor Telepon" className="w-full px-4 py-2 border rounded-xl" />
              </div>
              <div className="p-4 bg-gray-50 flex gap-3">
                <button onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="flex-1 py-2 bg-gray-200 rounded-xl">Batal</button>
                <button disabled={loading} onClick={showEditModal ? handleEditWarehouse : handleAddWarehouse} className="flex-1 py-2 bg-indigo-600 text-white rounded-xl shadow-lg">
                  {loading ? "Proses..." : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE MODAL */}
        {showDeleteModal && deletingWarehouse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowDeleteModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">⚠️</div>
              <h3 className="text-xl font-bold mb-2">Hapus Gudang?</h3>
              <p className="text-sm text-gray-500 mb-6">Menghapus <b>{deletingWarehouse.warehouseCode}</b> akan berdampak pada data stok di dalamnya.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2 bg-gray-100 rounded-xl">Batal</button>
                <button onClick={handleDeleteWarehouse} className="flex-1 py-2 bg-red-600 text-white rounded-xl shadow-lg">Ya, Hapus</button>
              </div>
            </div>
          </div>
        )}

        <ConfirmationModal
          isOpen={confirmationModal.isOpen}
          onClose={() => setConfirmationModal({ ...confirmationModal, isOpen: false })}
          onConfirm={() => {
            confirmationModal.onConfirm();
            setConfirmationModal({ ...confirmationModal, isOpen: false });
          }}
          type={confirmationModal.type}
          title={confirmationModal.title}
          message={confirmationModal.message}
        />
      </div>
    </>
  );
}