// File: src/components/outbound-form.tsx (UPDATED)

"use client";

import { useState } from "react";
// --- START: Perubahan Import ---
import { productMasterData, getProductByCode } from "@/lib/mock/product-master";
// --- END: Perubahan Import ---
import { stockListData } from "@/lib/mock/stocklistmock";
import { TruckIcon, MapPin } from "lucide-react";

interface FEFOLocation {
  stockId: string;
  location: string;
  bbPallet: string;
  expiredDate: string;
  availableQtyPallet: number;
  allocatedQtyPallet: number;
  daysToExpire: number;
}

type OutboundFormState = {
  tanggal: string;
  productCode: string;
  qtyPallet: string;
};

const today = new Date().toISOString().slice(0, 10);

const initialState: OutboundFormState = {
  tanggal: today,
  productCode: "",
  qtyPallet: "",
};

export function OutboundForm() {
  const [form, setForm] = useState<OutboundFormState>(initialState);
  const [fefoLocations, setFefoLocations] = useState<FEFOLocation[]>([]);

  // Get selected product data
  const selectedProduct = form.productCode ? getProductByCode(form.productCode) : null;

  // Handle field change
  const handleChange = (field: keyof OutboundFormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    
    // Reset FEFO ketika produk berubah
    if (field === "productCode") {
      setFefoLocations([]);
    }
  };

  // Calculate FEFO locations
  const calculateFEFO = () => {
    if (!form.productCode || !form.qtyPallet || Number(form.qtyPallet) <= 0) {
      alert("Mohon isi produk dan quantity pallet!");
      return;
    }

    const qtyPalletNeeded = Number(form.qtyPallet);
    
    // Get available stocks for this product, sorted by expired date (FEFO)
    const availableStocks = stockListData
      .filter(
        (stock) =>
          stock.productCode === form.productCode && 
          stock.status === "available"
      )
      .sort((a, b) => new Date(a.expiredDate).getTime() - new Date(b.expiredDate).getTime());

    const locations: FEFOLocation[] = [];
    let remainingQtyPallet = qtyPalletNeeded;

    // Allocate from stocks (FEFO) - gunakan qtyPallet langsung dari stock
    for (const stock of availableStocks) {
      if (remainingQtyPallet <= 0) break;

      // Gunakan qtyPallet (jumlah tumpukan pallet di slot) dari stock data
      const availablePallet = stock.qtyPallet;
      
      if (availablePallet > 0) {
        const allocatePallet = Math.min(remainingQtyPallet, availablePallet);

        const now = new Date();
        const expDate = new Date(stock.expiredDate);
        const daysToExpire = Math.ceil(
          (expDate.getTime() - now.getTime()) / (1000 * 3600 * 24)
        );

        locations.push({
          stockId: stock.id,
          location: `${stock.location.cluster}-${stock.location.lorong}-${stock.location.baris}-${stock.location.level}`,
          bbPallet: stock.bbPallet,
          expiredDate: stock.expiredDate,
          availableQtyPallet: availablePallet,
          allocatedQtyPallet: allocatePallet,
          daysToExpire,
        });

        remainingQtyPallet -= allocatePallet;
      }
    }

    // Check if we have enough stock
    if (remainingQtyPallet > 0) {
      alert(
        `Stok tidak cukup untuk ${selectedProduct?.productName}!\nKurang ${remainingQtyPallet} pallet.\nTersedia: ${qtyPalletNeeded - remainingQtyPallet} pallet dari ${qtyPalletNeeded} yang diminta.`
      );
      setFefoLocations([]);
      return;
    }

    setFefoLocations(locations);
  };

  // Handle reset
  const handleReset = () => {
    setForm(initialState);
    setFefoLocations([]);
  };

  // --- START: Kalkulasi Total Pcs Baru ---
  const totalPcs = selectedProduct && form.qtyPallet
    ? Number(form.qtyPallet) * selectedProduct.qtyPerPallet 
    : 0;
  // --- END: Kalkulasi Total Pcs Baru ---


  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 to-red-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
              <TruckIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Outbound</h1>
              <p className="text-sm text-gray-500">Pengambilan barang dengan aturan FEFO.</p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-6 mb-8">
            {/* Tanggal & Produk */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tanggal */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📅 Tanggal
                </label>
                <input
                  type="date"
                  value={form.tanggal}
                  onChange={(e) => handleChange("tanggal", e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all"
                  max={today}
                  min={today}
                />
              </div>

              {/* Produk */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📦 Produk
                </label>
                <select
                  value={form.productCode}
                  onChange={(e) => handleChange("productCode", e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all"
                >
                  <option value="">Pilih produk</option>
                  {productMasterData.map((product) => (
                    <option key={product.id} value={product.productCode}>
                      {product.productName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Qty Pallet */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📊 Qty yang Diambil (Pallet)
              </label>
              <input
                type="number"
                value={form.qtyPallet}
                onChange={(e) => handleChange("qtyPallet", e.target.value)}
                min="1"
                placeholder="Jumlah pallet"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all"
              />
            </div>
          </div>

          {/* FEFO Info Box */}
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-emerald-900 mb-1">
                  📍 Lokasi Pengambilan (FEFO - First Expired First Out):
                </h3>
                <p className="text-sm text-emerald-700">
                  💡 Pilih produk dan kuantitas terlebih dahulu untuk melihat rekomendasi lokasi pengambilan berdasarkan FEFO.
                </p>
              </div>
            </div>
          </div>

          {/* Ringkasan */}
          {form.productCode && (
            <div className="bg-slate-50 border-2 border-slate-300 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-slate-900 mb-3">📋 Ringkasan:</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Produk:</span>
                  <span className="font-semibold text-slate-900">
                    {selectedProduct?.productName || "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Qty Pallet Diminta:</span>
                  <span className="font-semibold text-slate-900">
                    {form.qtyPallet || "-"}
                  </span>
                </div>
                {/* --- START: Menampilkan Total Pcs Baru --- */}
                <div className="flex justify-between pt-2 border-t border-slate-300">
                  <span className="text-slate-600">Total Pcs Diambil:</span>
                  <span className="font-bold text-slate-900 text-lg">
                    {totalPcs.toLocaleString()} pcs
                  </span>
                </div>
                {/* --- END: Menampilkan Total Pcs Baru --- */}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-300">
                <p className="text-xs text-blue-700 font-medium">
                  ℹ️ Catatan: Sistem hanya menampilkan rekomendasi lokasi berdasarkan FEFO.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={calculateFEFO}
              type="button"
              className="flex-1 bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              🔍 Hitung Lokasi FEFO
            </button>
            <button
              onClick={handleReset}
              type="button"
              className="px-6 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
            >
              🔄 Reset
            </button>
          </div>

          {/* FEFO Locations Table */}
          {fefoLocations.length > 0 && (
            <div className="mt-8 border-t-2 border-gray-200 pt-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                📍 Lokasi Pengambilan (FEFO)
              </h2>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-orange-500 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-bold">No</th>
                      <th className="px-4 py-3 text-left text-sm font-bold">Lokasi</th>
                      <th className="px-4 py-3 text-left text-sm font-bold">BB Pallet</th>
                      <th className="px-4 py-3 text-left text-sm font-bold">Qty Ambil (Pallet)</th>
                      <th className="px-4 py-3 text-left text-sm font-bold">Expired Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fefoLocations.map((loc, index) => (
                      <tr
                        key={index}
                        className={`border-b border-gray-100 ${
                          loc.daysToExpire < 90
                            ? "bg-red-50"
                            : loc.daysToExpire < 180
                            ? "bg-yellow-50"
                            : "bg-white"
                        }`}
                      >
                        <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-semibold">
                            {loc.location}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700">
                          {loc.bbPallet}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-bold text-orange-700">
                            {loc.allocatedQtyPallet} pallet
                          </div>
                          <div className="text-xs text-gray-500">
                            (dari {loc.availableQtyPallet} pallet tersedia)
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-700">
                            {loc.expiredDate}
                          </div>
                          <div
                            className={`text-xs font-semibold ${
                              loc.daysToExpire < 90
                                ? "text-red-600"
                                : loc.daysToExpire < 180
                                ? "text-yellow-600"
                                : "text-green-600"
                            }`}
                          >
                            {loc.daysToExpire} days
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <p className="text-green-700 font-semibold">
                  ✓ Lokasi pengambilan sudah di-sort berdasarkan FEFO (First Expired First Out)
                </p>
                <p className="text-green-600 text-sm mt-1">
                  Ambil barang sesuai urutan untuk memastikan barang dengan expired date terdekat keluar terlebih dahulu.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}