"use client";

import { useState, useEffect } from "react";
import { Navigation } from "@/components/navigation";
import { useRouter } from "next/navigation";
import { warehousesMock, type Warehouse } from "@/lib/mock/product-master";
import { ConfirmationModal } from "@/components/confirmation-modal";

export default function WarehouseManagementPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string>("");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [formData, setFormData] = useState({
    warehouseCode: "",
    cityName: "",
    address: "",
    phone: "",
  });

  // Confirmation Modal State
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    type: "confirm" as "confirm" | "alert" | "success" | "error" | "warning",
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Load user role and check access
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      setUserRole(user.role);
     
      // Only developer can access this page
      if (user.role !== "developer") {
        router.push("/");
      }
    } else {
      router.push("/login");
    }
  }, [router]);

  // Load warehouses from warehousesMock
  useEffect(() => {
    // Always use warehousesMock for now
    setWarehouses(warehousesMock);
    localStorage.setItem("warehouses", JSON.stringify(warehousesMock));
  }, []);

  const handleAddWarehouse = () => {
    if (!formData.warehouseCode || !formData.cityName || !formData.address) {
      setConfirmationModal({
        isOpen: true,
        type: "error",
        title: "Data Tidak Lengkap",
        message: "Kode, Kota, dan Alamat harus diisi!",
        onConfirm: () => {},
      });
      return;
    }

    // Check if code already exists
    if (warehouses.some(wh => wh.warehouseCode === formData.warehouseCode)) {
      setConfirmationModal({
        isOpen: true,
        type: "error",
        title: "Kode Sudah Digunakan",
        message: "Kode gudang sudah digunakan!",
        onConfirm: () => {},
      });
      return;
    }

    const newWarehouse: Warehouse = {
      id: `wh-${String(warehouses.length + 1).padStart(3, '0')}-${formData.cityName.toLowerCase().replace(/\s/g, '')}`,
      warehouseCode: formData.warehouseCode,
      cityName: formData.cityName,
      address: formData.address,
      phone: formData.phone,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedWarehouses = [...warehouses, newWarehouse];
    setWarehouses(updatedWarehouses);
    localStorage.setItem("warehouses", JSON.stringify(updatedWarehouses));

    // Reset form and close modal
    setFormData({ warehouseCode: "", cityName: "", address: "", phone: "" });
    setShowAddModal(false);
    
    setConfirmationModal({
      isOpen: true,
      type: "success",
      title: "Berhasil",
      message: "Gudang baru berhasil ditambahkan!",
      onConfirm: () => {},
    });
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

  const handleEditWarehouse = () => {
    if (!editingWarehouse) return;

    if (!formData.warehouseCode || !formData.cityName || !formData.address) {
      setConfirmationModal({
        isOpen: true,
        type: "error",
        title: "Data Tidak Lengkap",
        message: "Kode, Kota, dan Alamat harus diisi!",
        onConfirm: () => {},
      });
      return;
    }

    // Check if code already exists (excluding current warehouse)
    if (warehouses.some(wh => wh.warehouseCode === formData.warehouseCode && wh.id !== editingWarehouse.id)) {
      setConfirmationModal({
        isOpen: true,
        type: "error",
        title: "Kode Sudah Digunakan",
        message: "Kode gudang sudah digunakan!",
        onConfirm: () => {},
      });
      return;
    }

    const updatedWarehouses = warehouses.map(wh =>
      wh.id === editingWarehouse.id
        ? {
            ...wh,
            warehouseCode: formData.warehouseCode,
            cityName: formData.cityName,
            address: formData.address,
            phone: formData.phone,
            updatedAt: new Date().toISOString(),
          }
        : wh
    );

    setWarehouses(updatedWarehouses);
    localStorage.setItem("warehouses", JSON.stringify(updatedWarehouses));

    // Reset form and close modal
    setFormData({ warehouseCode: "", cityName: "", address: "", phone: "" });
    setEditingWarehouse(null);
    setShowEditModal(false);

    setConfirmationModal({
      isOpen: true,
      type: "success",
      title: "Berhasil",
      message: "Data gudang berhasil diperbarui!",
      onConfirm: () => {},
    });
  };

  const handleToggleStatus = (warehouse: Warehouse) => {
    const updatedWarehouses = warehouses.map(wh =>
      wh.id === warehouse.id ? { ...wh, isActive: !wh.isActive } : wh
    );
    setWarehouses(updatedWarehouses);
    localStorage.setItem("warehouses", JSON.stringify(updatedWarehouses));
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (userRole !== "developer") {
    return null;
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="w-full max-w-full space-y-3 sm:space-y-4">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <span className="text-xl sm:text-2xl">🏢</span>
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Management Warehouse</h1>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Kelola master data gudang (Developer Only)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-indigo-700 transition-all shadow-lg"
              >
                + Tambah Gudang
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-lg sm:text-2xl">📊</span>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xs sm:text-sm text-gray-600">Total Gudang</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-800">{warehouses.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-lg sm:text-2xl">✓</span>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xs sm:text-sm text-gray-600">Aktif</p>
                  <p className="text-lg sm:text-2xl font-bold text-green-600">
                    {warehouses.filter(wh => wh.isActive).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Warehouse List */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-bold">Kode</th>
                    <th className="px-4 py-3 text-left text-sm font-bold">Kota</th>
                    <th className="px-4 py-3 text-left text-sm font-bold">Alamat</th>
                    <th className="px-4 py-3 text-left text-sm font-bold">Telepon</th>
                    <th className="px-4 py-3 text-left text-sm font-bold">Dibuat</th>
                    <th className="px-4 py-3 text-center text-sm font-bold">Status</th>
                    <th className="px-4 py-3 text-center text-sm font-bold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {warehouses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <div className="text-6xl mb-4">🏢</div>
                        <p className="text-gray-600 font-semibold">Belum ada gudang</p>
                      </td>
                    </tr>
                  ) : (
                    warehouses.map((warehouse) => (
                      <tr key={warehouse.id} className="hover:bg-blue-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-mono font-bold text-gray-800">
                          {warehouse.warehouseCode}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                          {warehouse.cityName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {warehouse.address}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {warehouse.phone || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDateTime(warehouse.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleToggleStatus(warehouse)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold ${
                              warehouse.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {warehouse.isActive ? "✓ Aktif" : "✗ Nonaktif"}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => openEditModal(warehouse)}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600 transition-colors"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Add Warehouse Modal */}
        {showAddModal && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowAddModal(false);
              }
            }}
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-6 text-white rounded-t-2xl flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Tambah Gudang Baru</h2>
                    <p className="text-sm opacity-90 mt-1">
                      Buat master data gudang baru
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Kode Gudang <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.warehouseCode}
                    onChange={(e) => setFormData({ ...formData, warehouseCode: e.target.value })}
                    placeholder="Contoh: WH-JKT"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Kota <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.cityName}
                    onChange={(e) => setFormData({ ...formData, cityName: e.target.value })}
                    placeholder="Contoh: Jakarta"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Alamat <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Masukkan alamat lengkap gudang"
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Telepon
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Contoh: 021-12345678"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 p-4 rounded-b-2xl flex gap-3 flex-shrink-0">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleAddWarehouse}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-indigo-700 transition-colors"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Warehouse Modal */}
        {showEditModal && editingWarehouse && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowEditModal(false);
                setEditingWarehouse(null);
                setFormData({ warehouseCode: "", cityName: "", address: "", phone: "" });
              }
            }}
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white rounded-t-2xl flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Edit Data Gudang</h2>
                    <p className="text-sm opacity-90 mt-1">
                      Perbarui informasi gudang
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingWarehouse(null);
                      setFormData({ warehouseCode: "", cityName: "", address: "", phone: "" });
                    }}
                    className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Kode Gudang <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.warehouseCode}
                    onChange={(e) => setFormData({ ...formData, warehouseCode: e.target.value })}
                    placeholder="Contoh: WH-JKT"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Kota <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.cityName}
                    onChange={(e) => setFormData({ ...formData, cityName: e.target.value })}
                    placeholder="Contoh: Jakarta"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Alamat <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Masukkan alamat lengkap gudang"
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Telepon
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Contoh: 021-12345678"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 p-4 rounded-b-2xl flex gap-3 flex-shrink-0">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingWarehouse(null);
                    setFormData({ warehouseCode: "", cityName: "", address: "", phone: "" });
                  }}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleEditWarehouse}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-colors"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
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
