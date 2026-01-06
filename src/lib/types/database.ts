// Database types - sesuai dengan Supabase schema (snake_case)
// Ini adalah type definitions untuk data yang diambil langsung dari database

export interface ClusterConfig {
  id: string;
  warehouse_id: string;
  cluster_name: string; // Di database: A, B, C, D, E
  cluster_char: string; // Alias untuk cluster_name
  default_lorong_count: number;
  default_baris_count: number;
  default_pallet_level: number;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClusterCellOverride {
  id: string;
  cluster_config_id: string;
  lorong_start: number;
  lorong_end: number;
  baris_start: number | null;
  baris_end: number | null;
  custom_baris_count: number | null;
  custom_pallet_level: number | null;
  is_transit_area: boolean;
  is_disabled: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductHome {
  id: string;
  warehouse_id: string;
  product_id: string; // UUID
  cluster_char: string;
  lorong_start: number;
  lorong_end: number;
  baris_start: number;
  baris_end: number;
  max_pallet_per_location: number;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  warehouse_id: string;
  product_code: string;
  product_name: string;
  qty_per_carton: number;
  qty_carton_per_pallet: number;
  default_cluster: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Expedition {
  id: string;
  warehouse_id: string;
  expedition_code: string;
  expedition_name: string;
  contact_person: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
