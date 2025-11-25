"use client";

import { useMemo, useState } from "react";
import { STOCK_LIST_MOCK } from "@/lib/mock/stocklistmock";

type StatusColor =
  | "green" // RELEASE
  | "red" // HOLD
  | "gray" // qty carton only / info lain
  | "empty";

type WarehouseCellStatus = "RELEASE" | "HOLD";

export type WarehouseCell = {
  id: string;
  cluster: "A" | "B" | "C" | "D" | "E";
  lorong: string; // contoh: "L1 - BARIS 1"
  pallet: number; // nomor pallet (P1, P2, dst)
  product?: string;
  batch?: string;
  qtyPallet?: number;
  qtyCarton?: number;
  status?: WarehouseCellStatus;
  colorCode?: StatusColor;
};

const colorMap: Record<StatusColor, string> = {
  green: "bg-emerald-500",
  red: "bg-rose-500",
  gray: "bg-slate-400",
  empty: "bg-white border-2 border-dashed border-slate-200",
};

// 👉 Generate warehouse cells from STOCK_LIST_MOCK
function generateWarehouseCells(): WarehouseCell[] {
  return STOCK_LIST_MOCK.map((row) => {
    const lorong = `${row.aisle} - ${row.row}`;
    
    let colorCode: StatusColor = "green";
    let status: WarehouseCellStatus = "RELEASE";
    
    if (row.status === "HOLD") {
      colorCode = "red";
      status = "HOLD";
    } else if (row.qtyPallet === 0 && row.qtyCarton > 0) {
      colorCode = "gray";
    }
    
    return {
      id: `${row.cluster}-${row.aisle}-${row.pallet}`,
      cluster: row.cluster,
      lorong,
      pallet: row.pallet,
      product: row.product,
      batch: row.batch,
      qtyPallet: row.qtyPallet,
      qtyCarton: row.qtyCarton,
      status,
      colorCode,
    };
  });
}

type PalletInfoModalProps = {
  cell: WarehouseCell | null;
  open: boolean;
  onClose: () => void;
};

function PalletInfoModal({ cell, open, onClose }: PalletInfoModalProps) {
  if (!open || !cell) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-blue-500 px-4 sm:px-6 py-4 sm:py-5 rounded-t-2xl sticky top-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-white">
              Detail Pallet
            </h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl font-light transition-colors w-8 h-8 flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
              <p className="text-xs font-medium text-slate-500 mb-1">Produk</p>
              <p className="font-semibold text-slate-900 text-xs sm:text-sm wrap-break-word">
                {cell.product ?? "-"}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
              <p className="text-xs font-medium text-slate-500 mb-1">Batch (BB)</p>
              <p className="font-semibold text-slate-900 text-xs sm:text-sm">
                {cell.batch ?? "-"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-emerald-50 rounded-lg p-3 sm:p-4 border border-emerald-200">
              <p className="text-xs font-medium text-emerald-700 mb-1">Qty Pallet</p>
              <p className="text-2xl sm:text-3xl font-bold text-emerald-600">
                {cell.qtyPallet ?? 0}
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border border-blue-200">
              <p className="text-xs font-medium text-blue-700 mb-1">Qty Carton</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600">
                {cell.qtyCarton ?? 0}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
              <p className="text-xs font-medium text-slate-500 mb-1">Cluster</p>
              <p className="font-semibold text-slate-900">{cell.cluster}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
              <p className="text-xs font-medium text-slate-500 mb-1">Lorong</p>
              <p className="font-semibold text-slate-900 text-xs sm:text-sm">{cell.lorong}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
              <p className="text-xs font-medium text-slate-500 mb-1">Pallet</p>
              <p className="font-semibold text-slate-900">P{cell.pallet}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
              <p className="text-xs font-medium text-slate-500 mb-1">Status</p>
              <p className="font-semibold text-slate-900 text-xs sm:text-sm">
                {cell.status ?? "-"}
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-blue-500 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-600 transition-all shadow-lg hover:shadow-xl active:scale-98"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

export function WarehouseLayout() {
  const [selectedCell, setSelectedCell] = useState<WarehouseCell | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "RELEASE" | "HOLD">("ALL");

  // Generate cells from mock data
  const warehouseCells = useMemo(() => generateWarehouseCells(), []);

  // Filter cells based on search query and status filter
  const filteredCells = useMemo(() => {
    return warehouseCells.filter((cell) => {
      // Filter by status
      if (statusFilter !== "ALL" && cell.status !== statusFilter) {
        return false;
      }
      
      // Filter by search query (product name)
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const productMatch = cell.product?.toLowerCase().includes(query);
        const batchMatch = cell.batch?.toLowerCase().includes(query);
        return productMatch || batchMatch;
      }
      
      return true;
    });
  }, [warehouseCells, searchQuery, statusFilter]);

  // Group cells by cluster
  const cellsByCluster = useMemo(() => {
    return filteredCells.reduce((acc, cell) => {
      if (!acc[cell.cluster]) acc[cell.cluster] = [];
      acc[cell.cluster].push(cell);
      return acc;
    }, {} as Record<string, WarehouseCell[]>);
  }, [filteredCells]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
          Layout Gudang
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          Peta lokasi stok produk (mock data). Nantinya akan membaca langsung
          dari tabel <code className="bg-slate-100 px-2 py-0.5 rounded text-xs">locations</code> dan{" "}
          <code className="bg-slate-100 px-2 py-0.5 rounded text-xs">stocks</code> di
          database.
        </p>
      </div>

      {/* Quick Filter & Search */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              🔍 Search Produk / Batch
            </label>
            <input
              type="text"
              placeholder="Cari nama produk atau batch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border-2 border-slate-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
          </div>
          <div className="sm:w-48">
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              📊 Filter Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "ALL" | "RELEASE" | "HOLD")}
              className="w-full rounded-lg border-2 border-slate-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            >
              <option value="ALL">Semua Status</option>
              <option value="RELEASE">Release</option>
              <option value="HOLD">Hold</option>
            </select>
          </div>
          {(searchQuery || statusFilter !== "ALL") && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                }}
                className="rounded-lg border-2 border-slate-300 bg-white px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all"
              >
                🔄 Reset
              </button>
            </div>
          )}
        </div>
        {filteredCells.length === 0 && (
          <div className="mt-4 text-center py-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-900 font-medium">
              ⚠️ Tidak ada pallet yang sesuai dengan filter
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Coba ubah kata kunci atau filter status
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 sm:gap-6">
        {/* Main Grid Area */}
        <div className="xl:col-span-3">
          <div className="space-y-4 sm:space-y-6">
            {(["A", "B", "C", "D", "E"] as const).map((cluster) => (
              <div key={cluster} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
                <h2 className="mb-4 sm:mb-5 text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="bg-blue-500 text-white w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs sm:text-sm">
                    {cluster}
                  </span>
                  <span className="hidden sm:inline">Cluster {cluster}</span>
                  <span className="sm:hidden">{cluster}</span>
                </h2>
                <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 sm:gap-3">
                  {cellsByCluster[cluster]?.map((cell) => {
                    const isFilled = !!cell.product;
                    const colorKey: StatusColor = isFilled
                      ? cell.colorCode ?? "green"
                      : "empty";

                    return (
                      <button
                        key={cell.id}
                        type="button"
                        onClick={() =>
                          cell.product ? setSelectedCell(cell) : null
                        }
                        className={`
                          h-16 sm:h-20 rounded-lg flex flex-col items-center justify-center
                          ${colorMap[colorKey]}
                          ${
                            isFilled
                              ? "cursor-pointer hover:scale-105 hover:shadow-lg transition-all active:scale-95"
                              : "cursor-default"
                          }
                          text-[10px] sm:text-xs font-medium text-white shadow-sm
                        `}
                      >
                        {isFilled ? (
                          <>
                            <div className="w-full truncate px-1 text-center font-semibold leading-tight">
                              {cell.product!.split(" ")[0]}
                            </div>
                            <div className="opacity-90 text-[9px] sm:text-[10px] mt-0.5">P{cell.pallet}</div>
                          </>
                        ) : (
                          <div className="text-slate-300 font-medium text-xs">P{cell.pallet}</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend Panel */}
        <div className="xl:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 xl:sticky xl:top-6">
            <h3 className="mb-4 sm:mb-5 text-base sm:text-lg font-bold text-slate-900">Legend</h3>
            <div className="space-y-3 sm:space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-emerald-500 shadow-sm shrink-0" />
                <div>
                  <p className="font-semibold text-slate-900 text-xs sm:text-sm">Release</p>
                  <p className="text-[10px] sm:text-xs text-slate-500">Produk normal (siap keluar)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-rose-500 shadow-sm shrink-0" />
                <div>
                  <p className="font-semibold text-slate-900 text-xs sm:text-sm">Hold</p>
                  <p className="text-[10px] sm:text-xs text-slate-500">Produk ditahan (tidak bisa keluar)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-slate-400 shadow-sm shrink-0" />
                <div>
                  <p className="font-semibold text-slate-900 text-xs sm:text-sm">Qty Carton</p>
                  <p className="text-[10px] sm:text-xs text-slate-500">Hanya ada carton (tanpa pallet)</p>
                </div>
              </div>
            </div>

            <div className="mt-4 sm:mt-6 rounded-lg bg-blue-50 border border-blue-100 p-3 sm:p-4 text-[10px] sm:text-xs text-slate-700">
              <p className="font-semibold text-blue-900 mb-1">💡 Tip:</p>
              <p>
                Klik pada kotak yang berwarna untuk melihat detail produk di pallet
                tersebut. Sistem menggunakan FIFO (First In First Out).
              </p>
            </div>
          </div>
        </div>
      </div>

      <PalletInfoModal
        cell={selectedCell}
        open={!!selectedCell}
        onClose={() => setSelectedCell(null)}
      />
    </div>
  );
}
