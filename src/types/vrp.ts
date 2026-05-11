interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: string;
    properties: Record<string, unknown>;
    geometry: { type: string; coordinates: unknown };
  }>;
}

export interface GroupInfo {
  lat: number | null;
  lng: number | null;
  phone: string;
}

export interface UserLayer {
  layer_id: string;
  dataset_id: string;
  user_id: string;
  title: string;
  points_color: string;
  created_at: string;
  delete_at: string;
  records_count: number;
}

/**
 * Mirrors ReqTerritoryDesignVRP in the main API (request_dtypes.py).
 * complementary_categories is a transient UI field joined into boolean_query before submit.
 */
export interface VrpReportData {
  // Auth / location
  user_id: string;
  city_name: string;
  country_name: string;

  // POI query
  polygons: GeoJsonFeatureCollection;
  boolean_query: string;
  excluded_names: string[];
  complementary_categories?: string[];

  // Territory clustering
  num_groups: number;
  group_size: number;
  outlier_cut_km: number;
  centroid_lat: number | null;
  centroid_lng: number | null;
  group_size_prune_max: number;
  max_solving_time: number;

  // Uploaded layer (optional)
  uploaded_layer_id?: string | null;
  use_uploaded_data_only?: boolean;
  mandatory_layer_id?: string | null;

  // VRP scheduling
  num_work_days: number;

  // Contact
  manager_phone: string;
  groups_info: GroupInfo[];

  // Cost / savings inputs
  current_daily_km_per_van: number;
  weekly_refill_sar: number;
  work_hours_per_day: number;
  store_visit_minutes: number;
  current_stores_per_day: number;
  driver_monthly_salary_sar: number;
  planner_monthly_salary_sar: number;
  work_days_per_week: number;
  work_days_per_month: number;
  avg_revenue_per_store_sar: number;
  revenue_period_days: number;

  // Legacy / unused UI fields
  Type?: string;
}
