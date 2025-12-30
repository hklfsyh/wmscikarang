"use client";

import { useState } from "react";
import { Navigation } from "@/components/navigation";
import { type Warehouse } from "@/lib/mock/product-master";
import { ConfirmationModal } from "@/components/confirmation-modal";
import { createClient } from "@/utils/supabase/client"; // Gunakan client-side client
import { useRouter } from "next/navigation";

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
  const [warehouses, setWarehouses] = useState<Warehouse[]>(initialWarehouses);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
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
    const { error } = await supabase
      .from("warehouses")
      .insert([{
        warehouse_code: formData.warehouseCode,
        city_name: formData.cityName,
        address: formData.address,
        phone: formData.phone,
        is_active: true
      }]);

    if (error) {
      setConfirmationModal({
        isOpen: true, type: "error", title: "Gagal",
        message: "Error database: " + error.message,
        onConfirm: () => {},
      });
    } else {
      setFormData({ warehouseCode: "", cityName: "", address: "", phone: "" });
      setShowAddModal(false);
      router.refresh(); // Ambil data terbaru dari server
      setConfirmationModal({
        isOpen: true, type: "success", title: "Berhasil",
        message: "Gudang baru berhasil ditambahkan ke database!",
        onConfirm: () => window.location.reload(),
      });
    }
    setLoading(false);
  };

  const handleEditWarehouse = async () => {
    if (!editingWarehouse) return;
    setLoading(true);

    const { error } = await supabase
      .from("warehouses")
      .update({
        warehouse_code: formData.warehouseCode,
        city_name: formData.cityName,
        address: formData.address,
        phone: formData.phone,
        updated_at: new Date().toISOString()
      })
      .eq("id", editingWarehouse.id);

    if (error) {
      setConfirmationModal({
        isOpen: true, type: "error", title: "Gagal",
        message: "Update gagal: " + error.message,
        onConfirm: () => {},
      });
    } else {
      setShowEditModal(false);
      router.refresh();
      setConfirmationModal({
        isOpen: true, type: "success", title: "Berhasil",
        message: "Data gudang berhasil diperbarui!",
        onConfirm: () => window.location.reload(),
      });
    }
    setLoading(false);
  };

  const handleToggleStatus = async (warehouse: Warehouse) => {
    const { error } = await supabase
      .from("warehouses")
      .update({ is_active: !warehouse.isActive })
      .eq("id", warehouse.id);

    if (!error) router.refresh();
    window.location.reload();
  };

  const openEditModal = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      warehouseCode: warehouse.warehouseCode,
      cityName: warehouse.cityName,
      address: warehouse.address,
      phone: warehouse.phone,
    });
    setShowEditModal(true);
  };

  return (
    <>
      <Navigation userProfile={userProfile} />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 lg:pl-4">
        <div className="w-full max-w-full space-y-3 sm:space-y-4">
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <span className="text-xl sm:text-2xl">🏢</span>
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Management Warehouse</h1>
                  <p className="text-xs sm:text-sm text-gray-600">Kelola master data gudang</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-semibold shadow-lg"
              >
                + Tambah Gudang
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 lg:p-6 text-center sm:text-left">
              <p className="text-xs sm:text-sm text-gray-600 uppercase">Total Gudang</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-800">{warehouses.length}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 lg:p-6 text-center sm:text-left">
              <p className="text-xs sm:text-sm text-gray-600 uppercase">Aktif</p>
              <p className="text-lg sm:text-2xl font-bold text-green-600">{warehouses.filter(wh => wh.isActive).length}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-bold uppercase">Kode</th>
                    <th className="px-4 py-3 text-left text-sm font-bold uppercase">Kota</th>
                    <th className="px-4 py-3 text-left text-sm font-bold uppercase hidden md:table-cell">Alamat</th>
                    <th className="px-4 py-3 text-left text-sm font-bold uppercase">Telepon</th>
                    <th className="px-4 py-3 text-center text-sm font-bold uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-sm font-bold uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {warehouses.map((warehouse) => (
                    <tr key={warehouse.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono font-bold text-gray-800">{warehouse.warehouseCode}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-800">{warehouse.cityName}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 hidden md:table-cell">{warehouse.address}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{warehouse.phone || "-"}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleStatus(warehouse)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold ${warehouse.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                        >
                          {warehouse.isActive ? "✓ Aktif" : "✗ Nonaktif"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => openEditModal(warehouse)}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Logic (Tetap Sesuai Kebutuhan) */}
        {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden">
              <div className={`p-6 text-white bg-gradient-to-r ${showEditModal ? 'from-blue-500 to-indigo-600' : 'from-purple-500 to-indigo-600'}`}>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">{showEditModal ? "Edit Data Gudang" : "Tambah Gudang Baru"}</h2>
                  <button disabled={loading} onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="text-white hover:bg-white/20 rounded-lg p-2">✕</button>
                </div>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto">
                <input disabled={loading} type="text" value={formData.warehouseCode} onChange={(e) => setFormData({ ...formData, warehouseCode: e.target.value })} placeholder="Kode Gudang" className="w-full px-4 py-3 border-2 rounded-xl outline-none" />
                <input disabled={loading} type="text" value={formData.cityName} onChange={(e) => setFormData({ ...formData, cityName: e.target.value })} placeholder="Kota" className="w-full px-4 py-3 border-2 rounded-xl outline-none" />
                <textarea disabled={loading} value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Alamat" rows={3} className="w-full px-4 py-3 border-2 rounded-xl outline-none" />
                <input disabled={loading} type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="Telepon" className="w-full px-4 py-3 border-2 rounded-xl outline-none" />
              </div>
              <div className="bg-gray-50 p-4 flex gap-3">
                <button disabled={loading} onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="flex-1 py-3 bg-gray-200 rounded-xl">Batal</button>
                <button disabled={loading} onClick={showEditModal ? handleEditWarehouse : handleAddWarehouse} className={`flex-1 py-3 text-white rounded-xl bg-gradient-to-r ${showEditModal ? 'from-blue-500 to-indigo-600' : 'from-purple-500 to-indigo-600'}`}>
                  {loading ? "Memproses..." : "Simpan"}
                </button>
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