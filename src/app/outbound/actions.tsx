"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getIndonesianDateString, getIndonesianDate } from "@/lib/utils/datetime";

/**
 * Logika Pencarian Stok Berdasarkan FEFO (Server-Side)
 * Mengambil stok yang tersedia dan mengurutkannya berdasarkan fefo_status + bb_produk terlama.
 * 
 * PENTING: Untuk performa optimal, pastikan Index database pada:
 * CREATE INDEX idx_stock_fefo ON stock_list(warehouse_id, product_id, fefo_status, bb_produk, created_at);
 */
export async function getFEFOAllocationAction(
  warehouseId: string,
  productId: string,
  totalCartonsNeeded: number
) {
  try {
    const supabase = await createClient();

    // 1. Ambil stok yang TIDAK expired/damaged
    // 2. Urutkan berdasarkan fefo_status (release > hold), lalu bb_produk (terlama), lalu created_at (FIFO)
    // CATATAN: Status fisik (receh, salah-cluster, normal) TIDAK memblokir pengambilan
    const { data: stocks, error } = await supabase
      .from("stock_list")
      .select("*")
      .eq("warehouse_id", warehouseId)
      .eq("product_id", productId)
      // PERBAIKAN: Cara yang lebih aman untuk filter NOT IN di Supabase SDK
      .not("status", "eq", "expired")
      .not("status", "eq", "damaged")
      .order("fefo_status", { ascending: false }) // release (true) > hold (false) secara alfabetis DESC
      .order("bb_produk", { ascending: true }) // Batch terlama duluan (26010100 < 26020100)
      .order("created_at", { ascending: true }); // Jika bb_produk sama, FIFO

    if (error) throw error;
    if (!stocks || stocks.length === 0)
      throw new Error("Stok produk tidak ditemukan atau semua expired/damaged.");

    let remainingNeeded = totalCartonsNeeded;
    const allocation = [];
    
    // Deteksi FEFO Violation: Cek apakah ada pallet RELEASE yang tersedia
    const hasReleasePallet = stocks.some(s => s.fefo_status === 'release');

    for (const stock of stocks) {
      if (remainingNeeded <= 0) break;

      const takeQty = Math.min(stock.qty_carton, remainingNeeded);
      
      // FEFO Violation Flag: Tandai jika mengambil HOLD padahal ada RELEASE
      const isViolation = stock.fefo_status === 'hold' && hasReleasePallet;

      allocation.push({
        stockId: stock.id,
        location: `${stock.cluster}-L${stock.lorong}-B${stock.baris}-P${stock.level}`,
        cluster: stock.cluster,
        lorong: stock.lorong,
        baris: stock.baris,
        level: stock.level,
        bbProduk: stock.bb_produk,
        expiredDate: stock.expired_date,
        qtyBefore: stock.qty_carton,
        qtyTaken: takeQty,
        qtyAfter: stock.qty_carton - takeQty,
        daysToExpire: Math.ceil(
          (new Date(stock.expired_date).getTime() - Date.now()) /
            (1000 * 3600 * 24)
        ),
        // TAMBAHAN: Info FEFO dan Status Fisik
        fefo_status: stock.fefo_status, // 'release' atau 'hold'
        status: stock.status, // 'normal', 'receh', 'salah-cluster', 'expired', 'damaged', dll
        is_receh: stock.is_receh || false,
        is_fefo_violation: isViolation, // true jika ambil hold padahal ada release
        originalCreatedAt: stock.created_at, // CRITICAL: Simpan created_at asli untuk restore urutan FEFO
      });

      remainingNeeded -= takeQty;
    }

    if (remainingNeeded > 0) {
      throw new Error(
        `Stok tidak mencukupi. Kurang ${remainingNeeded} karton lagi.`
      );
    }

    return { success: true, allocation };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Submit Outbound secara Real ke Database
 * Mengupdate/Menghapus stock_list dan mencatat history.
 */
export async function submitOutboundAction(formData: any, allocation: any[]) {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Sesi berakhir.");

    // Ambil waktu lokal
    const localTime = new Date();
    const offset = localTime.getTimezoneOffset(); // Offset dalam menit
    const adjustedTime = new Date(localTime.getTime() - offset * 60 * 1000); // Sesuaikan ke waktu lokal

    // Format waktu ke ISO string
    const departureTime = adjustedTime
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    // PERBAIKAN: Ambil semua BB unik dari alokasi dan gabungkan menjadi string koma
    const allBBs = Array.from(new Set(allocation.map((a) => a.bbProduk))).join(
      ", "
    );

    // 1. Generate Transaction Code (ambil nomor terakhir, bukan count)
    const todayStr = getIndonesianDateString();
    const { data: lastTransaction } = await supabase
      .from("outbound_history")
      .select("transaction_code")
      .like("transaction_code", `OUT-${todayStr}%`)
      .order("transaction_code", { ascending: false })
      .limit(1)
      .single();

    let nextNumber = 1;
    if (lastTransaction?.transaction_code) {
      // Extract nomor terakhir dari format OUT-YYYYMMDD-XXXX
      const lastNumber = parseInt(lastTransaction.transaction_code.split("-")[2]);
      nextNumber = lastNumber + 1;
    }

    const transactionCode = `OUT-${todayStr}-${String(nextNumber).padStart(4, "0")}`;

    // 2. Simpan ke outbound_history dengan lokasi LENGKAP + FEFO STATUS
    const { data: outboundEntry, error: errOut } = await supabase
      .from("outbound_history")
      .insert({
        warehouse_id: formData.warehouse_id,
        transaction_code: transactionCode,
        product_id: formData.product_id,
        bb_produk: allBBs, // Sekarang berisi "BB1, BB2"
        qty_carton: formData.total_qty_carton,
        locations: allocation.map((a) => ({
          cluster: a.cluster,
          lorong: a.lorong,
          baris: a.baris,
          level: a.level,
          qtyCarton: a.qtyTaken,
          bbProduk: a.bbProduk,
          expiredDate: a.expiredDate, // TAMBAHAN: Simpan expired date untuk re-insert
          // TAMBAHAN: Simpan status FEFO untuk audit trail
          fefo_status: a.fefo_status, // 'release' atau 'hold'
          status: a.status, // 'normal', 'receh', 'salah-cluster', etc
          is_fefo_violation: a.is_fefo_violation, // true jika violation
          original_created_at: a.originalCreatedAt, // CRITICAL: Simpan created_at asli agar urutan FEFO tidak berubah saat cancel/edit
        })),
        driver_name: formData.namaPengemudi,
        vehicle_number: formData.nomorPolisi,
        processed_by: user.id,
        departure_time: departureTime, // Gunakan waktu lokal
      })
      .select()
      .single();

    if (errOut) throw errOut;

    // 3. Proses Update Stok & Movements
    for (const item of allocation) {
      // LOGIKA KRUSIAL: Pastikan tipe data qtyAfter adalah angka
      const qtySisa = Number(item.qtyAfter);

      if (qtySisa <= 0) {
        // Hapus jika benar-benar habis
        const { error: delErr } = await supabase
          .from("stock_list")
          .delete()
          .eq("id", item.stockId);
        if (delErr) console.error("Gagal hapus stok:", delErr);
      } else {
        // Update jika masih ada sisa
        // PENTING: Jangan ubah status fisik (salah-cluster, dll) yang sudah ada
        // Hanya ubah ke 'receh' jika status sebelumnya 'normal' atau 'hold' atau 'release'
        const updateData: any = {
          qty_carton: qtySisa,
        };
        
        // Ubah status fisik hanya jika sebelumnya bukan kondisi khusus
        if (!['salah-cluster', 'expired', 'damaged'].includes(item.status)) {
          updateData.status = "receh";
          updateData.is_receh = true;
        }

        await supabase
          .from("stock_list")
          .update(updateData)
          .eq("id", item.stockId);
      }

      // Catat pergerakan
      await supabase.from("stock_movements").insert({
        warehouse_id: formData.warehouse_id,
        stock_id: item.stockId,
        product_id: formData.product_id,
        bb_produk: item.bbProduk,
        movement_type: "outbound",
        reference_type: "outbound_history",
        reference_id: outboundEntry.id,
        qty_before: item.qtyBefore,
        qty_change: -item.qtyTaken,
        qty_after: item.qtyAfter,
        from_location: item.location,
        performed_by: user.id,
        notes: "Outbound FEFO",
      });
    }

    revalidatePath("/stock-list");
    revalidatePath("/outbound");
    return { success: true, transactionCode };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/**
 * Cancel/Batal Transaksi Outbound (Hard Delete - hapus permanent)
 * Mengembalikan stok ke stock_list dan menghapus record outbound_history
 */
export async function cancelOutboundAction(outboundHistoryId: string) {
  const supabase = await createClient();

  // 1. Ambil User untuk log
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // 2. Ambil data outbound_history untuk mendapatkan lokasi dan qty
  const { data: outboundData, error: errFetch } = await supabase
    .from("outbound_history")
    .select("*")
    .eq("id", outboundHistoryId)
    .single();

  if (errFetch || !outboundData) {
    return { success: false, message: "Data outbound tidak ditemukan" };
  }

  // 3. Loop melalui setiap lokasi dan kembalikan/tambah stock_list
  for (const loc of outboundData.locations) {
    const { cluster, lorong, baris, level, qtyCarton, bbProduk } = loc;

    // Cari stock_list yang sesuai (mungkin sudah ada atau sudah dihapus)
    const { data: stockItems, error: errStock } = await supabase
      .from("stock_list")
      .select("*")
      .eq("warehouse_id", outboundData.warehouse_id)
      .eq("product_id", outboundData.product_id)
      .eq("cluster", cluster)
      .eq("lorong", lorong)
      .eq("baris", baris)
      .eq("level", level)
      .order("created_at", { ascending: false });

    if (errStock) continue;

    // Log stock movement untuk pembatalan
    if (stockItems && stockItems.length > 0) {
      const stockItem = stockItems[0];
      
      // Kembalikan qty ke stock yang masih ada
      await supabase
        .from("stock_list")
        .update({
          qty_carton: stockItem.qty_carton + qtyCarton,
          updated_at: new Date().toISOString(),
        })
        .eq("id", stockItem.id);

      await supabase.from("stock_movements").insert({
        warehouse_id: outboundData.warehouse_id,
        stock_id: stockItem.id,
        product_id: outboundData.product_id,
        bb_produk: bbProduk,
        movement_type: "cancel_outbound",
        reference_type: "outbound_history",
        reference_id: outboundHistoryId,
        qty_before: stockItem.qty_carton,
        qty_change: qtyCarton,
        qty_after: stockItem.qty_carton + qtyCarton,
        from_location: `${cluster}-L${lorong}-B${baris}-P${level}`,
        performed_by: user.id,
        notes: `Pembatalan transaksi ${outboundData.transaction_code}`,
      });
    } else {
      // Stock sudah tidak ada, buat ulang (INSERT)
      const { data: newStock } = await supabase
        .from("stock_list")
        .insert({
          warehouse_id: outboundData.warehouse_id, // CRITICAL: warehouse_id wajib
          product_id: outboundData.product_id,
          bb_produk: bbProduk,
          expired_date: loc.expiredDate || null, // PERBAIKAN: Kembalikan expired_date asli
          cluster: cluster,
          lorong: lorong,
          baris: baris,
          level: level,
          qty_pallet: 1,
          qty_carton: qtyCarton,
          status: loc.status || "normal", // PERBAIKAN: Kembalikan status fisik asli (receh/salah-cluster)
          fefo_status: "hold", // PERBAIKAN: Set 'hold' dulu, trigger akan ubah ke 'release' jika tertua
          is_receh: loc.status === "receh", // Sinkronkan dengan status
          created_by: user.id,
          created_at: loc.original_created_at || new Date().toISOString(), // CRITICAL: Restore created_at asli agar urutan FEFO tidak berubah
        })
        .select()
        .single();

      if (newStock) {
        await supabase.from("stock_movements").insert({
          warehouse_id: outboundData.warehouse_id,
          stock_id: newStock.id,
          product_id: outboundData.product_id,
          bb_produk: bbProduk,
          movement_type: "cancel_outbound",
          reference_type: "outbound_history",
          reference_id: outboundHistoryId,
          qty_before: 0,
          qty_change: qtyCarton,
          qty_after: qtyCarton,
          from_location: `${cluster}-L${lorong}-B${baris}-P${level}`,
          performed_by: user.id,
          notes: `Pembatalan transaksi ${outboundData.transaction_code} (re-insert)`,
        });
      }
    }
  }

  // 4. Hapus record outbound_history (Hard delete)
  const { error: errDelete } = await supabase
    .from("outbound_history")
    .delete()
    .eq("id", outboundHistoryId);

  if (errDelete) {
    return { success: false, message: errDelete.message };
  }

  // 5. Log activity
  await supabase.from("activity_logs").insert({
    user_id: user.id,
    action_type: "cancel_outbound",
    table_name: "outbound_history",
    record_id: outboundHistoryId,
    description: `Membatalkan transaksi outbound ${outboundData.transaction_code}`,
    metadata: { transaction_code: outboundData.transaction_code },
  });

  // Revalidate untuk refresh data
  revalidatePath("/outbound");
  revalidatePath("/stock-list");
  revalidatePath("/warehouse-layout");

  return {
    success: true,
    message: `Transaksi ${outboundData.transaction_code} berhasil dibatalkan`,
  };
}
