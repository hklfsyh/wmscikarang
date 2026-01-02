"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Cek ketersediaan lokasi secara real-time di database.
 * Menerima array lokasi untuk mendukung pengecekan multi-pallet sekaligus.
 */
export async function checkLocationAvailabilityAction(
  warehouseId: string,
  locations: Array<{
    cluster: string;
    lorong: number;
    baris: number;
    level: number;
  }>
) {
  try {
    const supabase = await createClient();

    // Lakukan pengecekan untuk setiap lokasi dalam array secara paralel
    const results = await Promise.all(
      locations.map(async (loc) => {
        const { data: existingStock } = await supabase
          .from("stock_list")
          .select(
            `
            id,
            qty_carton,
            products(product_name, product_code)
          `
          )
          .eq("warehouse_id", warehouseId)
          .eq("cluster", loc.cluster)
          .eq("lorong", loc.lorong)
          .eq("baris", loc.baris)
          .eq("level", loc.level)
          .maybeSingle();

        return {
          locationKey: `${loc.cluster}-L${loc.lorong}-B${loc.baris}-P${loc.level}`,
          isAvailable: !existingStock,
          occupiedBy: existingStock
            ? {
                productName: (existingStock.products as any)?.product_name,
                productCode: (existingStock.products as any)?.product_code,
                qtyCarton: existingStock.qty_carton,
              }
            : null,
        };
      })
    );

    const allAvailable = results.every((r) => r.isAvailable);
    const occupiedLocations = results.filter((r) => !r.isAvailable);

    return {
      success: true,
      allAvailable,
      results,
      occupiedCount: occupiedLocations.length,
    };
  } catch (err: any) {
    return { success: false, error: "Gagal mengecek lokasi: " + err.message };
  }
}

/**
 * Submit Inbound secara Real ke Database
 * Melakukan validasi ketersediaan lokasi terakhir sebelum melakukan insert.
 */
export async function submitInboundAction(formData: any, submissions: any[]) {
  const supabase = await createClient();

  try {
    // 1. Ambil User untuk audit log
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Sesi berakhir, silakan login kembali.");

    // 2. VALIDASI AKHIR: Cek apakah lokasi masih kosong tepat sebelum insert
    // Mencegah dua admin mengisi lokasi yang sama di waktu bersamaan
    const locationCheck = await checkLocationAvailabilityAction(
      formData.warehouse_id,
      submissions.map((s) => {
        const p = s.location.split("-");
        return {
          cluster: p[0],
          lorong: parseInt(p[1].replace("L", "")),
          baris: parseInt(p[2].replace("B", "")),
          level: parseInt(p[3].replace("P", "")),
        };
      })
    );

    // Pastikan pengecekan berhasil dan results tersedia
    if (!locationCheck.success || !locationCheck.results) {
      throw new Error(
        locationCheck.error || "Gagal melakukan pengecekan lokasi."
      );
    }

    // Sekarang TypeScript tahu bahwa locationCheck.results pasti ada
    if (!locationCheck.allAvailable) {
      const occupiedStr = locationCheck.results
        .filter((r) => !r.isAvailable)
        .map((r) => r.locationKey)
        .join(", ");
      throw new Error(
        `Gagal Simpan! Lokasi berikut baru saja terisi: ${occupiedStr}`
      );
    }

    // 3. Generate Transaction Code (Contoh: INB-20251230-0001)
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const { count } = await supabase
      .from("inbound_history")
      .select("*", { count: "exact", head: true })
      .gte("created_at", new Date().toISOString().slice(0, 10));

    const sequence = String((count || 0) + 1).padStart(4, "0");
    const transactionCode = `INB-${todayStr}-${sequence}`;

    // 4. INSERT KE INBOUND_HISTORY
    const { data: inboundEntry, error: errHistory } = await supabase
      .from("inbound_history")
      .insert({
        warehouse_id: formData.warehouse_id,
        transaction_code: transactionCode,
        product_id: formData.product_id,
        bb_produk: formData.bb_produk,
        qty_carton: formData.total_qty_carton,
        expired_date: formData.expired_date,
        locations: submissions.map((s) => {
          const parts = s.location.split("-");
          return {
            cluster: parts[0],
            lorong: parseInt(parts[1].replace("L", "")),
            baris: parseInt(parts[2].replace("B", "")),
            level: parseInt(parts[3].replace("P", "")),
            qtyCarton: s.qtyCarton,
            isReceh: s.isReceh,
          };
        }),
        expedition_id: formData.ekspedisi,
        driver_name: formData.namaPengemudi,
        vehicle_number: formData.nomorPolisi,
        dn_number: formData.noDN,
        received_by: user.id,
        arrival_time: new Date().toISOString(),
      })
      .select()
      .single();

    if (errHistory)
      throw new Error("Gagal mencatat riwayat: " + errHistory.message);

    // 5. INSERT KE STOCK_LIST & STOCK_MOVEMENTS
    // Logika baru: Cek level pallet di lokasi yang sama sebelum berpindah ke baris berikutnya
    for (const sub of submissions) {
      const locParts = sub.location.split("-");

      // VALIDASI PROTEKSI: Jangan ijinkan insert jika cluster undefined
      if (!locParts[0] || locParts[0] === "undefined") {
        throw new Error(
          `Data lokasi korup: ${sub.location}. Submit dibatalkan.`
        );
      }

      // Periksa level pallet di lokasi yang sama (pallet 1 → pallet 2 → pallet 3)
      let stockPlaced = false;
      for (let level = 1; level <= 3 && !stockPlaced; level++) {
        const locationKey = `${locParts[0]}-L${locParts[1]}-B${locParts[2]}-P${level}`;
        
        // Cek apakah level pallet ini sudah terisi
        const { data: existingStock } = await supabase
          .from("stock_list")
          .select("id")
          .eq("warehouse_id", formData.warehouse_id)
          .eq("cluster", locParts[0])
          .eq("lorong", parseInt(locParts[1].replace("L", "")))
          .eq("baris", parseInt(locParts[2].replace("B", "")))
          .eq("level", level)
          .maybeSingle();

        if (!existingStock) {
          // Jika level pallet kosong, masukkan stok di sini
          const { data: newStock, error: errStock } = await supabase
            .from("stock_list")
            .insert({
              warehouse_id: formData.warehouse_id,
              product_id: formData.product_id,
              bb_produk: formData.bb_produk,
              cluster: locParts[0],
              lorong: parseInt(locParts[1].replace("L", "")),
              baris: parseInt(locParts[2].replace("B", "")),
              level: level,
              qty_pallet: 1,
              qty_carton: sub.qtyCarton,
              expired_date: formData.expired_date,
              inbound_date: new Date().toISOString().slice(0, 10),
              created_by: user.id,
              status: sub.isReceh ? "receh" : "release",
            })
            .select()
            .single();

          if (errStock) {
            console.error("Gagal insert stock_list:", errStock);
            throw new Error(
              `Gagal mengisi stok di lokasi ${locationKey}: ${errStock.message}`
            );
          }

          // Insert ke stock_movements
          await supabase.from("stock_movements").insert({
            warehouse_id: formData.warehouse_id,
            stock_id: newStock.id,
            product_id: formData.product_id,
            bb_produk: formData.bb_produk,
            movement_type: "inbound",
            reference_type: "inbound_history",
            reference_id: inboundEntry.id,
            qty_before: 0,
            qty_change: sub.qtyCarton,
            qty_after: sub.qtyCarton,
            to_location: locationKey,
            performed_by: user.id,
            notes: "Inbound via Form Real-DB",
          });

          stockPlaced = true; // Tandai bahwa stok sudah ditempatkan
        }
      }

      // Jika tidak ada level pallet yang kosong di lokasi ini, lempar error
      if (!stockPlaced) {
        throw new Error(
          `Tidak ada level pallet yang tersedia di lokasi ${sub.location}. Semua level sudah terisi.`
        );
      }
    }

    revalidatePath("/stock-list");
    revalidatePath("/inbound");

    return { success: true, transactionCode };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

// Cancel/Batal Transaksi Inbound
export async function cancelInboundAction(inboundHistoryId: string) {
  const supabase = await createClient();

  // 1. Ambil User untuk log
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // 2. Ambil data inbound_history untuk mendapatkan lokasi dan qty
  const { data: inboundData, error: errFetch } = await supabase
    .from("inbound_history")
    .select("*")
    .eq("id", inboundHistoryId)
    .single();

  if (errFetch || !inboundData) {
    return { success: false, message: "Data inbound tidak ditemukan" };
  }

  // 3. Loop melalui setiap lokasi dan kurangi/hapus stock_list
  for (const loc of inboundData.locations) {
    const { cluster, lorong, baris, level, qtyCarton } = loc;

    // Cari stock_list yang sesuai
    const { data: stockItems, error: errStock } = await supabase
      .from("stock_list")
      .select("*")
      .eq("warehouse_id", inboundData.warehouse_id)
      .eq("product_id", inboundData.product_id)
      .eq("bb_produk", inboundData.bb_produk)
      .eq("cluster", cluster)
      .eq("lorong", lorong)
      .eq("baris", baris)
      .eq("level", level)
      .order("created_at", { ascending: false });

    if (errStock || !stockItems || stockItems.length === 0) continue;

    const stockItem = stockItems[0];

    // Log stock movement untuk pembatalan
    await supabase.from("stock_movements").insert({
      warehouse_id: inboundData.warehouse_id,
      stock_id: stockItem.id,
      product_id: inboundData.product_id,
      bb_produk: inboundData.bb_produk,
      movement_type: "cancel_inbound",
      reference_type: "inbound_history",
      reference_id: inboundHistoryId,
      qty_before: stockItem.qty_carton,
      qty_change: -qtyCarton,
      qty_after: stockItem.qty_carton - qtyCarton,
      from_location: `${cluster}-L${lorong}-B${baris}-P${level}`,
      performed_by: user.id,
      notes: `Pembatalan transaksi ${inboundData.transaction_code}`,
    });

    // Update atau hapus stock_list
    if (stockItem.qty_carton <= qtyCarton) {
      // Hapus jika qty sama atau kurang
      await supabase.from("stock_list").delete().eq("id", stockItem.id);
    } else {
      // Kurangi qty jika masih ada sisa
      await supabase
        .from("stock_list")
        .update({
          qty_carton: stockItem.qty_carton - qtyCarton,
          updated_at: new Date().toISOString(),
        })
        .eq("id", stockItem.id);
    }
  }

  // 4. Hapus record inbound_history (Hard delete)
  // CATATAN: Jika ingin soft delete, tambahkan fields: is_cancelled, cancelled_at, cancelled_by ke schema
  const { error: errDelete } = await supabase
    .from("inbound_history")
    .delete()
    .eq("id", inboundHistoryId);

  if (errDelete) {
    return { success: false, message: errDelete.message };
  }

  // Revalidate untuk refresh data
  revalidatePath("/inbound");
  revalidatePath("/stock-list");

  return { success: true, message: "Transaksi berhasil dibatalkan" };
}

/**
 * Validasi BB Produk (Server-Side)
 * Memastikan format 10 digit, mengekstrak tanggal expired, dan cek kadaluarsa.
 */
export async function validateBBAction(bbProduk: string) {
  try {
    // 1. Validasi Panjang Karakter
    if (!bbProduk || bbProduk.length !== 10) {
      return {
        isValid: false,
        error: "BB Produk harus 10 karakter (YYMMDDXXXX)",
      };
    }

    // 2. Ekstrak Komponen (YYMMDD + XXXX)
    const expiredDateStr = bbProduk.substring(0, 6); // YYMMDD
    const kdPlantStr = bbProduk.substring(6, 10); // XXXX

    // Tentukan prefix tahun (20xx atau 19xx)
    const currentYear = new Date().getFullYear();
    const yearPrefix =
      currentYear < 2050 && Number(expiredDateStr.substring(0, 2)) > 50
        ? "19"
        : "20";

    const year = `${yearPrefix}${expiredDateStr.substring(0, 2)}`;
    const month = expiredDateStr.substring(2, 4);
    const day = expiredDateStr.substring(4, 6);

    // 3. Validasi Keaslian Tanggal
    const dateObj = new Date(`${year}-${month}-${day}`);
    const isValidDate =
      !isNaN(dateObj.getTime()) &&
      dateObj.getMonth() + 1 === Number(month) &&
      Number(day) >= 1 &&
      Number(day) <= 31;

    if (!isValidDate) {
      return {
        isValid: false,
        error: "Format Tanggal (YYMMDD) di BB Produk tidak valid",
      };
    }

    const expiredDate = `${year}-${month}-${day}`;

    // 4. Cek apakah sudah Expired dibandingkan hari ini
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateObj < today) {
      return {
        isValid: true, // Format valid, tapi ada warning
        expiredDate,
        kdPlant: kdPlantStr,
        warning: "Produk sudah EXPIRED!",
      };
    }

    return {
      isValid: true,
      expiredDate,
      kdPlant: kdPlantStr,
      warning: null,
    };
  } catch (err: any) {
    return { isValid: false, error: "System error: " + err.message };
  }
}

/**
 * Logika Rekomendasi Lokasi Pintar (Server-Side) - FINAL OPTIMIZED
 * Menggabungkan data dari product_homes, cluster_configs, dan stock_list dengan optimasi database.
 */
export async function getSmartRecommendationAction(
  warehouseId: string,
  productCode: string,
  palletsNeeded: number
) {
  try {
    const supabase = await createClient();

    // 1. Validasi Input Awal
    if (!warehouseId || !productCode || palletsNeeded <= 0) {
      throw new Error(
        "Warehouse ID, Product Code, dan jumlah pallet harus valid."
      );
    }

    // 2. Ambil Data Produk & Aturan Rumah
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, default_cluster, product_homes(*)")
      .eq("product_code", productCode)
      .eq("warehouse_id", warehouseId)
      .single();

    if (productError || !product) throw new Error("Produk tidak ditemukan.");

    // 3. Optimasi Query: Filter Lokasi Terisi (Saran #2)
    // Alih-alih mengambil semua stok, kita filter hanya di cluster yang relevan (Home & Transit)
    const relevantClusters = [
      ...new Set(product.product_homes?.map((h: any) => h.cluster_char) || []),
      "C", // Cluster Transit
    ];

    const [configsRes, occupiedRes] = await Promise.all([
      supabase
        .from("cluster_configs")
        .select("*")
        .eq("warehouse_id", warehouseId)
        .eq("is_active", true),
      supabase
        .from("stock_list")
        .select("cluster, lorong, baris, level")
        .eq("warehouse_id", warehouseId)
        .in("cluster", relevantClusters), // Optimasi filter DB
    ]);

    // Fallback data kosong (Saran #1)
    const configs = configsRes.data || [];
    const occupied = occupiedRes.data || [];
    const occupiedSet = new Set(
      occupied.map((s) => `${s.cluster}-${s.lorong}-${s.baris}-${s.level}`)
    );

    const recommendations: any[] = [];
    let remaining = palletsNeeded;

    // --- PHASE 1: CARI DI PRODUCT HOMES (Saran #3) ---
    // Mengurutkan product_homes agar yang sesuai dengan default_cluster dicek lebih dulu
    const sortedHomes = [...(product.product_homes || [])].sort((a, b) => {
      if (a.cluster_char === product.default_cluster) return -1;
      if (b.cluster_char === product.default_cluster) return 1;
      return 0;
    });

    for (const home of sortedHomes) {
      if (remaining === 0) break;

      // Gunakan nilai default jika max_pallet_per_location kosong (Saran #3)
      const maxLevel = home.max_pallet_per_location || 3;

      for (let l = home.lorong_start; l <= home.lorong_end; l++) {
        for (let b = home.baris_start; b <= home.baris_end; b++) {
          // PERBAIKAN: Cek level pallet secara berurutan (1 → 2 → 3) di lokasi yang sama
          for (let p = 1; p <= maxLevel; p++) {
            if (remaining === 0) break;
            const currentCluster = home.cluster_char;
            const key = `${home.cluster_char}-${l}-${b}-${p}`;
            if (!occupiedSet.has(key)) {
              recommendations.push({
                clusterChar: currentCluster, // Gunakan cluster_char dari database
                lorong: `L${l}`,
                baris: `B${b}`,
                level: `P${p}`,
                phase: "primary_home",
              });
              remaining--;
              occupiedSet.add(key);
            }
          }
        }
      }
    }

    // --- PHASE 2: OVERFLOW KE IN TRANSIT ---
    if (remaining > 0) {
      const transitLorong = [8, 9, 10, 11];
      for (const l of transitLorong) {
        for (let b = 1; b <= 9; b++) {
          for (let p = 1; p <= 3; p++) {
            if (remaining === 0) break;
            const key = `C-${l}-${b}-${p}`;
            if (!occupiedSet.has(key)) {
              recommendations.push({
                clusterChar: "C", // Gunakan clusterChar secara eksplisit
                lorong: `L${l}`,
                baris: `B${b}`,
                level: `P${p}`,
                phase: "in_transit",
              });
              remaining--;
              occupiedSet.add(key);
            }
          }
        }
      }
    }

    // 4. Return Metadata Lengkap (Saran #4)
    return {
      success: true,
      locations: recommendations,
      totalFound: recommendations.length,
      remainingPallets: remaining,
      isFull: remaining > 0,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
