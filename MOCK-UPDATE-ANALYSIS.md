# Mock Data Update Analysis - Products Table
**Tanggal**: 2024-12-24  
**Tujuan**: Mensimulasikan tabel `products`, `expeditions`, dan `warehouses` dari database-schema.dbml sebagai mock data

---

## 1. Perubahan yang Dilakukan

### File yang Diupdate: `src/lib/mock/product-master.ts`

#### A. Penambahan Mock Data Baru

1. **`warehousesMock`** (Simulasi tabel `warehouses`)
   - Struktur sesuai database-schema.dbml
   - 2 warehouse: Cikarang (wh-001-cikarang), Bandung (wh-002-bandung)
   - Fields: id, warehouseCode, cityName, address, phone, isActive, createdAt, updatedAt

2. **`expeditionsMock`** (Simulasi tabel `expeditions`)
   - Struktur PER-WAREHOUSE sesuai database-schema.dbml
   - 6 ekspedisi Cikarang, 3 ekspedisi Bandung
   - Fields: id, warehouseId, expeditionCode, expeditionName, contactPerson, phone, isActive, createdAt, updatedAt

#### B. Update Interface `ProductMaster`

**PERUBAHAN KRITIS** yang mempengaruhi file lain:

| Field Lama | Field Baru | Keterangan |
|------------|------------|------------|
| - | `warehouseId: string` | **BARU**: Produk per-warehouse |
| - | `category: string` | **BARU**: Kategori produk (AQUA, VIT, MIZONE, GALON) |
| - | `unit: string` | **BARU**: Unit (carton, unit) |
| `qtyPerPallet` | `qtyCartonPerPallet` | **RENAMED**: Qty karton per pallet |
| `defaultCluster?: string` | `defaultCluster: string \| null` | **TYPE CHANGED**: Nullable explicit |
| - | `isActive: boolean` | **BARU**: Status aktif |
| - | `createdAt: string` | **BARU**: Timestamp |
| - | `updatedAt: string` | **BARU**: Timestamp |

#### C. Update Data Produk

- **Cikarang**: 29 produk (prod-ckr-001 s/d prod-ckr-029)
- **Bandung**: 5 produk (prod-bdg-001 s/d prod-bdg-005)
- Setiap produk sekarang punya `warehouseId`, `category`, `unit`, `isActive`, timestamps

#### D. Helper Functions Baru

```typescript
// Warehouse
- getWarehouseById(id: string)
- getWarehouseByCode(code: string)

// Expedition
- getExpeditionsByWarehouse(warehouseId: string)
- getExpeditionById(id: string)

// Product (Updated)
- getProductsByWarehouse(warehouseId: string) // BARU
- getProductByCode(productCode, warehouseId?) // UPDATED: tambah warehouseId
- getProductById(id: string) // TETAP SAMA
```

---

## 2. Files yang Terpengaruh (Affected Files)

### ⚠️ **CRITICAL - Perlu Diupdate Segera**

#### A. `src/components/inbound-form.tsx`
**Issues:**
1. ❌ Line 242: `selectedProduct?.qtyPerPallet` → harus jadi `qtyCartonPerPallet`
2. ❌ Line 934: `qtyPerPallet` → harus jadi `qtyCartonPerPallet`
3. ⚠️ Tidak ada filter by `warehouseId` saat fetch produk

**Fix Required:**
```typescript
// OLD
const qtyPerPalletStd = selectedProduct?.qtyPerPallet || 0;

// NEW
const qtyPerPalletStd = selectedProduct?.qtyCartonPerPallet || 0;

// PLUS: Filter by warehouse
const userWarehouseId = JSON.parse(localStorage.getItem("user") || "{}").warehouseId;
const warehouseProducts = getProductsByWarehouse(userWarehouseId);
```

**Impact:** 🔴 **HIGH** - Form tidak bisa calculate qty pallet dengan benar

---

#### B. `src/lib/mock/stocklistmock.ts`
**Issues:**
1. ❌ Line 87: `product.qtyPerPallet` → harus jadi `qtyCartonPerPallet`

**Fix Required:**
```typescript
// OLD
const qtyCarton = qtyPallet * product.qtyPerPallet;

// NEW
const qtyCarton = qtyPallet * product.qtyCartonPerPallet;
```

**Impact:** 🟡 **MEDIUM** - Stock list calculation error

---

#### C. `src/app/stock-list-master/page.tsx`
**Issues:**
1. ❌ Uses `ProductMaster` interface (perlu update karena ada field baru)
2. ⚠️ Tidak ada filter by `warehouseId`

**Fix Required:**
```typescript
// Form initialization harus include field baru
const [formProduct, setFormProduct] = useState<ProductMaster>({
  id: "",
  warehouseId: userWarehouseId, // BARU
  productCode: "",
  productName: "",
  category: "", // BARU
  unit: "carton", // BARU
  qtyPerCarton: 1,
  qtyCartonPerPallet: 1, // RENAMED
  defaultCluster: null,
  isActive: true, // BARU
  createdAt: new Date().toISOString(), // BARU
  updatedAt: new Date().toISOString(), // BARU
});
```

**Impact:** 🟡 **MEDIUM** - Form CRUD produk tidak lengkap

---

#### D. `src/app/stock-list-master/page.tsx.backup`
**Status:** 📁 Backup file - tidak perlu diupdate (akan dihapus nanti)

---

### ✅ **SAFE - Tidak Terpengaruh**

#### E. `src/app/stock-opname/page.tsx`
**Reason:** Hanya read `productMasterData`, tidak akses field yang berubah

#### F. `src/app/stock-list/page.tsx`
**Reason:** Hanya read `productMasterData`, tidak akses field yang berubah

#### G. `src/components/permutasi-form.tsx`
**Reason:** Hanya gunakan `getProductByCode()`, fungsi masih compatible

---

## 3. Summary Perubahan yang Diperlukan

### ✅ ALL PRIORITY 1 & 2 ISSUES RESOLVED (26 Des 2025)

### Priority 1 (Must Fix - Breaking Changes) - ✅ COMPLETED
1. ✅ **DONE**: Update `product-master.ts` dengan struktur baru
2. ✅ **DONE**: Update `inbound-form.tsx` - ganti `qtyPerPallet` → `qtyCartonPerPallet`
3. ✅ **DONE**: Update `stocklistmock.ts` - ganti `qtyPerPallet` → `qtyCartonPerPallet`

### Priority 2 (Should Fix - Feature Incomplete) - ✅ COMPLETED
4. ✅ **DONE**: Update `inbound-form.tsx` - tambah filter by `warehouseId` (26 Des 2025)
5. ✅ **DONE**: Update `outbound-form.tsx` - tambah filter by `warehouseId` (26 Des 2025)
6. ✅ **DONE**: Update `npl-form.tsx` - tambah filter by `warehouseId` (26 Des 2025)
7. ✅ **DONE**: Update `permutasi-form.tsx` - tambah warehouse context (26 Des 2025)
8. ✅ **DONE**: Update `stock-list-master/page.tsx` - tambah field baru di form
9. ✅ **DONE**: Update `stock-list-master/page.tsx` - tambah filter by `warehouseId`

### Priority 3 (Nice to Have) - ✅ COMPLETED (27 Des 2025)
7. ✅ **DONE**: Create new page untuk manage Expeditions (admin_cabang CRUD) - Implemented in `stock-list-master/page.tsx`
8. ✅ **DONE**: Update `warehouse-management/page.tsx` untuk gunakan `warehousesMock` - Table displays WH-CKR (Cikarang) and WH-BDG (Bandung) with proper addresses and phone numbers

**Note**: Priority 3 items completed as part of UI implementation phase.

---

## 4. Backward Compatibility

### Legacy Support yang Dipertahankan:
1. ✅ `ekspedisiMaster` array - untuk backward compatibility
2. ✅ `getProductByCode()` - masih bisa dipanggil tanpa `warehouseId` (akan return first match)
3. ✅ `getProductById()` - tidak berubah

### Breaking Changes (Harus Diupdate):
1. ❌ `qtyPerPallet` → `qtyCartonPerPallet` (semua referensi harus diupdate)
2. ❌ `ProductMaster` interface (ada field baru wajib: warehouseId, category, unit, isActive, timestamps)

---

## 5. Testing Checklist

### ✅ ALL TESTS PASSED (27 Des 2025):
- [x] Test inbound form - qty calculation benar ✅
- [x] Test stock list - calculation benar ✅
- [x] Test product master CRUD - form lengkap ✅
- [x] Test filter by warehouse - form components filter by warehouseId ✅
- [x] Test warehouse context - semua form load warehouseId dari localStorage ✅
- [x] Test expedition management - CRUD expeditions by warehouse ✅
- [x] Test warehouse management - table displays warehousesMock data ✅
- [x] Test expedition dropdown - filtered by currentWarehouseId ✅

---

## 6. Current Status & Next Steps

### ✅ Status Saat Ini (27 Des 2025):
- ✅ Mock data structure: COMPLETE
- ✅ Field naming: CONSISTENT (camelCase)
- ✅ Warehouse context: IMPLEMENTED
- ✅ Form filtering: WORKING
- ✅ Expedition management: IMPLEMENTED (stock-list-master)
- ✅ Warehouse management: IMPLEMENTED (warehouse-management)
- ✅ Documentation: UP-TO-DATE

### 🚀 Next Steps:
1. ✅ **UI Implementation Complete** - All Priority 1, 2, 3 items resolved
2. 🚀 **Start Supabase Setup** - Create project dan setup schema
3. 🚀 **Implement RLS Policies** - Warehouse isolation di database level
4. 🚀 **Migrate to Backend** - Replace mock data with Supabase calls

---

*Dokumentasi terakhir diupdate: 27 Desember 2025*  
*Status: ✅ READY FOR BACKEND IMPLEMENTATION*

---

**Status**: ✅ **Completed** - Mock data sudah diupdate, semua affected files sudah difix, Priority 3 features implemented
