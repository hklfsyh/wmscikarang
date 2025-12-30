"use client";

import { useState } from "react";
import { Navigation } from "@/components/navigation";
import { ConfirmationModal } from "@/components/confirmation-modal";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { registerUser, updateUser, deleteUser } from "./actions";
import { Eye, EyeOff } from "lucide-react";

interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone?: string;
  role: "developer" | "admin_cabang" | "admin_warehouse";
  isActive: boolean;
  warehouseId?: string | null;
  warehouseName?: string;
}

interface UserProfile {
  id: string;
  username: string;
  role: string;
  full_name: string;
  warehouse_id?: string | null;
}

export default function AdminManagementClient({
  userProfile,
  initialUsers,
}: {
  userProfile: UserProfile;
  initialUsers: User[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [users] = useState<User[]>(initialUsers);
  const [loading, setLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: "confirm" as "confirm" | "alert" | "success" | "error",
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const [formData, setFormData] = useState({
    username: "",
    fullName: "",
    email: "",
    phone: "",
    password: "",
    role: "admin_warehouse" as "developer" | "admin_cabang" | "admin_warehouse",
    warehouseId: userProfile.warehouse_id || "",
  });

  const resetForm = () => {
    setFormData({
      username: "",
      fullName: "",
      email: "",
      phone: "",
      password: "",
      role: "admin_warehouse",
      warehouseId: userProfile.warehouse_id || "",
    });
    setSelectedUser(null);
  };

  const handleAddUser = async () => {
    if (
      !formData.username ||
      !formData.fullName ||
      !formData.email ||
      !formData.password
    ) {
      setConfirmModal({
        isOpen: true,
        type: "error",
        title: "Validasi Gagal",
        message:
          "Username, Nama Lengkap, Email, dan Password wajib diisi untuk pendaftaran Auth!",
        onConfirm: () => {},
      });
      return;
    }

    setLoading(true);
    const result = await registerUser({
      email: formData.email,
      password: formData.password,
      username: formData.username,
      fullName: formData.fullName,
      phone: formData.phone || null,
      role: formData.role,
      warehouseId: formData.role === "developer" ? null : formData.warehouseId,
    });

    if (result.error) {
      setConfirmModal({
        isOpen: true,
        type: "error",
        title: "Gagal Registrasi",
        message: result.error,
        onConfirm: () => {},
      });
    } else {
      setShowAddModal(false);
      setConfirmModal({
        isOpen: true,
        type: "success",
        title: "User Aktif!",
        message: `User berhasil terdaftar di Auth & Database.`,
        onConfirm: () => window.location.reload(),
      });
    }
    setLoading(false);
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    setLoading(true);

    // Gunakan Server Action agar Auth dan Database sinkron
    const result = await updateUser(selectedUser.id, formData);

    if (result.error) {
      setConfirmModal({
        isOpen: true,
        type: "error",
        title: "Gagal Update",
        message: result.error,
        onConfirm: () => {},
      });
    } else {
      setShowEditModal(false);
      setConfirmModal({
        isOpen: true,
        type: "success",
        title: "Berhasil!",
        message: "Data login (Auth) dan Profil Database berhasil disinkronkan.",
        onConfirm: () => window.location.reload(),
      });
    }
    setLoading(false);
  };

  const handleToggleStatus = async (user: User) => {
    const { error } = await supabase
      .from("users")
      .update({ is_active: !user.isActive })
      .eq("id", user.id);

    if (!error) window.location.reload();
  };

  const handleDeleteUser = (user: User) => {
    setConfirmModal({
      isOpen: true,
      type: "confirm",
      title: "Hapus Permanen",
      message: `Hapus ${user.fullName} dari database dan akses login (Auth)?`,
      onConfirm: async () => {
        setLoading(true);
        const result = await deleteUser(user.id);
        if (result.error) alert(result.error);
        else window.location.reload();
      },
    });
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      fullName: user.fullName,
      email: user.email || "",
      phone: user.phone || "",
      password: "",
      role: user.role,
      warehouseId: user.warehouseId || "",
    });
    setShowEditModal(true);
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case "developer":
        return "Developer";
      case "admin_cabang":
        return "Admin Cabang";
      case "admin_warehouse":
        return "Admin Warehouse";
      default:
        return role;
    }
  };

  // Logika Hirarki: Admin Cabang hanya bisa CRUD Admin Warehouse
  const canModify = (targetUser: User) => {
    if (userProfile.role === "developer") return true;
    if (userProfile.role === "admin_cabang") {
      return targetUser.role === "admin_warehouse";
    }
    return false;
  };

  return (
    <>
      <Navigation userProfile={userProfile} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 lg:pl-8 p-4 sm:p-6">
        <div className="w-full max-w-full space-y-3 sm:space-y-4">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-xl">
                  👥
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">
                    {userProfile.role === "developer"
                      ? "Management User"
                      : "Management User - Admin"}
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Kelola akses pengguna database
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold shadow-lg"
              >
                + Tambah {userProfile.role === "developer" ? "User" : "Admin"}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-bold">
                      Username
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-bold">
                      Nama
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-bold hidden sm:table-cell">
                      Kontak
                    </th>
                    {userProfile.role === "developer" && (
                      <th className="px-4 py-3 text-left text-sm font-bold hidden md:table-cell">
                        Role
                      </th>
                    )}
                    <th className="px-4 py-3 text-center text-sm font-bold">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-bold">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="hover:bg-blue-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-mono font-bold text-gray-800">
                        {u.username}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                        {u.fullName}
                        <div className="text-[10px] lg:hidden text-gray-500">
                          {getRoleName(u.role)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 hidden sm:table-cell">
                        <div>{u.email || "-"}</div>
                        <div>{u.phone || "-"}</div>
                      </td>
                      {userProfile.role === "developer" && (
                        <td className="px-4 py-3 text-sm text-gray-700 hidden md:table-cell">
                          <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold">
                            {getRoleName(u.role)}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-3 text-center">
                        <button
                          disabled={!canModify(u)}
                          onClick={() => handleToggleStatus(u)}
                          className={`px-2 py-1 rounded-lg text-xs font-bold ${
                            u.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          } disabled:opacity-50`}
                        >
                          {u.isActive ? "✓ Aktif" : "✗ Nonaktif"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          {canModify(u) ? (
                            <>
                              <button
                                onClick={() => openEditModal(u)}
                                className="px-2 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="px-2 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold"
                              >
                                Hapus
                              </button>
                            </>
                          ) : (
                            <span className="text-gray-400 text-xs italic">
                              No Access
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Add & Edit */}
        {(showAddModal || showEditModal) && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto"
            onClick={() => {
              setShowAddModal(false);
              setShowEditModal(false);
              resetForm();
            }}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full my-8 max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 sm:p-6 text-white rounded-t-2xl flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl sm:text-2xl font-bold">
                    {showEditModal ? "Edit" : "Tambah"} User
                  </h2>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                      resetForm();
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">
                      USERNAME
                    </label>
                    <input
                      disabled={loading}
                      type="text"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                      placeholder="Username"
                      className="w-full px-4 py-2 border rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">
                      PHONE
                    </label>
                    <input
                      disabled={loading}
                      type="text"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="0812..."
                      className="w-full px-4 py-2 border rounded-xl text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">
                    NAMA LENGKAP
                  </label>
                  <input
                    disabled={loading}
                    type="text"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    placeholder="Nama Lengkap"
                    className="w-full px-4 py-2 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">
                    EMAIL (Wajib untuk Auth)
                  </label>
                  <input
                    disabled={loading}
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="email@wms.com"
                    className="w-full px-4 py-2 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">
                    PASSWORD
                  </label>
                  <div className="relative">
                    <input
                      disabled={loading}
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder={
                        showEditModal ? "Kosongkan jika tidak ganti" : "Password"
                      }
                      className="w-full px-4 py-3 pr-12 border-2 rounded-xl outline-none text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                {userProfile.role === "developer" && (
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">
                      ROLE
                    </label>
                    <select
                      disabled={loading}
                      value={formData.role}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          role: e.target.value as any,
                        })
                      }
                      className="w-full px-4 py-2 border rounded-xl text-sm bg-white"
                    >
                      <option value="admin_warehouse">Admin Warehouse</option>
                      <option value="admin_cabang">Admin Cabang</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="p-4 bg-gray-50 rounded-b-2xl flex gap-3">
                <button
                  disabled={loading}
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                  }}
                  className="flex-1 py-2 bg-gray-200 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  disabled={loading}
                  onClick={showEditModal ? handleEditUser : handleAddUser}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-semibold shadow-lg"
                >
                  {loading ? "Memproses..." : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          type={confirmModal.type}
          confirmText="OK"
          cancelText="Batal"
          showCancel={confirmModal.type === "confirm"}
        />
      </div>
    </>
  );
}
