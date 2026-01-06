"use client";

import { useState, useMemo } from "react";
import { Search, Calendar, FileDown, AlertCircle } from "lucide-react";
import { useToast, ToastContainer } from "@/components/toast";
import { reconcileStockOpname } from "../stock-opname/actions";
import { useRouter } from "next/navigation";
import * as XLSX from 'xlsx';

interface Props {
  initialHistory: any[];
  userProfile: any;
}

// Sub-component untuk Modal Body
function ModalBodyContent({
  selectedAudit,
  getPreviousAudit,
  formatDate,
  reconciliationNotes,
  handleNoteChange,
  isEditMode,
}: {
  selectedAudit: any;
  getPreviousAudit: (audit: any) => any | null;
  formatDate: (dateStr: string) => string;
  reconciliationNotes: { [productId: string]: string };
  handleNoteChange: (productId: string, value: string) => void;
  isEditMode: boolean;
}) {
  const previousAudit = getPreviousAudit(selectedAudit);

  // Calculate differences
  // Logika Hybrid: Jika ada audit sebelumnya, bandingkan dengan audit sebelumnya
  // Jika tidak ada (audit pertama), bandingkan dengan system_qty (snapshot)
  const comparisons = selectedAudit.prestock_opname_items.map((item: any) => {
    const prevItem = previousAudit?.prestock_opname_items.find((p: any) => p.product_id === item.product_id);

    // Jika ada audit lama, pakai audit lama. Jika tidak, pakai system_qty (snapshot) sebagai pembanding
    const comparisonQty = previousAudit ? (prevItem?.audit_qty || 0) : item.system_qty;
    const diff = item.audit_qty - comparisonQty;
    const isMatch = diff === 0;

    return {
      ...item,
      prevQty: comparisonQty,
      diff,
      isMatch,
    };
  });

  // Urutkan: BEDA dulu (berdasarkan absolute diff), baru SAMA
  const sortedComparisons = [...comparisons].sort((a, b) => {
    if (!a.isMatch && b.isMatch) return -1;
    if (a.isMatch && !b.isMatch) return 1;
    if (!a.isMatch && !b.isMatch) {
      return Math.abs(b.diff) - Math.abs(a.diff);
    }
    return 0;
  });

  const hasDifferences = sortedComparisons.some((c) => !c.isMatch);

  return (
    <>
      {/* Info Previous Audit or System Snapshot */}
      {previousAudit ? (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg mb-4">
          <p className="text-amber-900 text-sm">
            📌 <strong>Data Pembanding:</strong> Audit sebelumnya oleh <strong>{previousAudit.auditor?.full_name || '-'}</strong> pada {formatDate(previousAudit.audit_date)} {previousAudit.audit_time}
          </p>
        </div>
      ) : (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg mb-4">
          <p className="text-blue-900 text-sm">
            ℹ️ <strong>Audit Pertama:</strong> Data pembanding menggunakan <strong>System Snapshot</strong> (stock sistem saat audit dilakukan). Validasi fisik vs sistem.
          </p>
        </div>
      )}

      {!hasDifferences && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-lg mb-4">
          <p className="text-emerald-900 text-sm">
            ✓ <strong>Semua produk cocok!</strong> Tidak ada selisih dengan data pembanding.
          </p>
        </div>
      )}

      {/* Comparison Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 border-b-2 border-slate-200">
            <tr className="text-left text-xs font-semibold text-slate-700">
              <th className="px-4 py-3 whitespace-nowrap">Kode Produk</th>
              <th className="px-4 py-3 whitespace-nowrap">Nama Produk</th>
              <th className="px-4 py-3 text-center whitespace-nowrap bg-amber-50">
                {previousAudit ? 'Stock Sebelumnya' : 'System Snapshot'}<br />
                <span className="text-[10px] font-normal text-slate-500">
                  {previousAudit ? `(${previousAudit.auditor?.full_name || '-'})` : '(Stock Sistem saat Audit)'}
                </span>
              </th>
              <th className="px-4 py-3 text-center whitespace-nowrap bg-blue-50">
                Stock Saat Ini<br />
                <span className="text-[10px] font-normal text-slate-500">({selectedAudit.auditor?.full_name || '-'})</span>
              </th>
              <th className="px-4 py-3 text-center whitespace-nowrap bg-orange-50">Selisih</th>
              <th className="px-4 py-3 text-center whitespace-nowrap bg-purple-50">Rekonsel</th>
              <th className="px-4 py-3 whitespace-nowrap bg-rose-50">
                Alasan Selisih {hasDifferences && '*'}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedComparisons.map((comp) => (
              <tr
                key={comp.product_id}
                className={`border-t border-slate-100 ${!comp.isMatch ? 'bg-rose-50/30' : ''}`}
              >
                <td className="px-4 py-3 font-mono text-xs">{comp.products.product_code}</td>
                <td className="px-4 py-3 font-medium">{comp.products.product_name}</td>
                <td className="px-4 py-3 text-center font-bold bg-amber-50/30">{comp.prevQty}</td>
                <td className="px-4 py-3 text-center font-bold bg-blue-50/30">{comp.audit_qty}</td>
                <td className="px-4 py-3 text-center font-bold bg-orange-50/30">
                  {comp.diff !== 0 ? (
                    <span className="text-rose-700">
                      {comp.diff > 0 ? `+${comp.diff}` : comp.diff}
                    </span>
                  ) : (
                    <span className="text-emerald-700">0</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center bg-purple-50/30">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                      comp.isMatch
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                    }`}
                  >
                    {comp.isMatch ? "✓ SAMA" : "✗ BEDA"}
                  </span>
                </td>
                <td className="px-4 py-3 bg-rose-50/30">
                  {!comp.isMatch ? (
                    <div>
                      <input
                        type="text"
                        disabled={selectedAudit.reconciliation_status === 'reconciled' && !isEditMode}
                        className={`w-full rounded-lg border-2 px-3 py-2 text-xs transition-all ${
                          selectedAudit.reconciliation_status === 'reconciled' && !isEditMode
                            ? 'bg-slate-100 cursor-not-allowed border-slate-300 text-slate-700'
                            : !reconciliationNotes[comp.product_id]?.trim()
                            ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                            : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        }`}
                        placeholder="Wajib diisi! Contoh: Barang masuk saat shift..."
                        value={reconciliationNotes[comp.product_id] || ""}
                        onChange={(e) => handleNoteChange(comp.product_id, e.target.value)}
                      />
                      {!reconciliationNotes[comp.product_id]?.trim() && (selectedAudit.reconciliation_status === 'pending' || isEditMode) && (
                        <p className="text-[10px] text-red-600 mt-1 font-semibold">
                          ❌ Wajib isi alasan!
                        </p>
                      )}
                      {selectedAudit.reconciliation_status === 'reconciled' && !isEditMode && reconciliationNotes[comp.product_id] && (
                        <p className="text-[10px] text-green-700 mt-1 font-semibold">
                          ✓ Alasan sudah diisi sebelumnya
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 italic">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function PrestockOpnameHistoryClient({ initialHistory, userProfile }: Props) {
  const router = useRouter();
  const { showToast, toasts, removeToast } = useToast();
  
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "pending" | "reconciled">("ALL");
  
  // Modal state
  const [selectedAudit, setSelectedAudit] = useState<any | null>(null);
  const [showReconsilModal, setShowReconsilModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Reconciliation state
  const [reconciliationNotes, setReconciliationNotes] = useState<{ [productId: string]: string }>({});

  // Filtered data
  const filteredData = useMemo(() => {
    return initialHistory.filter((audit) => {
      // Status filter
      if (statusFilter !== "ALL" && audit.reconciliation_status !== statusFilter) {
        return false;
      }

      // Date filter
      if (dateFilter && audit.audit_date !== dateFilter) {
        return false;
      }

      // Search filter
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchAuditor = audit.auditor?.full_name?.toLowerCase().includes(query) || 
                            audit.auditor?.username?.toLowerCase().includes(query);
        const matchCode = audit.opname_code?.toLowerCase().includes(query);
        return matchAuditor || matchCode;
      }

      return true;
    });
  }, [initialHistory, statusFilter, dateFilter, searchQuery]);

  // Format tanggal Indonesia
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  // Get previous audit untuk comparison (berdasarkan warehouse yang sama)
  const getPreviousAudit = (currentAudit: any): any | null => {
    // Cari audit sebelumnya dari warehouse yang sama
    const sameWarehouseAudits = initialHistory.filter(
      (a) => a.warehouse_id === currentAudit.warehouse_id
    );
    
    // Urutkan berdasarkan created_at descending (terbaru ke terlama)
    const sortedAudits = sameWarehouseAudits.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    // Cari index audit saat ini
    const currentIndex = sortedAudits.findIndex((a) => a.id === currentAudit.id);
    
    // Jika tidak ada atau ini adalah audit paling lama, return null
    if (currentIndex === -1 || currentIndex === sortedAudits.length - 1) {
      return null;
    }
    
    // Return audit sebelumnya (index + 1 karena sudah diurutkan terbaru ke terlama)
    return sortedAudits[currentIndex + 1];
  };

  // Open reconciliation modal
  const handleOpenReconsil = (audit: any) => {
    setSelectedAudit(audit);
    setShowReconsilModal(true);
    setIsEditMode(audit.reconciliation_status === "pending");
    
    // Pre-fill notes if already reconciled
    if (audit.reconciliation_status === "reconciled") {
      const notes: { [productId: string]: string } = {};
      audit.prestock_opname_items.forEach((item: any) => {
        if (item.reconciliation_reason) {
          notes[item.product_id] = item.reconciliation_reason;
        }
      });
      setReconciliationNotes(notes);
    } else {
      setReconciliationNotes({});
    }
  };

  // Handle note change
  const handleNoteChange = (productId: string, value: string) => {
    setReconciliationNotes(prev => ({
      ...prev,
      [productId]: value
    }));
  };

  // Save reconciliation
  const handleSaveReconciliation = async () => {
    if (!selectedAudit) return;

    const previousAudit = getPreviousAudit(selectedAudit);

    // Cek apakah semua yang selisih sudah ada alasan
    const needsReason = selectedAudit.prestock_opname_items.filter((item: any) => {
      const prevItem = previousAudit?.prestock_opname_items.find((p: any) => p.product_id === item.product_id);
      
      // Logika hybrid: bandingkan dengan previous audit atau system snapshot
      const comparisonQty = previousAudit ? (prevItem?.audit_qty || 0) : item.system_qty;
      const diff = item.audit_qty - comparisonQty;
      
      return diff !== 0;
    });

    const missingReason = needsReason.find((i: any) => !reconciliationNotes[i.product_id]?.trim());

    if (missingReason) {
      showToast(`⚠️ Alasan untuk ${missingReason.products.product_name} wajib diisi!`, "error");
      return;
    }

    setIsSubmitting(true);
    const notes = Object.entries(reconciliationNotes).map(([productId, reason]) => ({
      productId,
      reason
    }));

    const res = await reconcileStockOpname(selectedAudit.id, notes);
    if (res.success) {
      showToast("✓ Laporan audit berhasil direkonsel.", "success");
      setShowReconsilModal(false);
      setSelectedAudit(null);
      setReconciliationNotes({});
      router.refresh();
    } else {
      showToast(`❌ ${res.message}`, "error");
    }
    setIsSubmitting(false);
  };

  // Export to Excel (History Table)
  const handleExport = () => {
    const exportData = filteredData.map((audit, index) => ({
      'No': index + 1,
      'Kode Opname': audit.opname_code,
      'Tanggal': formatDate(audit.audit_date),
      'Waktu': audit.audit_time,
      'Nama Auditor': audit.auditor?.full_name || '-',
      'Total Produk': audit.prestock_opname_items.length,
      'Status Rekonsel': audit.reconciliation_status === 'reconciled' ? 'Sudah Direkonsel' : 'Belum Direkonsel',
      'Direkonsel Oleh': audit.reconciler?.full_name || '-',
      'Waktu Rekonsel': audit.reconciled_at ? new Date(audit.reconciled_at).toLocaleString('id-ID') : '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'History Pre-Stock Opname');

    // Set column widths
    const colWidths = [
      { wch: 5 },  // No
      { wch: 20 }, // Kode Opname
      { wch: 12 }, // Tanggal
      { wch: 10 }, // Waktu
      { wch: 25 }, // Nama Auditor
      { wch: 12 }, // Total Produk
      { wch: 18 }, // Status Rekonsel
      { wch: 25 }, // Direkonsel Oleh
      { wch: 20 }, // Waktu Rekonsel
    ];
    ws['!cols'] = colWidths;

    const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
    XLSX.writeFile(wb, `Riwayat_PreStock_Opname_${timestamp}.xlsx`);
    
    showToast("✓ Data berhasil diekspor ke Excel!", "success");
  };

  // Export detail reconciliation
  const handleExportDetail = () => {
    if (!selectedAudit || selectedAudit.reconciliation_status !== 'reconciled') {
      showToast("❌ Data belum direkonsel, tidak bisa diekspor!", "error");
      return;
    }

    const previousAudit = getPreviousAudit(selectedAudit);

    // Build metadata header dengan info pembanding
    const comparisonInfo = previousAudit 
      ? `Audit sebelumnya oleh ${previousAudit.auditor?.full_name || '-'} pada ${formatDate(previousAudit.audit_date)} ${previousAudit.audit_time}`
      : 'System Snapshot (Stock Sistem saat Audit)';

    const metadataHeader = [
      { A: 'DETAIL REKONSEL PRE-STOCK OPNAME' },
      { A: '' },
      { A: 'Kode Opname', B: selectedAudit.opname_code },
      { A: 'Tanggal Audit', B: `${formatDate(selectedAudit.audit_date)} ${selectedAudit.audit_time}` },
      { A: 'Nama Auditor', B: selectedAudit.auditor?.full_name || '-' },
      { A: 'Data Pembanding', B: comparisonInfo },
      { A: 'Direkonsel Oleh', B: selectedAudit.reconciler?.full_name || '-' },
      { A: 'Waktu Rekonsel', B: selectedAudit.reconciled_at ? new Date(selectedAudit.reconciled_at).toLocaleString('id-ID') : '-' },
      { A: '' },
    ];

    // Build comparison data dengan logika hybrid
    const comparisonData = selectedAudit.prestock_opname_items.map((item: any) => {
      const prevItem = previousAudit?.prestock_opname_items.find((p: any) => p.product_id === item.product_id);
      
      // Logika hybrid: jika ada audit sebelumnya, pakai audit_qty. Jika tidak, pakai system_qty
      const comparisonQty = previousAudit ? (prevItem?.audit_qty || 0) : item.system_qty;
      const diff = item.audit_qty - comparisonQty;
      const isMatch = diff === 0;
      const reason = item.reconciliation_reason || '-';

      // Label kolom dinamis
      const comparisonLabel = previousAudit ? 'Stock Sebelumnya' : 'System Snapshot';

      return {
        'Kode Produk': item.products.product_code,
        'Nama Produk': item.products.product_name,
        [comparisonLabel]: comparisonQty,
        'Stock Saat Ini': item.audit_qty,
        'Selisih': diff,
        'Status': isMatch ? 'SAMA' : 'BEDA',
        'Alasan Selisih': reason,
      };
    });

    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Create worksheet dengan metadata header
    const ws = XLSX.utils.json_to_sheet(metadataHeader, { skipHeader: true });
    
    // Append comparison data
    XLSX.utils.sheet_add_json(ws, comparisonData, { origin: -1 });

    // Merge cells untuk header
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // Merge title row
    ];

    // Set column widths
    const colWidths = [
      { wch: 12 }, // Kode Produk
      { wch: 45 }, // Nama Produk
      { wch: 18 }, // Stock Sebelumnya
      { wch: 15 }, // Stock Saat Ini
      { wch: 10 }, // Selisih
      { wch: 10 }, // Status
      { wch: 60 }, // Alasan Selisih
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Detail Rekonsel');

    const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
    const fileName = `Detail_Rekonsel_${selectedAudit.opname_code}_${timestamp}.xlsx`;
    XLSX.writeFile(wb, fileName);
    showToast("✓ Detail rekonsel berhasil diekspor ke Excel!", "success");
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <header className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            📊 Riwayat Pre-Stock Opname
          </h1>
          <button
            onClick={handleExport}
            disabled={filteredData.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 transition-all shadow-md disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            <FileDown className="w-4 h-4" />
            Export Excel
          </button>
        </div>
        <p className="text-sm text-slate-600">
          Kelola dan rekonsel data pre-stock opname dari admin warehouse
        </p>
      </header>

      {/* Filters */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <Search className="inline w-4 h-4 mr-1" />
              Cari Auditor / Kode
            </label>
            <input
              type="text"
              placeholder="Ketik nama auditor atau kode opname..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <Calendar className="inline w-4 h-4 mr-1" />
              Filter Tanggal
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              📋 Status Rekonsel
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "ALL" | "pending" | "reconciled")}
              className="w-full rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            >
              <option value="ALL">Semua Status</option>
              <option value="pending">Belum Direkonsel</option>
              <option value="reconciled">Sudah Direkonsel</option>
            </select>
          </div>
        </div>

        {/* Reset Filter */}
        {(searchQuery || dateFilter || statusFilter !== "ALL") && (
          <div className="mt-4">
            <button
              onClick={() => {
                setSearchQuery("");
                setDateFilter("");
                setStatusFilter("ALL");
              }}
              className="rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
            >
              🔄 Reset Filter
            </button>
          </div>
        )}
      </section>

      {/* Table */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b-2 border-slate-200">
              <tr className="text-left text-xs font-semibold text-slate-700">
                <th className="px-4 py-3 whitespace-nowrap">No</th>
                <th className="px-4 py-3 whitespace-nowrap">Tanggal</th>
                <th className="px-4 py-3 whitespace-nowrap">Waktu</th>
                <th className="px-4 py-3 whitespace-nowrap">Nama Auditor</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">Total Produk</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">Status Rekonsel</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    📭 Tidak ada data yang sesuai dengan filter
                  </td>
                </tr>
              ) : (
                filteredData.map((audit, index) => (
                  <tr
                    key={audit.id}
                    className="border-t border-slate-100 hover:bg-blue-50/50 transition-colors"
                  >
                    <td className="px-4 py-3">{index + 1}</td>
                    <td className="px-4 py-3">{formatDate(audit.audit_date)}</td>
                    <td className="px-4 py-3 font-mono">{audit.audit_time}</td>
                    <td className="px-4 py-3 font-medium">{audit.auditor?.full_name || '-'}</td>
                    <td className="px-4 py-3 text-center font-bold">{audit.prestock_opname_items.length}</td>
                    <td className="px-4 py-3 text-center">
                      {audit.reconciliation_status === 'reconciled' ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white">
                          ✓ Sudah Direkonsel
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white">
                          ⏳ Belum Direkonsel
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleOpenReconsil(audit)}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600 transition-all"
                      >
                        ⚖️ Cek Rekonsel
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Reconciliation Modal */}
      {showReconsilModal && selectedAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col">
            {/* Modal Header - Sticky */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-1">
                    ⚖️ Rekonsel Pre-Stock Opname
                  </h3>
                  <p className="text-blue-100 text-sm">
                    {selectedAudit.opname_code} | Auditor: {selectedAudit.auditor?.full_name || '-'} | {formatDate(selectedAudit.audit_date)} {selectedAudit.audit_time}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedAudit.reconciliation_status === 'reconciled' && (
                    <button
                      onClick={handleExportDetail}
                      className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 transition-all shadow-lg"
                    >
                      <FileDown className="w-4 h-4" />
                      Export Detail
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowReconsilModal(false);
                      setIsEditMode(false);
                    }}
                    className="text-white hover:bg-white/20 rounded-lg p-2 transition-all"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              <ModalBodyContent
                selectedAudit={selectedAudit}
                getPreviousAudit={getPreviousAudit}
                formatDate={formatDate}
                reconciliationNotes={reconciliationNotes}
                handleNoteChange={handleNoteChange}
                isEditMode={isEditMode}
              />
            </div>

            {/* Modal Footer - Sticky */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 sticky bottom-0">
              {selectedAudit.reconciliation_status === 'reconciled' && !isEditMode ? (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    ✓ <strong>Sudah Direkonsel</strong> oleh {selectedAudit.reconciler?.full_name || '-'} pada {selectedAudit.reconciled_at ? new Date(selectedAudit.reconciled_at).toLocaleString('id-ID') : '-'}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditMode(true)}
                      className="rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-all"
                    >
                      ✏️ Edit Rekonsel
                    </button>
                    <button
                      onClick={() => {
                        setShowReconsilModal(false);
                        setIsEditMode(false);
                      }}
                      className="rounded-lg border-2 border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-600">
                    {isEditMode && (
                      <span className="text-amber-700 font-semibold">
                        📝 Mode Edit - Ubah alasan jika diperlukan
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveReconciliation}
                      disabled={isSubmitting}
                      className="rounded-lg bg-blue-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 transition-all shadow-lg disabled:bg-slate-400 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? '⏳ Menyimpan...' : '💾 Simpan Rekonsel'}
                    </button>
                    <button
                      onClick={() => {
                        setShowReconsilModal(false);
                        setIsEditMode(false);
                      }}
                      disabled={isSubmitting}
                      className="rounded-lg border-2 border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
