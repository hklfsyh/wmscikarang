// Master Data Produk - Data produk yang tersedia untuk inbound (belum masuk gudang)
// Tidak ada informasi lokasi/status di sini karena ini adalah master data

export interface ProductMaster {
  id: string;
  productCode: string;
  productName: string;
  category: string;
  unit: string;
  packagingType: string;
  qtyPerCarton: number;
  qtyPerPallet: number;
  description: string;
}

export const productMasterData: ProductMaster[] = [
  {
    id: "PM001",
    productCode: "AQ-200ML-48",
    productName: "200ML AQUA LOCAL 1X48",
    category: "Air Minum Kemasan",
    unit: "Botol",
    packagingType: "Karton",
    qtyPerCarton: 48,
    qtyPerPallet: 60, // 60 cartons per pallet
    description: "Air minum dalam kemasan botol 200ml, isi 48 botol per karton",
  },
  {
    id: "PM002",
    productCode: "AQ-600ML-24",
    productName: "600ML AQUA LOCAL 1X24",
    category: "Air Minum Kemasan",
    unit: "Botol",
    packagingType: "Karton",
    qtyPerCarton: 24,
    qtyPerPallet: 48, // 48 cartons per pallet
    description: "Air minum dalam kemasan botol 600ml, isi 24 botol per karton",
  },
  {
    id: "PM003",
    productCode: "AQ-1500ML-12",
    productName: "1500ML AQUA LOCAL 1X12",
    category: "Air Minum Kemasan",
    unit: "Botol",
    packagingType: "Karton",
    qtyPerCarton: 12,
    qtyPerPallet: 40, // 40 cartons per pallet
    description: "Air minum dalam kemasan botol 1500ml, isi 12 botol per karton",
  },
  {
    id: "PM004",
    productCode: "AQ-330ML-24",
    productName: "330ML AQUA LOCAL 1X24",
    category: "Air Minum Kemasan",
    unit: "Botol",
    packagingType: "Karton",
    qtyPerCarton: 24,
    qtyPerPallet: 50, // 50 cartons per pallet
    description: "Air minum dalam kemasan botol 330ml, isi 24 botol per karton",
  },
];

// Helper function untuk mendapatkan produk by code
export const getProductByCode = (productCode: string): ProductMaster | undefined => {
  return productMasterData.find(p => p.productCode === productCode);
};

// Helper function untuk mendapatkan produk by id
export const getProductById = (id: string): ProductMaster | undefined => {
  return productMasterData.find(p => p.id === id);
};
