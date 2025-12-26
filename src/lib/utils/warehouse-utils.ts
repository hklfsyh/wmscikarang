// src/lib/utils/warehouse-utils.ts

import { stockListData, StockItem } from "../mock/stocklistmock";

/**
 * Struktur gudang:
 * - 4 Cluster (A, B, C, D)
 * - 11 Lorong per cluster (L1 - L11)
 * - 9 Baris per lorong (B1 - B9)
 * - 4 Pallet positions per baris (P1, P2, P3, P4)
 */

export interface LocationSlot {
  cluster: "A" | "B" | "C" | "D";
  lorong: string; // L1 - L11
  baris: string; // B1 - B9
  level: string; // P1, P2, P3, P4
  isEmpty: boolean;
  occupiedBy?: StockItem;
}

/**
 * Cek apakah lokasi tertentu sudah terisi
 */
export function isLocationOccupied(
  cluster: string,
  lorong: string,
  baris: string,
  level: string
): boolean {
  return stockListData.some(
    (stock: StockItem) =>
      stock.cluster === cluster &&
      stock.lorong === parseInt(lorong.replace('L', '')) &&
      stock.baris === parseInt(baris.replace('B', '')) &&
      stock.level === parseInt(level.replace('P', ''))
  );
}

/**
 * Generate semua slot di cluster tertentu
 */
export function getAllSlotsInCluster(cluster: "A" | "B" | "C" | "D"): LocationSlot[] {
  const slots: LocationSlot[] = [];

  const lorongList = ["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9", "L10", "L11"];
  
  for (const lorong of lorongList) {
    for (let barisNum = 1; barisNum <= 9; barisNum++) {
      const baris = `B${barisNum}`;
      
      for (let levelNum = 1; levelNum <= 4; levelNum++) {
        const level = `P${levelNum}`;
        const isEmpty = !isLocationOccupied(cluster, lorong, baris, level);
        const occupiedBy = stockListData.find(
          (stock: StockItem) =>
            stock.cluster === cluster &&
            stock.lorong === parseInt(lorong.replace('L', '')) &&
            stock.baris === parseInt(baris.replace('B', '')) &&
            stock.level === parseInt(level.replace('P', ''))
        );

        slots.push({
          cluster,
          lorong,
          baris,
          level,
          isEmpty,
          occupiedBy,
        });
      }
    }
  }

  return slots;
}

/**
 * Cari lokasi kosong pertama di cluster tertentu
 */
export function findEmptySlotInCluster(
  cluster: "A" | "B" | "C" | "D"
): LocationSlot | null {
  const allSlots = getAllSlotsInCluster(cluster);
  const emptySlots = allSlots.filter((slot) => slot.isEmpty);
  
  if (emptySlots.length === 0) return null;
  
  // Return slot kosong pertama
  return emptySlots[0];
}

/**
 * Cari N lokasi kosong di cluster tertentu
 */
export function findEmptySlotsInCluster(
  cluster: "A" | "B" | "C" | "D",
  count: number = 1
): LocationSlot[] {
  const allSlots = getAllSlotsInCluster(cluster);
  const emptySlots = allSlots.filter((slot) => slot.isEmpty);
  
  return emptySlots.slice(0, count);
}

/**
 * Get total empty slots in cluster
 */
export function getEmptySlotCountInCluster(cluster: "A" | "B" | "C" | "D"): number {
  const allSlots = getAllSlotsInCluster(cluster);
  return allSlots.filter((slot) => slot.isEmpty).length;
}

/**
 * Format lokasi untuk display
 */
export function formatLocation(slot: LocationSlot): string {
  return `${slot.cluster}-${slot.lorong}-${slot.baris}-${slot.level}`;
}

/**
 * Generate dropdown options untuk lorong
 */
export function getLorongOptions(): { value: string; label: string }[] {
  return Array.from({ length: 11 }, (_, i) => {
    const lorong = `L${i + 1}`;
    return { value: lorong, label: `Lorong ${lorong}` };
  });
}

/**
 * Generate dropdown options untuk baris
 */
export function getBarisOptions(): { value: string; label: string }[] {
  return Array.from({ length: 9 }, (_, i) => {
    const baris = `B${i + 1}`;
    return { value: baris, label: `Baris ${baris}` };
  });
}

/**
 * Generate dropdown options untuk level (pallet position)
 */
export function getLevelOptions(): { value: string; label: string }[] {
  return [
    { value: "P1", label: "Pallet 1" },
    { value: "P2", label: "Pallet 2" },
    { value: "P3", label: "Pallet 3" },
    { value: "P4", label: "Pallet 4" },
  ];
}
