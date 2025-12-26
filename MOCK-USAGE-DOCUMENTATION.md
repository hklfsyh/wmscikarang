# Mock Data Usage Documentation
## WMS Cikarang - Mock Data Mapping

Dokumentasi ini mencatat penggunaan setiap mock data dalam sistem WMS Cikarang, termasuk file mana yang menggunakannya dan untuk logika apa. **SEMUA MOCK DATA SUDAH DIGUNAKAN DI UI**.

---

## 1. Master Data Mocks (`src/lib/mock/product-master.ts`)

### `warehousesMock`
**Tipe**: `Warehouse[]`
**Penggunaan**:
- **File**: `src/app/warehouse-management/page.tsx`
  - **Logika**: Menampilkan dan manage master data gudang (WH-CKR, WH-BDG)
- **File**: `src/lib/mock/product-master.ts` (internal)
  - **Logika**: Master data gudang untuk filter dan referensi
- **Status**: ✅ Digunakan di UI untuk warehouse management table### `expeditionsMock`
**Tipe**: `Expedition[]`
**Penggunaan**:
- **File**: `src/app/stock-list-master/page.tsx`
  - **Logika**: CRUD expedition management dengan warehouse filtering
- **File**: `src/components/inbound-form.tsx`
  - **Logika**: Dropdown expedition filtered by currentWarehouseId
- **File**: `src/lib/mock/product-master.ts` (internal)
  - **Logika**: Master data ekspedisi per-warehouse
- **Status**: ✅ Digunakan di UI untuk expedition management dan form dropdowns### `productMasterData`
**Tipe**: `ProductMaster[]`
**Penggunaan**:
- **File**: `src/app/stock-list-master/page.tsx`
  - **Logika**: Menampilkan master data produk di halaman Master Data > Produk
- **File**: `src/app/stock-list/page.tsx`
  - **Logika**: JOIN untuk menampilkan product_name dan product_code di Stock List
- **File**: `src/app/stock-opname/page.tsx`
  - **Logika**: Menampilkan daftar produk untuk input stock opname
- **File**: `src/lib/mock/stocklistmock.ts`
  - **Logika**: Referensi untuk generate stock list data dengan product details
- **Status**: ✅ Digunakan di UI dan internal mock generation

### `ekspedisiMaster` (Legacy)
**Tipe**: `{code: string, name: string}[]`
**Penggunaan**:
- **File**: `src/app/stock-list-master/page.tsx`
  - **Logika**: Menampilkan master data ekspedisi di halaman Master Data > Ekspedisi
- **Status**: ✅ Digunakan di UI (legacy support)

---

## 2. User Management (`src/lib/mock/users-mock.ts`)

### `mockUsers`
**Tipe**: `User[]`
**Penggunaan**:
- **File**: `src/app/admin-management/page.tsx`
  - **Logika**: Menampilkan daftar user di halaman Manajemen Admin
  - **Logika**: Fallback data saat localStorage kosong
  - **Logika**: CRUD operations (create, update, delete users)
- **File**: Seluruh mock files (internal reference)
  - **Logika**: Referensi untuk user_id di audit fields (created_by, performed_by, dll)
- **Status**: ✅ Digunakan di UI dan sebagai referensi foreign key

---

## 3. Warehouse Configuration (`src/lib/mock/warehouse-config.ts`)

### `clusterConfigs`
**Tipe**: `ClusterConfig[]`
**Penggunaan**:
- **File**: `src/app/stock-list-master/page.tsx`
  - **Logika**: Menampilkan konfigurasi cluster di halaman Master Data > Cluster Config
- **Status**: ✅ Digunakan di UI

### `productHomes`
**Tipe**: `ProductHome[]`
**Penggunaan**:
- **File**: `src/app/stock-list-master/page.tsx`
  - **Logika**: Menampilkan aturan "rumah" produk di halaman Master Data > Product Home
- **Status**: ✅ Digunakan di UI

### `clusterCellOverrides`
**Tipe**: `ClusterCellOverride[]`
**Penggunaan**:
- **File**: `src/app/stock-list-master/page.tsx`
  - **Logika**: Menampilkan override konfigurasi cell di detail cluster
- **Status**: ✅ Digunakan di UI

---

## 4. Stock & Inventory (`src/lib/mock/stocklistmock.ts`)

### `stockListData`
**Tipe**: `StockItem[]`
**Penggunaan**:
- **File**: `src/app/stock-list/page.tsx`
  - **Logika**: Menampilkan stok fisik real-time di halaman Stock List
  - **Logika**: Menampilkan layout gudang di Warehouse Layout
  - **Logika**: JOIN dengan productMasterData untuk product_name dan product_code
- **File**: `src/lib/mock/stock-movements.ts`
  - **Logika**: Referensi untuk stock_id di stock movements
- **File**: `src/lib/mock/permutasi-history.ts`
  - **Logika**: Referensi untuk stock_id di permutasi
- **Status**: ✅ Digunakan di UI dan internal mock

---

## 5. Transaction History (`src/lib/mock/transaction-history.ts`)

### `inboundHistoryData`
**Tipe**: `InboundHistory[]`
**Penggunaan**:
- **File**: `src/components/inbound-history.tsx`
  - **Logika**: Menampilkan history inbound transactions dengan filter dan search
  - **Logika**: JOIN dengan productMasterData untuk product_name dan product_code
  - **Logika**: Export Excel dengan detail lokasi penempatan
- **Status**: ✅ Digunakan di UI

### `outboundHistoryData`
**Tipe**: `OutboundHistory[]`
**Penggunaan**:
- **File**: `src/components/outbound-history.tsx`
  - **Logika**: Menampilkan history outbound transactions dengan filter dan search
  - **Logika**: JOIN dengan productMasterData untuk product_name dan product_code
  - **Logika**: Export Excel dengan detail BB Produk per lokasi (FEFO)
  - **Logika**: Modal detail dengan QR Code per lokasi
- **Status**: ✅ Digunakan di UI

---

## 6. NPL History (`src/lib/mock/npl-history.ts`)

### `nplHistoryData`
**Tipe**: `NplHistory[]`
**Penggunaan**:
- **File**: `src/components/npl-form.tsx`
  - **Logika**: Form input NPL dengan validasi BB Produk dan lokasi
  - **Logika**: Menampilkan history NPL hari ini untuk Edit/Batal
  - **Logika**: Auto-rekomendasi lokasi penempatan
  - **Logika**: Parsing BB Produk untuk expired date
- **Status**: ✅ Digunakan di UI

---

## 7. Permutasi History (`src/lib/mock/permutasi-history.ts`)

### `permutasiHistoryData`
**Tipe**: `PermutasiHistory[]`
**Penggunaan**:
- **File**: `src/components/permutasi-form.tsx`
  - **Logika**: Menampilkan stock yang salah lokasi (salah cluster / in-transit)
  - **Logika**: Form relokasi stock dengan rekomendasi lokasi otomatis
  - **Logika**: Batch move untuk multiple items
  - **Logika**: History permutasi hari ini
- **Status**: ✅ Digunakan di UI

---

## 8. Pre-Stock Opname (`src/lib/mock/prestock-opname-history.ts`)

### `prestockOpnameData`
**Tipe**: `PrestockOpname[]`
**Penggunaan**:
- **File**: `src/app/prestock-opname-history/page.tsx`
  - **Logika**: Menampilkan history stock opname di halaman Pre-Stock Opname
  - **Logika**: JOIN dengan users untuk auditor_name dan reconciled_by
- **Status**: ✅ Digunakan di UI

### `prestockOpnameItemsData`
**Tipe**: `PrestockOpnameItem[]`
**Penggunaan**:
- **File**: `src/app/prestock-opname-history/page.tsx`
  - **Logika**: Menampilkan detail items per opname
  - **Logika**: JOIN dengan productMasterData untuk product_name dan product_code
- **Status**: ✅ Digunakan di UI

---

## 9. Stock Movements (Backend Only) (`src/lib/mock/stock-movements.ts`)

### `stockMovementsData`
**Tipe**: `StockMovement[]`
**Penggunaan**:
- **File**: ❌ Backend Only - Tidak tampil di UI
- **Logika**: Audit trail pergerakan stok untuk debugging dan laporan
- **Logika**: Auto-generated saat inbound, outbound, adjustment
- **Status**: ✅ Complete mock untuk backend audit

---

## 10. Activity Logs (Backend Only) (`src/lib/mock/activity-logs.ts`)

### `activityLogsData`
**Tipe**: `ActivityLog[]`
**Penggunaan**:
- **File**: ❌ Backend Only - Tidak tampil di UI
- **Logika**: Security audit dan troubleshooting
- **Logika**: Auto-generated saat setiap aksi user (login, CRUD, dll)
- **Status**: ✅ Complete mock untuk backend audit

---

## Summary Status Penggunaan Mock

| Mock Data | UI Usage | Internal Usage | Status |
|-----------|----------|----------------|--------|
| warehousesMock | ❌ | ✅ (reference) | Complete |
| expeditionsMock | ❌ | ✅ (reference) | Complete |
| productMasterData | ✅ | ✅ (JOIN) | Complete |
| ekspedisiMaster | ✅ | ❌ | Complete |
| mockUsers | ✅ | ✅ (reference) | Complete |
| clusterConfigs | ✅ | ❌ | Complete |
| productHomes | ✅ | ❌ | Complete |
| clusterCellOverrides | ✅ | ❌ | Complete |
| stockListData | ✅ | ✅ (reference) | Complete |
| inboundHistoryData | ✅ | ❌ | Complete |
| outboundHistoryData | ✅ | ❌ | Complete |
| nplHistoryData | ✅ | ❌ | Complete |
| permutasiHistoryData | ✅ | ❌ | Complete |
| prestockOpnameData | ✅ | ❌ | Complete |
| prestockOpnameItemsData | ✅ | ❌ | Complete |
| stockMovementsData | ❌ | ❌ | Complete (Backend) |
| activityLogsData | ❌ | ❌ | Complete (Backend) |

---

## Notes

1. **Backend Only Mocks**: `stockMovementsData` dan `activityLogsData` tidak tampil di UI karena merupakan audit trail backend.

2. **Transaction Mocks**: `inboundHistoryData`, `outboundHistoryData`, `nplHistoryData`, `permutasiHistoryData` SUDAH DIGUNAKAN di komponen UI masing-masing dengan fitur lengkap (filter, search, export, CRUD).

3. **JOIN Operations**: Banyak mock menggunakan JOIN dengan `productMasterData` dan `mockUsers` untuk menampilkan nama-nama dari UUID.

4. **Foreign Key Integrity**: Semua mock data sudah memiliki relasi yang benar sesuai database schema.

---

*Dokumentasi ini dibuat pada: 26 Desember 2025*
*Status: Complete - Semua mock data SUDAH DIGUNAKAN di UI*