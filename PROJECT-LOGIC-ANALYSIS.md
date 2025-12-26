# WMS Cikarang - Analisis Logic Project Lengkap

## Daftar Isi
1. [Perubahan Database dari Diskusi](#perubahan-database)
2. [Logic per Halaman/Component](#logic-per-halaman)
3. [Logic yang Perlu Masuk Database](#logic-database)
4. [Logic yang Hanya di Frontend](#logic-frontend)
5. [Rekomendasi Implementasi](#rekomendasi)

---

## 1. Perubahan Database dari Diskusi {#perubahan-database}

### A. Hierarki User & Akses CRUD User

| Role | Warehouse Access | Bisa CRUD User | Scope CRUD |
|------|------------------|----------------|------------|
| **developer** | Semua (warehouse_id = NULL) | Semua role | Semua warehouse |
| **admin_cabang** | 1 gudang spesifik | Hanya admin_warehouse | Hanya warehouse sendiri |
| **admin_warehouse** | 1 gudang spesifik | Tidak bisa | - |

### B. Tabel Global → Per-Warehouse

| Tabel | Sebelum | Sesudah | Alasan |
|-------|---------|---------|--------|
| `products` | Global | **Per-warehouse** (tambah warehouse_id) | Cikarang & Bandung bisa punya produk berbeda |
| `expeditions` | Global | **Per-warehouse** (tambah warehouse_id) | Ekspedisi bisa berbeda per lokasi |
| `warehouses` | Global | **Tetap Global** | Hanya developer yang bisa CRUD |

### C. Siapa CRUD Apa

| Tabel | developer | admin_cabang | admin_warehouse |
|-------|-----------|--------------|-----------------|
| `warehouses` | CRUD | Read only | Read only |
| `users` (semua role) | CRUD | - | - |
| `users` (admin_warehouse) | CRUD | CRUD (warehouse sendiri) | - |
| `products` | - | CRUD (warehouse sendiri) | Read only |
| `expeditions` | - | CRUD (warehouse sendiri) | Read only |
| `cluster_configs` | - | CRUD (warehouse sendiri) | Read only |
| `product_homes` | - | CRUD (warehouse sendiri) | Read only |
| `stock_list` | - | Read only | Read + Auto (dari inbound/outbound) |
| `inbound_history` | - | Read only | Create |
| `outbound_history` | - | Read only | Create |
| `prestock_opname` | - | CRUD (rekonsel) | Create (input audit) |

---

## 2. Logic per Halaman/Component {#logic-per-halaman}

### A. Login Page (`src/app/login/page.tsx`)

**Logic:**
1. **Autentikasi** - Validasi username + password
2. **Role Assignment** - Set role ke localStorage
3. **Demo Credentials:**
   - admin / admin123 → role: admin_warehouse
   - superadmin / super123 → role: superadmin

**Perlu di Database:**
- Tabel `users` dengan password_hash
- Role: developer, admin_cabang, admin_warehouse

**Catatan Migrasi:**
- Ganti localStorage ke JWT/session
- Hash password dengan bcrypt
- Tambah last_login timestamp

---

### B. Navigation (`src/components/navigation.tsx`)

**Logic:**
1. **Role-based Menu Filtering:**
   ```
   admin_warehouse: Warehouse Layout, Stock List, Inbound, Outbound, Pre-Stock Opname (input)
   superadmin: Semua + Master Data, Manajemen Admin, Pre-Stock Opname (rekonsel)
   ```

2. **Digital Clock** - Update setiap detik (HH:MM:SS)
3. **Auto Refresh** - Reload halaman setiap 15 menit
4. **Logout** - Hapus localStorage dan redirect ke login

**Perlu di Database:**
- Role dari user session
- warehouse_id untuk filter data

**Catatan Migrasi:**
- Menu items bisa di-hardcode di frontend
- Role cek via API/middleware

---

### C. Inbound Form (`src/components/inbound-form.tsx`)

**Logic Kompleks:**

#### 0. Edit & Batal Transaksi Hari Ini (FITUR BARU)

```javascript
// Filter transaksi hari ini untuk ditampilkan di tabel "Transaksi Hari Ini"
const todayTransactions = useMemo(() => {
  const todayStr = new Date().toISOString().slice(0, 10);
  return inboundHistoryData.filter(item => item.tanggal === todayStr);
}, []);

// LOGIC EDIT - Load data ke form untuk di-edit ulang
const confirmEdit = () => {
  // 1. Parse lokasi dari string (format: "A-L1-B1-P1, A-L1-B2-P1, ...")
  const locations = selectedItemForAction.location.split(', ').map(loc => {
    const parts = loc.trim().split('-');
    return { cluster: parts[0], lorong: parts[1], baris: parts[2], level: parts[3] };
  });

  // 2. Hapus stock dari lokasi-lokasi tersebut (reverse inbound)
  locations.forEach(loc => {
    const stockIndex = stockListData.findIndex(s => 
      s.location.cluster === loc.cluster &&
      s.location.lorong === loc.lorong &&
      s.location.baris === loc.baris &&
      s.location.level === loc.level &&
      s.productCode === selectedItemForAction.productCode
    );
    if (stockIndex !== -1) stockListData.splice(stockIndex, 1);
  });

  // 3. Hapus dari history
  const historyIndex = inboundHistoryData.findIndex(h => h.id === selectedItemForAction.id);
  if (historyIndex !== -1) inboundHistoryData.splice(historyIndex, 1);

  // 4. Load data ke form (reverse calculation dari totalCarton ke pallet + sisa)
  setForm({ ekspedisi, tanggal, productCode, bbProduk, qtyPalletInput, qtyCartonInput, ... });
};

// LOGIC BATAL - Hapus tanpa load ke form
const confirmBatal = () => {
  // 1-3 sama dengan Edit, tapi TIDAK load ke form
  // Record dihapus, stock dihapus, selesai
};
```

**Catatan Penting Edit & Batal Inbound:**
- Hanya transaksi hari ini yang bisa di-edit/batal
- Stock yang sudah di-inbound akan dihapus dari stock_list
- Tidak ada pengembalian stock (karena belum keluar gudang)
- Tombol aksi: "Detail", "Ubah", "Batal" (text, bukan icon)

#### 1. BB Produk Parsing
```javascript
// Format: YYMMDDXXXX (10 karakter)
// YY = Tahun, MM = Bulan, DD = Tanggal, XXXX = Kode Plant
parseBBProduk("2512210001") → {
  expiredDate: "2025-12-21",
  kdPlant: "0001",
  isValid: true
}
```

#### 2. Perhitungan Pallet & Receh
```javascript
// Input: qtyPalletInput (pallet utuh), qtyCartonInput (karton sisa)
// Konstanta: RECEH_THRESHOLD = 5

totalCartons = (palletInput × qtyCartonPerPalletStd) + cartonInput
totalPallets = Math.floor(totalCartons / qtyCartonPerPalletStd)
remainingCartons = totalCartons % qtyCartonPerPalletStd

// SMART RECEH LOGIC:
// Jika sisa karton ≤ 5 DAN ada pallet utuh → gabung ke pallet terakhir
shouldAttachReceh = remainingCartons > 0 && remainingCartons <= 5 && totalPallets > 0
totalPalletsNeeded = shouldAttachReceh ? totalPallets : (totalPallets + (isReceh ? 1 : 0))
```

#### 3. Rekomendasi Lokasi (Auto Recommend)
```javascript
// PHASE 1: Cari di Product Home
1. Ambil product_homes untuk produk + warehouse
2. Filter lokasi yang sesuai lorongRange & barisRange
3. Cek ketersediaan (tidak ada di stock_list)
4. Prioritas: lorong terkecil → baris terkecil → level terkecil

// PHASE 2: Jika rumah penuh → In Transit
1. Cari cluster yang punya inTransitLorongRange
2. Alokasi ke In Transit sebagai overflow
3. Cross-cluster In Transit: Cluster C sebagai buffer global
```

#### 4. Manual Multi-Location Input
```javascript
// User bisa input range: Cluster A, Lorong 1, Baris 1-3, Pallet 1-2
// Expand menjadi: A-L1-B1-P1, A-L1-B1-P2, A-L1-B2-P1, A-L1-B2-P2, ...
// Cek availability masing-masing lokasi
```

#### 5. Final Submission Structure
```javascript
{
  productCode: string,
  location: "A-L1-B1-P1",
  qtyPallet: 1,           // Selalu 1 per lokasi
  qtyCarton: number,      // Qty aktual per lokasi
  bbPallet: string,       // BB Produk
  isReceh: boolean        // Flag receh
}
```

#### 6. Input History (Autocomplete)
- Driver name history → localStorage
- DN number history → localStorage
- Police number history → localStorage

**Perlu di Database:**
- `inbound_history` dengan locations JSON
- `stock_list` untuk cek ketersediaan
- `product_homes` untuk rekomendasi
- `cluster_configs` untuk pallet capacity
- `products` untuk qtyCartonPerPallet

**Catatan Migrasi:**
- BB Produk parsing tetap di frontend
- Rekomendasi lokasi bisa API atau frontend
- History autocomplete bisa di localStorage atau DB

---

### D. Outbound Form (`src/components/outbound-form.tsx`)

**Logic:**

#### 0. Edit & Batal Transaksi Hari Ini (FITUR BARU)

```javascript
// Filter transaksi hari ini
const todayTransactions = useMemo(() => {
  const todayStr = new Date().toISOString().slice(0, 10);
  return outboundHistoryData.filter(item => item.tanggal === todayStr);
}, []);

// LOGIC EDIT/BATAL - Kembalikan stock ke lokasi asal atau In Transit
const confirmEdit = () => {
  // 1. Kembalikan stock ke lokasi asal (atau In Transit jika sudah terisi)
  selectedItemForAction.locations.forEach(locationStr => {
    const parts = locationStr.split('-');
    const loc = { cluster: parts[0], lorong: parts[1], baris: parts[2], level: parts[3] };

    // Cek apakah lokasi asal sudah terisi oleh produk lain
    const existingStock = stockListData.find(s => 
      s.location.cluster === loc.cluster &&
      s.location.lorong === loc.lorong &&
      s.location.baris === loc.baris &&
      s.location.level === loc.level
    );

    if (existingStock) {
      // Lokasi sudah terisi → pindahkan ke In Transit (Cluster C L11-L12)
      const inTransitLoc = findAvailableInTransitLocation();
      stockListData.push({ ...returnedStock, location: inTransitLoc });
    } else {
      // Lokasi kosong → kembalikan ke lokasi asal
      stockListData.push({ ...returnedStock, location: loc });
    }
  });

  // 2. Hapus dari history
  const historyIndex = outboundHistoryData.findIndex(h => h.id === selectedItemForAction.id);
  if (historyIndex !== -1) outboundHistoryData.splice(historyIndex, 1);

  // 3. (Edit only) Load data ke form
  setForm({ tanggal, namaPengemudi, nomorPolisi, productCode, qtyPalletInput, qtyCartonInput });
};

// Helper: Cari lokasi In Transit yang kosong
const findAvailableInTransitLocation = () => {
  // In Transit area di Cluster C, Lorong L11-L12
  for (let lorong = 11; lorong <= 12; lorong++) {
    for (let baris = 1; baris <= 9; baris++) {
      for (let pallet = 1; pallet <= 3; pallet++) {
        const loc = { cluster: "C", lorong: `L${lorong}`, baris: `B${baris}`, level: `P${pallet}` };
        const exists = stockListData.some(s => 
          s.location.cluster === loc.cluster &&
          s.location.lorong === loc.lorong &&
          s.location.baris === loc.baris &&
          s.location.level === loc.level
        );
        if (!exists) return loc;
      }
    }
  }
  return null;
};
```

**Catatan Penting Edit & Batal Outbound:**
- Hanya transaksi hari ini yang bisa di-edit/batal
- Stock yang sudah di-outbound akan DIKEMBALIKAN ke gudang
- Jika lokasi asal sudah terisi oleh produk lain → pindah ke In Transit
- Returned stock diberi marker: bbPallet = "RETURNED", status = "release"
- Tombol aksi: "Detail", "Ubah", "Batal" (text, bukan icon)

#### 1. FEFO (First Expired First Out)
```javascript
// Query stock dengan urutan expired date ASC
availableStocks = stockListData
  .filter(stock => 
    stock.productCode === selectedProduct &&
    (stock.status === "release" || stock.status === "hold" || stock.status === "receh")
  )
  .sort((a, b) => new Date(a.expiredDate) - new Date(b.expiredDate))

// Alokasi dari yang expired terdekat
for (stock of availableStocks) {
  if (remainingQty <= 0) break;
  allocate(stock);
}
```

#### 2. QR Code per Lokasi
- Generate QR Code dari BB Pallet
- Tampilkan di tabel hasil FEFO
- Bisa klik untuk lihat detail lokasi

#### 3. Validasi
- Driver name required
- Police number required
- Product required
- Qty > 0
- FEFO locations harus sudah dihitung

**Perlu di Database:**
- `outbound_history` dengan locations JSON
- `stock_list` untuk query FEFO
- Update `stock_list` setelah outbound (kurangi qty atau hapus)

---

### E. Warehouse Layout (`src/components/warehouse-layout.tsx`)

**Logic:**

#### 1. Cell Generation (Dynamic)
```javascript
for (cluster of activeClusterConfigs) {
  for (lorong = 1; lorong <= cluster.defaultLorongCount; lorong++) {
    maxBaris = getBarisCountForLorong(cluster, lorong);  // Bisa custom per lorong
    for (baris = 1; baris <= maxBaris; baris++) {
      maxPallet = getPalletCapacityForCell(cluster, lorong, baris);  // Bisa custom per cell
      for (pallet = 1; pallet <= maxPallet; pallet++) {
        // Generate cell
      }
    }
  }
}
```

#### 2. Status & Warna
```javascript
// WARNA BERDASARKAN KONDISI:
GREEN (release)  → Expired ≤ 90 hari, prioritas keluar
YELLOW (hold)    → Expired > 90 hari, belum perlu keluar
BLUE (receh)     → Ada flag isReceh = true
RED (wrong cluster / in transit) → Produk di lokasi yang salah ATAU di In Transit area
EMPTY (kosong)   → Tidak ada stock di lokasi
```

#### 3. Filter & Search
- Filter: Cluster, Lorong, Baris, Product, Status
- Search: Product name, Product code, BB Pallet, Location string

#### 4. In Transit Indicator
- Lorong yang masuk `inTransitLorongRange` ditandai khusus
- Cell di In Transit selalu RED (buffer/overflow)

**Perlu di Database:**
- `cluster_configs` untuk struktur
- `cluster_cell_overrides` untuk custom per lorong/baris
- `stock_list` untuk data stok
- `product_homes` untuk validasi wrong cluster

**Catatan Frontend Only:**
- Perhitungan warna berdasarkan expired date
- Visualisasi grid (render di client)
- Collapse/expand cluster

---

### F. Stock List (`src/app/stock-list/page.tsx`)

**Logic:**

#### 1. Statistics Calculation
```javascript
stats = {
  totalItems: stockListData.length,
  totalHold: filter(status === "hold"),
  totalRelease: filter(status === "release"),
  totalReceh: filter(status === "receh"),
  totalSalahCluster: filter(status === "salah-cluster"),
  totalQtyCarton: sum(qtyCarton),
  expiringSoon: filter(daysToExpiry < 180)  // < 6 bulan
}
```

#### 2. Days to Expired Display
```javascript
// Format: "X bulan Y hari"
diffDays = (expiredDate - today) / (1000 * 3600 * 24)
months = Math.floor(diffDays / 30)
days = diffDays % 30

// Warna:
RED    → diffDays < 0 (Expired!)
ORANGE → diffDays < 90
YELLOW → diffDays < 180
GREEN  → diffDays >= 180
```

#### 3. Filter & Sort
- Search: product name, code, batch, lot, BB pallet, location
- Filter: Cluster, Status
- Sort: Expired date, Inbound date, Product name

#### 4. Pagination
- 10 items per page
- Reset ke page 1 saat filter berubah

**Perlu di Database:**
- `stock_list` dengan semua field
- Query dengan filter WHERE + ORDER BY + LIMIT OFFSET

---

### G. Master Data (`src/app/stock-list-master/page.tsx`)

**4 Tab:**

#### Tab 1: Produk
- CRUD product dengan field: code, name, qtyPerCarton, qtyCartonPerPallet, defaultCluster
- Filter by cluster, search by name/code

#### Tab 2: Ekspedisi
- CRUD ekspedisi dengan field: code, name
- Simple list

#### Tab 3: Cluster Config
- CRUD cluster dengan nested config:
  - Default: lorongCount, barisCount, palletPerSel
  - Custom Lorong: override barisCount per lorong range
  - Custom Cell: override palletPerSel per cell range
  - In Transit: define lorong range untuk buffer

#### Tab 4: Product Home
- CRUD product home assignment:
  - Product → Cluster → Lorong Range → Baris Range → Max Pallet

**Perlu di Database:**
- `products` (per warehouse)
- `expeditions` (per warehouse)
- `cluster_configs` (per warehouse)
- `cluster_cell_overrides` (per cluster_config)
- `product_homes` (per warehouse)

---

### H. Pre-Stock Opname - Input (`src/app/stock-opname/page.tsx`)

**Logic:**

#### 1. Blind System
- Admin warehouse input qty tanpa melihat data sistem
- Semua produk wajib diisi (minimal 0)

#### 2. Auto-capture Waktu
- Tanggal = hari ini (readonly)
- Waktu = saat submit (auto-capture)

#### 3. Auditor Autocomplete
- History auditor name dari localStorage

#### 4. Submission
```javascript
payload = {
  id: `AUDIT-${timestamp}`,
  auditorName: string,
  auditDate: "YYYY-MM-DD",
  auditTime: "HH:MM",
  items: [{ productCode, productName, auditQty }],
  reconciliationStatus: "pending"
}
```

**Perlu di Database:**
- `prestock_opname` header
- `prestock_opname_items` detail

---

### I. Pre-Stock Opname - Rekonsel (`src/app/prestock-opname-history/page.tsx`)

**Logic:**

#### 1. Comparison Logic
```javascript
// Bandingkan dengan audit SEBELUMNYA (bukan data sistem!)
previousAudit = historyData[currentIndex + 1]  // Array sorted TERBARU ke TERLAMA

for (item of currentAudit.items) {
  prevItem = previousAudit.items.find(p => p.productCode === item.productCode)
  prevQty = prevItem?.auditQty || 0
  diff = item.auditQty - prevQty
  isMatch = diff === 0
}
```

#### 2. Sorting Display
```javascript
// Tampilkan BEDA dulu (sorted by abs(diff) DESC), baru SAMA
sortedComparisons = comparisons.sort((a, b) => {
  if (!a.isMatch && b.isMatch) return -1;  // BEDA di atas
  if (a.isMatch && !b.isMatch) return 1;
  if (!a.isMatch && !b.isMatch) return Math.abs(b.diff) - Math.abs(a.diff);  // Selisih terbesar di atas
  return 0;
})
```

#### 3. Reconciliation Required
- Semua item dengan selisih WAJIB ada alasan
- Simpan reconciliation notes per product

#### 4. Export Excel
- History table export
- Detail rekonsel export (dengan metadata)

**Perlu di Database:**
- `prestock_opname` dengan reconciliation fields
- `prestock_opname_items` dengan reconciliation_reason

---

### J. Admin Management (`src/app/admin-management/page.tsx`)

**Logic:**

#### 1. CRUD Admin Warehouse
- Add: username, name, email, password (hash di production)
- Toggle status: aktif/nonaktif
- Delete: dengan konfirmasi

#### 2. Stats
- Total admin
- Admin aktif
- Admin nonaktif

**Perlu di Database:**
- `users` dengan is_active flag
- Filter by role = 'admin_warehouse'

**Catatan Migrasi Role Baru:**
- Halaman ini perlu diupdate untuk 3 role
- developer → bisa kelola semua
- admin_cabang → hanya bisa kelola admin_warehouse di warehouse sendiri

---

## 3. Logic yang Perlu Masuk Database {#logic-database}

### A. Wajib di Database (Core Data)

| Logic | Tabel | Alasan |
|-------|-------|--------|
| Stock per lokasi | `stock_list` | Data utama, harus persisten |
| History inbound | `inbound_history` | Audit trail |
| History outbound | `outbound_history` | Audit trail |
| Stock opname | `prestock_opname*` | Audit & rekonsel |
| User & role | `users` | Autentikasi |
| Master produk | `products` | Reference data |
| Master ekspedisi | `expeditions` | Reference data |
| Cluster config | `cluster_configs` + `overrides` | Struktur gudang |
| Product home | `product_homes` | Aturan penempatan |

### B. Perlu Computed di Database (Views/Functions)

| Logic | Implementasi |
|-------|--------------|
| Status stock (release/hold) | View atau trigger berdasarkan expired_date |
| Days to expired | Computed column atau view |
| Wrong cluster detection | Query JOIN dengan product_homes |
| FEFO query | ORDER BY expired_date ASC |

---

## 4. Logic yang Hanya di Frontend {#logic-frontend}

### A. Tetap di Frontend (UI/UX)

| Logic | Alasan |
|-------|--------|
| BB Produk parsing | Simple string manipulation |
| Warna status (green/yellow/blue/red) | Visual only |
| Grid visualization | Render only |
| Collapse/expand cluster | UI state |
| Filter & search (client-side) | UX responsiveness |
| Pagination state | UI state |
| Modal state | UI state |
| Form validation (client) | UX feedback |
| Autocomplete history | localStorage atau API |

### B. Bisa di Frontend atau Backend

| Logic | Rekomendasi | Alasan |
|-------|-------------|--------|
| Rekomendasi lokasi inbound | **Backend** | Complex query, consistency |
| FEFO calculation | **Backend** | Atomic operation |
| Smart receh logic | **Frontend** | Simple calculation |
| Stock statistics | **Backend** | Aggregate query |
| Export Excel | **Frontend** | xlsx library sudah ada |

---

## 5. Rekomendasi Implementasi {#rekomendasi}

### A. Database Schema Update

1. **Tambah `warehouse_id` ke:**
   - products
   - expeditions

2. **Update `users` table:**
   ```sql
   role: 'developer' | 'admin_cabang' | 'admin_warehouse'
   warehouse_id: NULL (developer) atau UUID (admin_cabang, admin_warehouse)
   ```

3. **API Endpoints yang Dibutuhkan:**
   ```
   AUTH:
   POST /api/auth/login
   POST /api/auth/logout
   GET  /api/auth/me

   PRODUCTS (per warehouse):
   GET    /api/products?warehouse_id=xxx
   POST   /api/products
   PUT    /api/products/:id
   DELETE /api/products/:id

   STOCK:
   GET  /api/stock?warehouse_id=xxx&filters...
   POST /api/stock/inbound
   POST /api/stock/outbound

   OPNAME:
   GET  /api/opname?warehouse_id=xxx
   POST /api/opname
   PUT  /api/opname/:id/reconcile

   CONFIG:
   GET/POST/PUT /api/cluster-config
   GET/POST/PUT /api/product-homes

   USERS:
   GET/POST/PUT/DELETE /api/users
   ```

### B. Migration Priority

1. **Phase 1 - Core Data:**
   - Users & auth
   - Products
   - Stock list
   - Basic inbound/outbound

2. **Phase 2 - Configuration:**
   - Cluster configs
   - Product homes
   - Expeditions

3. **Phase 3 - Advanced:**
   - Stock opname
   - Full audit trail
   - Stock movements log

### C. Frontend Changes Needed

1. **Replace localStorage with API calls**
2. **Add warehouse context/provider**
3. **Update role checks for 3-role system**
4. **Add loading states for API calls**
5. **Error handling for API failures**

---

## Summary Statistics

| Kategori | Jumlah |
|----------|--------|
| Total Pages | 9 |
| Total Components | 10 |
| Total Mock Files | 5 |
| Logic yang masuk DB | 15+ |
| Logic frontend only | 10+ |
| API Endpoints needed | ~20 |

---

## Summary: Fitur Edit & Batal

### Perbandingan Inbound vs Outbound Edit/Batal

| Aspek | Inbound | Outbound |
|-------|---------|----------|
| **Tabel data** | "Transaksi Hari Ini" | "Transaksi Hari Ini" |
| **Filter** | `tanggal === today` | `tanggal === today` |
| **Tombol** | Detail, Ubah, Batal | Detail, Ubah, Batal |
| **Edit logic** | Hapus stock + load form | Kembalikan stock + load form |
| **Batal logic** | Hapus stock + hapus record | Kembalikan stock + hapus record |
| **Stock return** | Tidak ada (stock dihapus) | Ada (ke lokasi asal / In Transit) |
| **Conflict handling** | N/A | Jika lokasi terisi → In Transit |

### UI Changes

1. **Tabel "Transaksi Terakhir"** → diubah menjadi **"Transaksi Hari Ini"**
2. **Tombol icon** → diubah menjadi **text buttons** ("Detail", "Ubah", "Batal")
3. **Modal konfirmasi** → ditambahkan untuk Edit dan Batal
4. **Toast notification** → menampilkan status sukses/error

---

---

## 6. NPL - Nota Pengembalian Lapangan (Inbound Secondary)

### K. NPL Form (`src/components/npl-form.tsx`)

**Purpose:** Return stock dari lapangan yang tidak terjual kembali ke gudang (Inbound Secondary)

**Logic:**

#### 1. Input Form
```javascript
// Field yang diperlukan (mirip Inbound, tapi TANPA ekspedisi dan DN)
{
  namaPengemudi: string,     // Nama driver yang mengembalikan
  nomorPolisi: string,       // Plat nomor kendaraan
  productCode: string,       // Produk yang dikembalikan
  bb_produk: string,         // BB Produk WAJIB - 10 digit: YYMMDDXXXX
  qtyCarton: number,         // Jumlah karton yang dikembalikan
  notes: string              // Catatan opsional
}
```

#### 2. Perbedaan dengan Inbound Primary
| Aspek | Inbound Primary | NPL (Inbound Secondary) |
|-------|-----------------|-------------------------|
| Ekspedisi | Ada (dropdown) | Tidak ada |
| No. DN | Ada | Tidak ada |
| BB Produk | Input manual (10 digit) | Input manual (10 digit) - SAMA |
| Expired Date | Dari BB Produk | Dari BB Produk - SAMA |
| Transaction Code | INB-YYYYMMDD-XXXX | NPL-YYYYMMDD-XXXX |

**PENTING - BB Produk & Expired Date NPL:**
- BB Produk WAJIB diinput (dari kemasan barang yang dikembalikan)
- Format: YYMMDDXXXX (10 digit, tidak boleh lebih/kurang)
- Expired date diekstrak dari BB Produk, bukan +6 bulan otomatis
- Logika +6 bulan sudah DIHAPUS karena tidak valid

#### 3. Rekomendasi Lokasi
```javascript
// Sama dengan Inbound - menggunakan product home
const findRecommendedLocation = (productCode) => {
  const productHome = getValidLocationsForProduct(productCode);
  const cluster = productHome?.cluster || product?.defaultCluster;
  // Cari lokasi kosong sesuai product home
  // Return: { cluster, lorong, baris, level }
};
```

#### 4. Edit & Batal NPL Hari Ini
- Filter transaksi hari ini
- Edit: Hapus stock + hapus record + load ke form
- Batal: Hapus stock + hapus record

**Perlu di Database:**
- Tabel `npl_history` (struktur mirip inbound_history, tanpa expedition_id dan dn_number)
- Update `stock_list` saat NPL disubmit

---

## 7. Permutasi - Stock Relocation

### L. Permutasi Form (`src/components/permutasi-form.tsx`)

**Purpose:** Relokasi stock yang berada di lokasi salah (wrong cluster) atau di area In Transit

**Logic:**

#### 1. Deteksi Stock Salah Lokasi
```javascript
// Scan semua stock, validasi lokasi
stockListData.forEach(stock => {
  const lorongNum = parseInt(stock.location.lorong.replace("L", ""));
  const barisNum = parseInt(stock.location.baris.replace("B", ""));

  // Cek In Transit
  if (isInTransitLocation(stock.location.cluster, lorongNum)) {
    // Masuk tab "In Transit"
    return { ...stock, reason: "in-transit" };
  }

  // Cek wrong cluster
  const validation = validateProductLocation(productCode, cluster, lorong, baris);
  if (!validation.isValid) {
    // Masuk tab "Salah Cluster"
    return { ...stock, reason: "salah-cluster" };
  }
});
```

#### 2. Tiga Tab Interface
| Tab | Fungsi | Data Source |
|-----|--------|-------------|
| Salah Cluster | Stock yang tidak sesuai product home | `validateProductLocation() === false` |
| In Transit | Stock di area buffer/overflow | `isInTransitLocation() === true` |
| History Hari Ini | Log pemindahan hari ini | `permutasi_history.tanggal === today` |

#### 3. Proses Pemindahan
```javascript
// Single item move
const moveStock = (stockId, targetLocation) => {
  // 1. Update stock_list.location
  stockListData[stockIndex].location = targetLocation;
  
  // 2. Catat ke permutasi_history
  permutasiHistoryData.push({
    productCode, fromLocation, toLocation, reason, movedBy, movedAt
  });
};

// Batch move (multiple items)
selectedItems.forEach(id => {
  const recommended = findRecommendedLocation(stock.productCode);
  if (recommended) moveStock(id, recommended);
});
```

#### 4. Rekomendasi Lokasi Tujuan
```javascript
// Auto-recommend berdasarkan product home
// Manual: User pilih cluster, lorong, baris, pallet
// Validasi: Cek lokasi tidak terisi
```

**Perlu di Database:**
- Tabel `permutasi_history` untuk audit trail pemindahan
- UPDATE `stock_list.location` saat konfirmasi

---

## Summary: NPL vs Inbound vs Outbound

| Aspek | Inbound | NPL | Outbound |
|-------|---------|-----|----------|
| Direction | IN (from expedition) | IN (from field return) | OUT (to customer) |
| Expedition | Ya | Tidak | Ya |
| DN Number | Ya | Tidak | Tidak |
| BB Produk | Manual input (10 digit) | Manual input (10 digit) | Dari stock |
| Expired | From BB Produk | From BB Produk | N/A |
| Stock Effect | Create new | Create new | Reduce/delete |
| Transaction Code | INB- | NPL- | OUT- |

**CATATAN PENTING:**
- BB Produk di NPL TIDAK auto-generate
- Expired date di NPL TIDAK +6 bulan otomatis
- Keduanya harus diekstrak dari BB Produk yang diinput

## Summary: Permutasi

| Aspek | Keterangan |
|-------|------------|
| Purpose | Fix wrong location stock |
| Triggers | Salah cluster, In Transit overflow |
| Detection | validateProductLocation(), isInTransitLocation() |
| Modes | Auto-recommend, Manual selection |
| Batch | Yes (select multiple) |
| Audit | permutasi_history table |

---

---

## 8. UI/UX Standards

### A. Modal Popup Standards

Semua modal popup wajib memenuhi kriteria berikut:

1. **Responsive Design**
   - `max-w-md`, `max-w-lg`, atau `max-w-2xl` sesuai konten
   - `max-h-[90vh] overflow-y-auto` untuk scroll di device kecil
   - Padding responsive: `p-4 md:p-6`

2. **Dismiss on Backdrop Click**
   ```javascript
   // Semua modal harus bisa di-dismiss dengan klik di luar
   <div 
     className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
     onClick={() => setShowModal(false)}
   >
     <div onClick={(e) => e.stopPropagation()}>
       {/* Modal content */}
     </div>
   </div>
   ```

3. **Jenis Modal yang Digunakan:**
   - **Confirmation Modal**: Sebelum submit form apapun
   - **Notification Modal**: Success/Error/Warning message
   - **Detail Modal**: View data detail
   - **Edit/Batal Confirm Modal**: Sebelum edit/batal transaksi

### B. Form Layout Standards

1. **Container Width**
   - Main form: `max-w-6xl mx-auto`
   - Consistent dengan outbound-form layout

2. **Grid Layout**
   - Form area: `lg:col-span-2`
   - Side panel (history): `lg:col-span-1`

3. **Padding**
   - Card padding: `p-4 md:p-6`
   - Responsive spacing

### C. Form Submission Behavior

1. **Inbound & Outbound Post-Submit**
   - Field yang di-keep: ekspedisi, tanggal, namaPengemudi, noDN, nomorPolisi
   - Field yang di-reset: productCode, bbProduk, qty, location
   - User dapat langsung mengisi produk baru tanpa re-input driver info

2. **NPL Post-Submit**
   - Field yang di-keep: namaPengemudi, nomorPolisi
   - Field yang di-reset: productCode, bbProduk, qty, location

### D. Warehouse Layout - Detail Popup

Informasi yang ditampilkan di popup detail pallet:
1. **Kode Produk** (prominent display)
2. **Nama Produk**
3. **BB Pallet**
4. **Qty Pallet** (tumpukan)
5. **Qty Carton** (kardus)
6. **Total Pieces**
7. **Lokasi** (Cluster, Lorong, Baris, Level)
8. **Status** (Release/Hold/Receh/Wrong Cluster)
9. **In Transit indicator** (jika applicable)

---

## 9. Outbound History - Superadmin View

### A. Fitur BB Produk per Lokasi FEFO

Sistem FEFO (First Expired First Out) mengambil stock dari berbagai lokasi dengan expired date berbeda. Setiap lokasi memiliki BB Produk yang berbeda.

**Logic Tampilan Tabel:**
```javascript
// Helper: Get BB Produk list from locations
const getBBProdukFromLocations = (locations: string[]): string[] => {
  const bbList: string[] = [];
  locations.forEach((location) => {
    const stockItem = stockListData.find(
      (stock) => `${stock.location.cluster}-${stock.location.lorong}-${stock.location.baris}-${stock.location.level}` === location
    );
    if (stockItem) {
      const bb = Array.isArray(stockItem.bbPallet) ? stockItem.bbPallet : [stockItem.bbPallet];
      bb.forEach(b => {
        if (b && b !== '-' && !bbList.includes(b)) {
          bbList.push(b);
        }
      });
    }
  });
  return bbList;
};

// Tampilan di tabel:
// - Jika 1 BB Produk: tampilkan langsung
// - Jika >1 BB Produk: tampilkan pertama + "+N lainnya"
```

**Logic Export Excel:**
```javascript
// Format: 1 baris per lokasi (bukan per transaksi)
// Satu ID Transaksi bisa memiliki banyak baris
filteredData.forEach((item) => {
  item.locations.forEach((location, locIdx) => {
    const stockItem = stockListData.find(...);
    const bbProduk = stockItem?.bbPallet || '-';
    const expiredDate = stockItem?.expiredDate || '-';
    
    exportData.push({
      'No': rowNum++,
      'ID Transaksi': item.id,
      'Lokasi #': locIdx + 1,
      'Lokasi': location,
      'BB Produk': bbProduk,
      'Expired Date': expiredDate,
      // ... field lainnya
    });
  });
});
```

**Kolom Tabel Baru:**
| Kolom | Deskripsi |
|-------|-----------|
| BB Produk | Daftar BB Produk dari semua lokasi FEFO |
| - | Tampilan: "2512210001" atau "2512210001 +1 lainnya" |

**Modal Detail:**
- Setiap lokasi FEFO menampilkan:
  - Nomor urut lokasi (#1, #2, ...)
  - Alamat lokasi (A-L1-B3-P1)
  - BB Produk
  - Expired Date
  - QR Code dari BB Produk

### B. Schema vs Kondisi Saat Ini

| Aspek | Schema DB | Kondisi Frontend |
|-------|-----------|------------------|
| BB Produk | `outbound_history.bb_produk` - 1 per record | Multiple BB Produk dari locations FEFO |
| Locations | `locations jsonb` dengan struktur | Array string lokasi, BB dari stock_list JOIN |
| Export | 1 baris per transaksi | 1 baris per lokasi (lebih detail) |
| QR Code | Tidak ada di schema | Generate dari BB Produk per lokasi |

**Rekomendasi Update Schema:**
```json
// locations jsonb structure
[
  {
    "cluster": "A",
    "lorong": 1,
    "baris": 3,
    "level": 1,
    "qty_carton": 48,
    "stock_id": "uuid",
    "bb_produk": "2512210001",  // Tambahkan field ini
    "expired_date": "2025-12-21"
  }
]
```

---

*Document generated: 2025-12-21*  
*Updated: 2025-12-22 (Added NPL and Permutasi feature documentation)*  
*Updated: 2025-12-22 (Added UI/UX Standards - Modal, Form Layout, Post-Submit behavior)*  
*Updated: 2025-12-22 (Renamed WMS Cikarang to WMS Lite)*  
*Updated: 2025-12-22 (Added Outbound History BB Produk per Lokasi FEFO)*  
*Updated: 2025-12-22 (Added users-mock.ts, updated ekspedisi to per-warehouse, Stock List renamed)*  
*Updated: 2025-12-26 (Field naming: qtyPerPallet → qtyCartonPerPallet)*  
*For: WMS Lite Database Migration*

**✅ Documentation Status**: UP-TO-DATE (26 Des 2025)  
**All minor issues resolved**: Field naming ✅ | Warehouse context ✅ | DBML complete ✅

---

## 10. Mock Data Files Summary

### File Structure

| File | Deskripsi | Status |
|------|-----------|--------|
| `users-mock.ts` | Data user dengan 3 role (developer, admin_cabang, admin_warehouse) | **BARU** |
| `product-master.ts` | Master produk + ekspedisi (per-warehouse) | Updated |
| `warehouse-config.ts` | Cluster config + product homes | Complete |
| `stocklistmock.ts` | Stock data dengan dynamic status | Complete |
| `transaction-history.ts` | Inbound + Outbound history | Complete |
| `npl-history.ts` | NPL (return) history | Complete |
| `permutasi-history.ts` | Permutasi (relokasi) history | Complete |
| `prestock-opname-history.ts` | Stock opname history | Complete |

### Data Relationships

```
warehouses (2 records: Cikarang, Bandung)
    ├── users (7 records)
    │   ├── 1 developer (akses semua)
    │   ├── 2 admin_cabang (1 per warehouse)
    │   └── 4 admin_warehouse (2 Cikarang, 1 Bandung, 1 inactive)
    ├── products (29 records - Cikarang only in mock)
    ├── expeditions (10 records - 7 Cikarang, 3 Bandung)
    ├── cluster_configs (5 clusters: A, B, C, D, E)
    ├── product_homes (25 assignments)
    └── stock_list (generated dynamically)
```
