// Warehouse Configuration Mock Data
// This defines the customizable structure of clusters, lorong, baris, and pallet capacity

export interface CustomLorongConfig {
  lorongRange: [number, number]; // [start, end] e.g., [1, 2] means lorong 1-2
  barisCount: number; // Custom number of baris for this lorong range
  palletPerSel?: number; // Optional custom pallet capacity
}

export interface CustomCellConfig {
  lorongRange: [number, number]; // [start, end]
  barisRange: [number, number]; // [start, end]
  palletPerSel: number; // Custom pallet capacity for this specific cell range
}

export interface ClusterConfig {
  id: string;
  cluster: string;
  clusterName: string;
  defaultLorongCount: number; // Default number of lorong
  defaultBarisCount: number; // Default number of baris
  defaultPalletPerSel: number; // Default pallet capacity per cell
  customLorongConfig?: CustomLorongConfig[]; // Custom lorong configurations
  customCellConfig?: CustomCellConfig[]; // Custom cell configurations
  inTransitLorongRange?: [number, number]; // Optional: Lorong range for In Transit area (buffer for overflow)
  isActive: boolean;
}

export interface ProductHome {
  id: string;
  productCode: string;
  productName: string;
  homeCluster: string; // Primary cluster
  allowedLorongRange: [number, number]; // [start, end] e.g., [1, 2]
  allowedBarisRange: [number, number]; // [start, end] e.g., [1, 8]
  maxPalletPerLocation: number; // Max pallet that can be stored per location
  isActive: boolean;
}

// MOCK DATA: Cluster Configurations
export const clusterConfigs: ClusterConfig[] = [
  {
    id: "cluster-a",
    cluster: "A",
    clusterName: "Cluster A - Fast Moving",
    defaultLorongCount: 11,
    defaultBarisCount: 9,
    defaultPalletPerSel: 3,
    customLorongConfig: [
      {
        lorongRange: [1, 2],
        barisCount: 8, // Lorong 1-2 only have 8 baris
        palletPerSel: 2, // And only 2 pallet per sel (220ML AQUA CUBE MINI)
      },
    ],
    customCellConfig: [
      {
        lorongRange: [3, 3],
        barisRange: [1, 9],
        palletPerSel: 2, // Lorong 3, all 9 baris, 2 pallet per sel (220ML AQUA CUBE MINI)
      },
      {
        lorongRange: [4, 5],
        barisRange: [1, 9],
        palletPerSel: 2, // Lorong 4-5, all 9 baris, 2 pallet per sel (200ML AQUA LOCAL)
      },
      // Lorong 6-11 baris 1-9 will use default 3 pallet per sel (600ML AQUA LOCAL)
    ],
    isActive: true,
  },
  {
    id: "cluster-b",
    cluster: "B",
    clusterName: "Cluster B - Medium Moving",
    defaultLorongCount: 26, // Updated: Lorong 1-26
    defaultBarisCount: 8, // Most common baris count
    defaultPalletPerSel: 2, // Most common pallet capacity
    customLorongConfig: [
      {
        lorongRange: [26, 26],
        barisCount: 6, // Lorong 26 hanya 6 baris untuk semua Reflections
      },
    ],
    customCellConfig: [
      {
        lorongRange: [1, 6],
        barisRange: [1, 8],
        palletPerSel: 2, // 1500ML AQUA LOCAL 1X12
      },
      {
        lorongRange: [6, 12],
        barisRange: [1, 8],
        palletPerSel: 3, // 330ML AQUA LOCAL 1X24 (highlighted)
      },
      {
        lorongRange: [13, 16],
        barisRange: [1, 8],
        palletPerSel: 2, // 750ML AQUA LOCAL 1X18
      },
      {
        lorongRange: [17, 18],
        barisRange: [1, 8],
        palletPerSel: 2, // 1100ML AQUA LOCAL 1X12 BARCODE ON CAP
      },
      {
        lorongRange: [19, 20],
        barisRange: [1, 8],
        palletPerSel: 1, // 1500ML AQUA LOCAL MULTIPACK 1X6
      },
      {
        lorongRange: [21, 21],
        barisRange: [1, 8],
        palletPerSel: 1, // 600ML AQUA LOCAL MULTIPACK 1X6
      },
      {
        lorongRange: [22, 22],
        barisRange: [1, 8],
        palletPerSel: 2, // 550ML VIT LOCAL 1X24
      },
      {
        lorongRange: [23, 23],
        barisRange: [1, 8],
        palletPerSel: 2, // 330ML VIT LOCAL 1X24
      },
      {
        lorongRange: [24, 24],
        barisRange: [1, 8],
        palletPerSel: 2, // 200ML VIT LOCAL 1X48
      },
      {
        lorongRange: [25, 25],
        barisRange: [1, 8],
        palletPerSel: 2, // 1500ML VIT LOCAL 1X12
      },
      {
        lorongRange: [26, 26],
        barisRange: [1, 6],
        palletPerSel: 1, // ALL REFLECTIONS (6 baris total, 1 pallet each)
      },
    ],
    isActive: true,
  },
  {
    id: "cluster-c",
    cluster: "C",
    clusterName: "Cluster C - Mizone Products + In Transit",
    defaultLorongCount: 16, // Lorong 1-16 (L1-L9: Mizone, L10-L16: In Transit)
    defaultBarisCount: 5, // All lorongs have 5 baris
    defaultPalletPerSel: 3, // All cells have 3 pallet capacity
    customLorongConfig: [],
    customCellConfig: [],
    inTransitLorongRange: [10, 16], // Lorong 10-16 adalah In Transit area (buffer/overflow)
    isActive: true,
  },
  {
    id: "cluster-d",
    cluster: "D",
    clusterName: "Cluster D - Galon AQUA 5 Liter",
    defaultLorongCount: 3, // L1-L3
    defaultBarisCount: 5, // All lorongs have 5 baris
    defaultPalletPerSel: 1, // 1 pallet per baris
    customLorongConfig: [],
    customCellConfig: [],
    isActive: true,
  },
  {
    id: "cluster-e",
    cluster: "E",
    clusterName: "Cluster E - Galon VIT 5 Liter",
    defaultLorongCount: 3, // L1-L3 (each cluster has independent lorong numbering)
    defaultBarisCount: 5, // All lorongs have 5 baris
    defaultPalletPerSel: 1, // 1 pallet per baris
    customLorongConfig: [],
    customCellConfig: [],
    isActive: true,
  },
];

// MOCK DATA: Product Home Assignments
export const productHomes: ProductHome[] = [
  {
    id: "ph-001",
    productCode: "AQ-220-CUBE-24",
    productName: "220ML AQUA CUBE MINI BOTTLE LOCAL 1X24",
    homeCluster: "A",
    allowedLorongRange: [1, 3],
    allowedBarisRange: [1, 9], // Note: Lorong 1-2 only have 8 baris, Lorong 3 has 9
    maxPalletPerLocation: 2,
    isActive: true,
  },
  {
    id: "ph-002",
    productCode: "AQ-200-LOC-48",
    productName: "200ML AQUA LOCAL 1X48",
    homeCluster: "A",
    allowedLorongRange: [4, 5],
    allowedBarisRange: [1, 9],
    maxPalletPerLocation: 2,
    isActive: true,
  },
  {
    id: "ph-003",
    productCode: "AQ-600-LOC-24",
    productName: "600ML AQUA LOCAL 1X24",
    homeCluster: "A",
    allowedLorongRange: [6, 11],
    allowedBarisRange: [1, 9],
    maxPalletPerLocation: 3,
    isActive: true,
  },
  {
    id: "ph-004",
    productCode: "AQ-1500ML",
    productName: "1500ML AQUA LOCAL 1X12",
    homeCluster: "B",
    allowedLorongRange: [1, 6],
    allowedBarisRange: [1, 8],
    maxPalletPerLocation: 2,
    isActive: true,
  },
  {
    id: "ph-005",
    productCode: "AQ-330ML",
    productName: "330ML AQUA LOCAL 1X24",
    homeCluster: "B",
    allowedLorongRange: [6, 12], // Updated: Lorong 6-12 (overlaps with 1500ML di lorong 6)
    allowedBarisRange: [1, 8],
    maxPalletPerLocation: 3,
    isActive: true,
  },
  {
    id: "ph-006",
    productCode: "AQ-750ML",
    productName: "750ML AQUA LOCAL 1X18",
    homeCluster: "B",
    allowedLorongRange: [13, 16],
    allowedBarisRange: [1, 8],
    maxPalletPerLocation: 2,
    isActive: true,
  },
  {
    id: "ph-007",
    productCode: "AQ-1100ML-BC",
    productName: "1100ML AQUA LOCAL 1X12 BARCODE ON CAP",
    homeCluster: "B",
    allowedLorongRange: [17, 18],
    allowedBarisRange: [1, 8],
    maxPalletPerLocation: 2,
    isActive: true,
  },
  {
    id: "ph-008",
    productCode: "AQ-1500ML-MP",
    productName: "1500ML AQUA LOCAL MULTIPACK 1X6",
    homeCluster: "B",
    allowedLorongRange: [19, 20],
    allowedBarisRange: [1, 8],
    maxPalletPerLocation: 1,
    isActive: true,
  },
  {
    id: "ph-009",
    productCode: "AQ-600ML-MP",
    productName: "600ML AQUA LOCAL MULTIPACK 1X6",
    homeCluster: "B",
    allowedLorongRange: [21, 21],
    allowedBarisRange: [1, 8],
    maxPalletPerLocation: 1,
    isActive: true,
  },
  {
    id: "ph-010",
    productCode: "VIT-550ML",
    productName: "550ML VIT LOCAL 1X24",
    homeCluster: "B",
    allowedLorongRange: [22, 22],
    allowedBarisRange: [1, 8],
    maxPalletPerLocation: 2,
    isActive: true,
  },
  {
    id: "ph-011",
    productCode: "VIT-330ML",
    productName: "330ML VIT LOCAL 1X24",
    homeCluster: "B",
    allowedLorongRange: [23, 23],
    allowedBarisRange: [1, 8],
    maxPalletPerLocation: 2,
    isActive: true,
  },
  {
    id: "ph-012",
    productCode: "VIT-200ML",
    productName: "200ML VIT LOCAL 1X48",
    homeCluster: "B",
    allowedLorongRange: [24, 24],
    allowedBarisRange: [1, 8],
    maxPalletPerLocation: 2,
    isActive: true,
  },
  {
    id: "ph-013",
    productCode: "VIT-1500ML",
    productName: "1500ML VIT LOCAL 1X12",
    homeCluster: "B",
    allowedLorongRange: [25, 25],
    allowedBarisRange: [1, 8],
    maxPalletPerLocation: 2,
    isActive: true,
  },
  {
    id: "ph-014",
    productCode: "AQ-380-SPARK",
    productName: "380ML AQUA REFLECTIONS SPARKLING 1X12",
    homeCluster: "B",
    allowedLorongRange: [26, 26],
    allowedBarisRange: [1, 1], // 1 baris
    maxPalletPerLocation: 1,
    isActive: true,
  },
  {
    id: "ph-015",
    productCode: "AQ-380-BAL",
    productName: "380ML AQUA REFLECTIONS BAL 1X12",
    homeCluster: "B",
    allowedLorongRange: [26, 26],
    allowedBarisRange: [2, 2], // 1 baris
    maxPalletPerLocation: 1,
    isActive: true,
  },
  {
    id: "ph-016",
    productCode: "AQ-380-SBUX",
    productName: "380ML AQUA REFLECTIONS SBUX BAL 1X12",
    homeCluster: "B",
    allowedLorongRange: [26, 26],
    allowedBarisRange: [3, 4], // 2 baris
    maxPalletPerLocation: 1,
    isActive: true,
  },
  {
    id: "ph-017",
    productCode: "AQ-750-SPARK-BAL",
    productName: "750ML AQUA SPARKLING BAL 1X6",
    homeCluster: "B",
    allowedLorongRange: [26, 26],
    allowedBarisRange: [5, 5], // 1 baris
    maxPalletPerLocation: 1,
    isActive: true,
  },
  {
    id: "ph-018",
    productCode: "AQ-750-REF-BAL",
    productName: "750ML AQUA REFLECTIONS BAL 1X6",
    homeCluster: "B",
    allowedLorongRange: [26, 26],
    allowedBarisRange: [6, 6], // 1 baris
    maxPalletPerLocation: 1,
    isActive: true,
  },
  // Cluster C products (Mizone)
  {
    id: "ph-019",
    productCode: "MIZ-ACTIV",
    productName: "500ML MIZONE ACTIV LYCHEE LEMON 1X12",
    homeCluster: "C",
    allowedLorongRange: [1, 3],
    allowedBarisRange: [1, 5],
    maxPalletPerLocation: 3,
    isActive: true,
  },
  {
    id: "ph-020",
    productCode: "MIZ-MOOD",
    productName: "500ML MIZONE MOOD UP CRANBERRY 1X12",
    homeCluster: "C",
    allowedLorongRange: [4, 6],
    allowedBarisRange: [1, 5],
    maxPalletPerLocation: 3,
    isActive: true,
  },
  {
    id: "ph-021",
    productCode: "MIZ-COCO",
    productName: "500ML MIZONE COCO BOOST 1X12",
    homeCluster: "C",
    allowedLorongRange: [7, 9],
    allowedBarisRange: [1, 5],
    maxPalletPerLocation: 3,
    isActive: true,
  },
  // Cluster D products (Galon AQUA 5 Liter)
  {
    id: "ph-022",
    productCode: "AQ-5GAL",
    productName: "5 GALLON AQUA LOCAL",
    homeCluster: "D",
    allowedLorongRange: [1, 1], // Strict: 1 lorong per product
    allowedBarisRange: [1, 5],
    maxPalletPerLocation: 1, // 1 pallet per baris
    isActive: true,
  },
  {
    id: "ph-023",
    productCode: "AQ-5GAL-RETUR",
    productName: "5 GALLON AQUA LOCAL RETUR",
    homeCluster: "D",
    allowedLorongRange: [2, 2], // Strict: 1 lorong per product
    allowedBarisRange: [1, 5],
    maxPalletPerLocation: 1,
    isActive: true,
  },
  {
    id: "ph-024",
    productCode: "AQ-EMPTY-5GAL",
    productName: "EMPTY BOTTLE AQUA 5 GALLON",
    homeCluster: "D",
    allowedLorongRange: [3, 3], // Strict: 1 lorong per product
    allowedBarisRange: [1, 5],
    maxPalletPerLocation: 1,
    isActive: true,
  },
  // Cluster E products (Galon VIT 5 Liter)
  {
    id: "ph-025",
    productCode: "VIT-5GAL",
    productName: "5 GALLON VIT LOCAL",
    homeCluster: "E",
    allowedLorongRange: [1, 1], // Strict: 1 lorong per product
    allowedBarisRange: [1, 5],
    maxPalletPerLocation: 1,
    isActive: true,
  },
  {
    id: "ph-026",
    productCode: "VIT-5GAL-RETUR",
    productName: "5 GALLON VIT LOCAL RETUR",
    homeCluster: "E",
    allowedLorongRange: [2, 2], // Strict: 1 lorong per product
    allowedBarisRange: [1, 5],
    maxPalletPerLocation: 1,
    isActive: true,
  },
  {
    id: "ph-027",
    productCode: "VIT-EMPTY-5GAL",
    productName: "EMPTY BOTTLE VIT 5 GALLON",
    homeCluster: "E",
    allowedLorongRange: [3, 3], // Strict: 1 lorong per product
    allowedBarisRange: [1, 5],
    maxPalletPerLocation: 1,
    isActive: true,
  },
];

// UTILITY FUNCTIONS

/**
 * Get cluster configuration by cluster name
 */
export function getClusterConfig(cluster: string): ClusterConfig | undefined {
  return clusterConfigs.find((c) => c.cluster === cluster && c.isActive);
}

/**
 * Get product home assignment by product code
 */
export function getProductHome(productCode: string): ProductHome | undefined {
  return productHomes.find((ph) => ph.productCode === productCode && ph.isActive);
}

/**
 * Get number of baris for a specific lorong in a cluster
 */
export function getBarisCountForLorong(cluster: string, lorong: number): number {
  const config = getClusterConfig(cluster);
  if (!config) return 0;

  // Check if this lorong has custom baris count
  const customLorong = config.customLorongConfig?.find(
    (cl) => lorong >= cl.lorongRange[0] && lorong <= cl.lorongRange[1]
  );

  return customLorong?.barisCount ?? config.defaultBarisCount;
}

/**
 * Get pallet capacity for a specific cell (cluster-lorong-baris)
 */
export function getPalletCapacityForCell(
  cluster: string,
  lorong: number,
  baris: number
): number {
  const config = getClusterConfig(cluster);
  if (!config) return 0;

  // Check custom cell config first (most specific)
  const customCell = config.customCellConfig?.find(
    (cc) =>
      lorong >= cc.lorongRange[0] &&
      lorong <= cc.lorongRange[1] &&
      baris >= cc.barisRange[0] &&
      baris <= cc.barisRange[1]
  );

  if (customCell) return customCell.palletPerSel;

  // Check custom lorong config
  const customLorong = config.customLorongConfig?.find(
    (cl) => lorong >= cl.lorongRange[0] && lorong <= cl.lorongRange[1]
  );

  if (customLorong?.palletPerSel) return customLorong.palletPerSel;

  // Return default
  return config.defaultPalletPerSel;
}

/**
 * Validate if a product can be placed in a specific location
 */
export function validateProductLocation(
  productCode: string,
  cluster: string,
  lorong: number,
  baris: number
): { isValid: boolean; reason?: string } {
  const productHome = getProductHome(productCode);
  
  if (!productHome) {
    return { isValid: true }; // No restriction if product home not defined
  }

  // Check cluster
  if (productHome.homeCluster !== cluster) {
    return {
      isValid: false,
      reason: `Product ${productCode} can only be stored in Cluster ${productHome.homeCluster}`,
    };
  }

  // Check lorong range
  if (
    lorong < productHome.allowedLorongRange[0] ||
    lorong > productHome.allowedLorongRange[1]
  ) {
    return {
      isValid: false,
      reason: `Product ${productCode} can only be stored in Lorong ${productHome.allowedLorongRange[0]}-${productHome.allowedLorongRange[1]}`,
    };
  }

  // Check baris range
  if (
    baris < productHome.allowedBarisRange[0] ||
    baris > productHome.allowedBarisRange[1]
  ) {
    return {
      isValid: false,
      reason: `Product ${productCode} can only be stored in Baris ${productHome.allowedBarisRange[0]}-${productHome.allowedBarisRange[1]}`,
    };
  }

  return { isValid: true };
}

/**
 * Get all valid locations for a product
 */
export function getValidLocationsForProduct(productCode: string): {
  cluster: string;
  lorongRange: [number, number];
  barisRange: [number, number];
  maxPalletPerLocation: number;
} | null {
  const productHome = getProductHome(productCode);
  
  if (!productHome) return null;

  return {
    cluster: productHome.homeCluster,
    lorongRange: productHome.allowedLorongRange,
    barisRange: productHome.allowedBarisRange,
    maxPalletPerLocation: productHome.maxPalletPerLocation,
  };
}

/**
 * Check if a location is in In Transit area (buffer/overflow area)
 */
export function isInTransitLocation(cluster: string, lorong: number): boolean {
  const config = getClusterConfig(cluster);
  if (!config || !config.inTransitLorongRange) return false;
  
  return lorong >= config.inTransitLorongRange[0] && lorong <= config.inTransitLorongRange[1];
}

/**
 * Get In Transit lorong range for a cluster
 */
export function getInTransitRange(cluster: string): [number, number] | null {
  const config = getClusterConfig(cluster);
  return config?.inTransitLorongRange ?? null;
}

/**
 * Validate product location with In Transit logic
 * In Transit area can accept any product as overflow/buffer
 */
export function validateProductLocationWithTransit(
  productCode: string,
  cluster: string,
  lorong: number,
  baris: number
): { isValid: boolean; reason?: string; isInTransit?: boolean } {
  // First check if it's in In Transit area
  if (isInTransitLocation(cluster, lorong)) {
    return { 
      isValid: true, 
      isInTransit: true,
      reason: "In Transit area - temporary overflow storage"
    };
  }
  
  // If not in transit, use normal validation
  const normalValidation = validateProductLocation(productCode, cluster, lorong, baris);
  return { ...normalValidation, isInTransit: false };
}
