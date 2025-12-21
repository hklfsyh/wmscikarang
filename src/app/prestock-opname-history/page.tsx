"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Calendar, FileDown } from "lucide-react";
import { useToast, ToastContainer } from "@/components/toast";
import {
  getPrestockOpnameHistory,
  savePrestockOpnameHistory,
  type PrestockOpnameHistory,
  type ReconciliationNote,
} from "@/lib/mock/prestock-opname-history";
import * as XLSX from 'xlsx';

export default function PrestockOpnameHistoryPage() {
  const { showToast, toasts, removeToast } = useToast();
  
  // State
  const [historyData, setHistoryData] = useState<PrestockOpnameHistory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "pending" | "reconciled">("ALL");
  
  // Modal state
  const [selectedAudit, setSelectedAudit] = useState<PrestockOpnameHistory | null>(null);
  const [showReconsilModal, setShowReconsilModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Reconciliation state
  const [reconciliationNotes, setReconciliationNotes] = useState<{ [productCode: string]: string }>({});
  const superadminName = "Superadmin 1"; // Hardcoded untuk demo

  // Load data on mount
  useEffect(() => {
    const data = getPrestockOpnameHistory();
    setHistoryData(data);
  }, []);

  // Filtered data
  const filteredData = useMemo(() => {
    return historyData.filter((audit) => {
      // Status filter
      if (statusFilter !== "ALL" && audit.reconciliationStatus !== statusFilter) {
        return false;
      }

      // Date filter
      if (dateFilter && audit.auditDate !== dateFilter) {
        return false;
      }

      // Search filter
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchAuditor = audit.auditorName.toLowerCase().includes(query);
        const matchId = audit.id.toLowerCase().includes(query);
        return matchAuditor || matchId;
      }

      return true;
    });
  }, [historyData, searchQuery, dateFilter, statusFilter]);

  // Get previous audit untuk comparison
  const getPreviousAudit = (currentAuditId: string): PrestockOpnameHistory | null => {
    const currentIndex = historyData.findIndex((a) => a.id === currentAuditId);
    if (currentIndex === -1 || currentIndex === historyData.length - 1) {
      return null; // Tidak ada data sebelumnya (ini adalah data paling lama)
    }
    // Array diurutkan dari TERBARU ke TERLAMA (index 0 = paling baru)
    // Jadi index+1 adalah data yang lebih LAMA (sebelumnya)
    return historyData[currentIndex + 1];
  };

  // Handle open reconciliation modal
  const handleOpenReconsilModal = (audit: PrestockOpnameHistory) => {
    setSelectedAudit(audit);
    setShowReconsilModal(true);
    setIsEditMode(false);
    
    // Load existing notes if already reconciled
    if (audit.reconciliationStatus === 'reconciled') {
      const notesMap: { [key: string]: string } = {};
      audit.reconciliationNotes.forEach((note) => {
        notesMap[note.productCode] = note.reason;
      });
      setReconciliationNotes(notesMap);
    } else {
      setReconciliationNotes({});
    }
  };

  // Handle save reconciliation
  const handleSaveReconciliation = () => {
    if (!selectedAudit) return;

    // Validasi: cek apakah semua produk dengan selisih sudah ada alasan
    const previousAudit = getPreviousAudit(selectedAudit.id);
    const errors: string[] = [];

    selectedAudit.items.forEach((item) => {
      const prevItem = previousAudit?.items.find((p) => p.productCode === item.productCode);
      const prevQty = prevItem?.auditQty || 0;
      const diff = item.auditQty - prevQty;

      if (diff !== 0 && !reconciliationNotes[item.productCode]?.trim()) {
        errors.push(`Produk ${item.productName} memiliki selisih tetapi belum ada alasan!`);
      }
    });

    if (errors.length > 0) {
      showToast("❌ " + errors[0], "error");
      return;
    }

    // Build reconciliation notes array
    const notes: ReconciliationNote[] = Object.entries(reconciliationNotes)
      .filter(([, reason]) => reason.trim() !== "")
      .map(([productCode, reason]) => ({
        productCode,
        reason,
        reconciledAt: new Date().toISOString(),
        reconciledBy: superadminName,
      }));

    // Update history
    const updatedHistory = historyData.map((audit) => {
      if (audit.id === selectedAudit.id) {
        return {
          ...audit,
          reconciliationStatus: 'reconciled' as const,
          reconciliationNotes: notes,
          reconciledAt: new Date().toISOString(),
          reconciledBy: superadminName,
        };
      }
      return audit;
    });

    setHistoryData(updatedHistory);
    savePrestockOpnameHistory(updatedHistory);

    showToast("✓ Rekonsel berhasil disimpan!", "success");
    setShowReconsilModal(false);
    setIsEditMode(false);
  };

  // Handle note change
  const handleNoteChange = (productCode: string, value: string) => {
    setReconciliationNotes((prev) => ({
      ...prev,
      [productCode]: value,
    }));
  };

  // Export to Excel (History Table)
  const exportToExcel = () => {
    const exportData = filteredData.map((audit, index) => ({
      'No': index + 1,
      'ID Audit': audit.id,
      'Tanggal': audit.auditDate,
      'Waktu': audit.auditTime,
      'Nama Auditor': audit.auditorName,
      'Total Produk': audit.items.length,
      'Status Rekonsel': audit.reconciliationStatus === 'reconciled' ? 'Sudah Direkonsel' : 'Belum Direkonsel',
      'Direkonsel Oleh': audit.reconciledBy || '-',
      'Waktu Rekonsel': audit.reconciledAt ? new Date(audit.reconciledAt).toLocaleString('id-ID') : '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'History Pre-Stock Opname');

    // Set column widths
    const colWidths = [
      { wch: 5 },  // No
      { wch: 20 }, // ID Audit
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

  // Export Reconciliation Detail to Excel (hanya untuk yang sudah direkonsel)
  const exportReconciliationToExcel = () => {
    if (!selectedAudit || selectedAudit.reconciliationStatus !== 'reconciled') {
      showToast("❌ Data belum direkonsel, tidak bisa diekspor!", "error");
      return;
    }

    const previousAudit = getPreviousAudit(selectedAudit.id);
    if (!previousAudit) {
      showToast("❌ Tidak ada data pembanding untuk diekspor!", "error");
      return;
    }

    // Build metadata header
    const metadataHeader = [
      { A: 'DETAIL REKONSEL PRE-STOCK OPNAME' },
      { A: '' },
      { A: 'ID Audit', B: selectedAudit.id },
      { A: 'Tanggal Audit', B: `${selectedAudit.auditDate} ${selectedAudit.auditTime}` },
      { A: 'Nama Auditor', B: selectedAudit.auditorName },
      { A: 'Direkonsel Oleh', B: selectedAudit.reconciledBy || '-' },
      { A: 'Waktu Rekonsel', B: selectedAudit.reconciledAt || '-' },
      { A: '' },
    ];

    // Build comparison data
    const comparisonData = selectedAudit.items.map((item) => {
      const prevItem = previousAudit.items.find((p) => p.productCode === item.productCode);
      const prevQty = prevItem?.auditQty || 0;
      const diff = item.auditQty - prevQty;
      const isMatch = diff === 0;
      
      // Cari alasan dari reconciliationNotes
      const note = selectedAudit.reconciliationNotes.find((n) => n.productCode === item.productCode);
      const reason = note?.reason || '-';

      return {
        'Kode Produk': item.productCode,
        'Nama Produk': item.productName,
        'Stock Sebelumnya': prevQty,
        'Stock Saat Ini': item.auditQty,
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
    const fileName = `Detail_Rekonsel_${selectedAudit.id}_${timestamp}.xlsx`;
    XLSX.writeFile(wb, fileName);
    showToast("✓ Detail rekonsel berhasil diekspor ke Excel!", "success");
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
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
            onClick={exportToExcel}
            className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 transition-all shadow-md"
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
              Cari Auditor / ID
            </label>
            <input
              type="text"
              placeholder="Ketik nama auditor atau ID..."
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
                    <td className="px-4 py-3">{formatDate(audit.auditDate)}</td>
                    <td className="px-4 py-3 font-mono">{audit.auditTime}</td>
                    <td className="px-4 py-3 font-medium">{audit.auditorName}</td>
                    <td className="px-4 py-3 text-center font-bold">{audit.items.length}</td>
                    <td className="px-4 py-3 text-center">
                      {audit.reconciliationStatus === 'reconciled' ? (
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
                        onClick={() => handleOpenReconsilModal(audit)}
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
                    ID: {selectedAudit.id} | Auditor: {selectedAudit.auditorName} | {formatDate(selectedAudit.auditDate)} {selectedAudit.auditTime}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedAudit.reconciliationStatus === 'reconciled' && (
                    <button
                      onClick={exportReconciliationToExcel}
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
              {(() => {
                const previousAudit = getPreviousAudit(selectedAudit.id);
                
                if (!previousAudit) {
                  return (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
                      <p className="text-blue-900 text-sm">
                        ℹ️ Ini adalah audit pertama, tidak ada data sebelumnya untuk dibandingkan.
                      </p>
                    </div>
                  );
                }

                // Calculate differences
                const comparisons = selectedAudit.items.map((item) => {
                  const prevItem = previousAudit.items.find((p) => p.productCode === item.productCode);
                  const prevQty = prevItem?.auditQty || 0;
                  const diff = item.auditQty - prevQty;
                  const isMatch = diff === 0;

                  return {
                    ...item,
                    prevQty,
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
                    {/* Info Previous Audit */}
                    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg mb-4">
                      <p className="text-amber-900 text-sm">
                        📌 <strong>Data Pembanding:</strong> Audit sebelumnya oleh <strong>{previousAudit.auditorName}</strong> pada {formatDate(previousAudit.auditDate)} {previousAudit.auditTime}
                      </p>
                    </div>

                    {!hasDifferences && (
                      <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-lg mb-4">
                        <p className="text-emerald-900 text-sm">
                          ✓ <strong>Semua produk cocok!</strong> Tidak ada selisih dengan audit sebelumnya.
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
                              Stock Sebelumnya<br/>
                              <span className="text-[10px] font-normal text-slate-500">({previousAudit.auditorName})</span>
                            </th>
                            <th className="px-4 py-3 text-center whitespace-nowrap bg-blue-50">
                              Stock Saat Ini<br/>
                              <span className="text-[10px] font-normal text-slate-500">({selectedAudit.auditorName})</span>
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
                              key={comp.productCode}
                              className={`border-t border-slate-100 ${!comp.isMatch ? 'bg-rose-50/30' : ''}`}
                            >
                              <td className="px-4 py-3 font-mono text-xs">{comp.productCode}</td>
                              <td className="px-4 py-3 font-medium">{comp.productName}</td>
                              <td className="px-4 py-3 text-center font-bold bg-amber-50/30">{comp.prevQty}</td>
                              <td className="px-4 py-3 text-center font-bold bg-blue-50/30">{comp.auditQty}</td>
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
                                      disabled={selectedAudit.reconciliationStatus === 'reconciled' && !isEditMode}
                                      className={`w-full rounded-lg border-2 px-3 py-2 text-xs transition-all ${
                                        selectedAudit.reconciliationStatus === 'reconciled' && !isEditMode
                                          ? 'bg-slate-100 cursor-not-allowed border-slate-300 text-slate-700'
                                          : !reconciliationNotes[comp.productCode]?.trim()
                                          ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                                          : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                      }`}
                                      placeholder="Wajib diisi! Contoh: Barang masuk saat shift..."
                                      value={reconciliationNotes[comp.productCode] || ""}
                                      onChange={(e) => handleNoteChange(comp.productCode, e.target.value)}
                                    />
                                    {!reconciliationNotes[comp.productCode]?.trim() && (selectedAudit.reconciliationStatus === 'pending' || isEditMode) && (
                                      <p className="text-[10px] text-red-600 mt-1 font-semibold">
                                        ❌ Wajib isi alasan!
                                      </p>
                                    )}
                                    {selectedAudit.reconciliationStatus === 'reconciled' && !isEditMode && reconciliationNotes[comp.productCode] && (
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
              })()}
            </div>

            {/* Modal Footer - Sticky */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 sticky bottom-0">
              {selectedAudit.reconciliationStatus === 'reconciled' && !isEditMode ? (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    ✓ <strong>Sudah Direkonsel</strong> oleh {selectedAudit.reconciledBy} pada {selectedAudit.reconciledAt ? new Date(selectedAudit.reconciledAt).toLocaleString('id-ID') : '-'}
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
                      className="rounded-lg bg-blue-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 transition-all shadow-lg"
                    >
                      💾 Simpan Rekonsel
                    </button>
                    <button
                      onClick={() => {
                        setShowReconsilModal(false);
                        setIsEditMode(false);
                      }}
                      className="rounded-lg border-2 border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
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
