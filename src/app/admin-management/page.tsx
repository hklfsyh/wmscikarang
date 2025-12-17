"use client";

import { useState, useEffect } from "react";
import { Navigation } from "@/components/navigation";
import { useRouter } from "next/navigation";

interface Admin {
  id: string;
  username: string;
  name: string;
  email: string;
  role: "admin_warehouse";
  createdAt: string;
  isActive: boolean;
}

export default function AdminManagementPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string>("");
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    username: "",
    name: "",
    email: "",
    password: "",
  });

  // Load user role and check access
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      setUserRole(user.role);
      
      if (user.role !== "superadmin") {
        router.push("/");
      }
    } else {
      router.push("/login");
    }
  }, [router]);

  // Load admins from localStorage
  useEffect(() => {
    const storedAdmins = localStorage.getItem("admins");
    if (storedAdmins) {
      setAdmins(JSON.parse(storedAdmins));
    } else {
      // Initialize with default admin
      const defaultAdmins: Admin[] = [
        {
          id: "ADM-001",
          username: "admin",
          name: "Admin Warehouse",
          email: "admin@wmscikarang.com",
          role: "admin_warehouse",
          createdAt: new Date().toISOString(),
          isActive: true,
        },
      ];
      setAdmins(defaultAdmins);
      localStorage.setItem("admins", JSON.stringify(defaultAdmins));
    }
  }, []);

  const handleAddAdmin = () => {
    if (!formData.username || !formData.name || !formData.email || !formData.password) {
      alert("Semua field harus diisi!");
      return;
    }

    // Check if username already exists
    if (admins.some(admin => admin.username === formData.username)) {
      alert("Username sudah digunakan!");
      return;
    }

    const newAdmin: Admin = {
      id: `ADM-${String(admins.length + 1).padStart(3, '0')}`,
      username: formData.username,
      name: formData.name,
      email: formData.email,
      role: "admin_warehouse",
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    const updatedAdmins = [...admins, newAdmin];
    setAdmins(updatedAdmins);
    localStorage.setItem("admins", JSON.stringify(updatedAdmins));

    // Save password to users (for login)
    const users = JSON.parse(localStorage.getItem("users") || "{}");
    users[formData.username] = {
      password: formData.password,
      role: "admin_warehouse",
      name: formData.name,
    };
    localStorage.setItem("users", JSON.stringify(users));

    // Reset form and close modal
    setFormData({ username: "", name: "", email: "", password: "" });
    setShowAddModal(false);
    alert("Admin baru berhasil ditambahkan!");
  };

  const handleToggleStatus = (admin: Admin) => {
    const updatedAdmins = admins.map(a =>
      a.id === admin.id ? { ...a, isActive: !a.isActive } : a
    );
    setAdmins(updatedAdmins);
    localStorage.setItem("admins", JSON.stringify(updatedAdmins));
  };

  const handleDeleteAdmin = (admin: Admin) => {
    if (confirm(`Apakah Anda yakin ingin menghapus admin ${admin.name}?`)) {
      const updatedAdmins = admins.filter(a => a.id !== admin.id);
      setAdmins(updatedAdmins);
      localStorage.setItem("admins", JSON.stringify(updatedAdmins));

      // Remove from users
      const users = JSON.parse(localStorage.getItem("users") || "{}");
      delete users[admin.username];
      localStorage.setItem("users", JSON.stringify(users));
      
      alert("Admin berhasil dihapus!");
    }
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

  if (userRole !== "superadmin") {
    return null;
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">👥</span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">Manajemen Admin</h1>
                  <p className="text-sm text-gray-600">
                    Kelola akun Admin Warehouse
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg"
              >
                + Tambah Admin
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📊</span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Admin</p>
                  <p className="text-2xl font-bold text-gray-800">{admins.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">✓</span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Admin Aktif</p>
                  <p className="text-2xl font-bold text-green-600">
                    {admins.filter(a => a.isActive).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">✗</span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Admin Nonaktif</p>
                  <p className="text-2xl font-bold text-red-600">
                    {admins.filter(a => !a.isActive).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Admin List */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-bold">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-bold">Username</th>
                    <th className="px-4 py-3 text-left text-sm font-bold">Nama</th>
                    <th className="px-4 py-3 text-left text-sm font-bold">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-bold">Dibuat</th>
                    <th className="px-4 py-3 text-center text-sm font-bold">Status</th>
                    <th className="px-4 py-3 text-center text-sm font-bold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {admins.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <div className="text-6xl mb-4">👤</div>
                        <p className="text-gray-600 font-semibold">Belum ada admin</p>
                      </td>
                    </tr>
                  ) : (
                    admins.map((admin) => (
                      <tr key={admin.id} className="hover:bg-blue-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-mono text-gray-700">
                          {admin.id}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                          {admin.username}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {admin.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {admin.email}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDateTime(admin.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleToggleStatus(admin)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold ${
                              admin.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {admin.isActive ? "✓ Aktif" : "✗ Nonaktif"}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDeleteAdmin(admin)}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors"
                          >
                            Hapus
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

        {/* Add Admin Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Tambah Admin Baru</h2>
                    <p className="text-sm opacity-90 mt-1">
                      Buat akun admin warehouse baru
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
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Masukkan username"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Masukkan nama lengkap"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Masukkan email"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Masukkan password"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 p-4 rounded-b-2xl flex gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleAddAdmin}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-colors"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
