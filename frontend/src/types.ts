export interface ApiEnvelope<T> {
  code: number
  message: string
  data: T
}

export type AppRole = 'admin' | 'farmer' | 'enterprise' | 'regulator' | 'consumer'

export interface UserProfile {
  id: number
  username: string
  display_name: string
  phone: string
  organization: string
  contact_info: string
  role_code: AppRole
  status: string
  approval_status: string
  approved_by?: number
  approved_at?: string
  rejection_reason?: string
  roles: string[]
}

export interface LoginResponse {
  access_token: string
  expires_at: string
  user: UserProfile
}

export interface RegisterRequest {
  username: string
  password: string
  confirm_password: string
  display_name: string
  phone: string
  organization: string
  contact_info: string
  role: Exclude<AppRole, 'admin' | 'regulator'>
}

export interface RegistrationStatusResponse {
  username: string
  role_code: AppRole
  approval_status: string
  rejection_reason?: string
}

export interface TeaBatch {
  id: number
  batch_code: string
  trace_code: string
  product_code: string
  tea_name: string
  tea_type: string
  origin: string
  farm_name: string
  enterprise_name: string
  quantity_kg: number
  harvest_date?: string
  packaging_date?: string
  status: string
  audit_status: string
  latest_grade: string
  public_visible: boolean
  notes: string
  created_by: number
  created_at: string
  updated_at: string
  stage_records?: TraceStageRecord[]
  quality_evaluations?: QualityEvaluation[]
  audit_records?: AuditRecord[]
}

export interface TraceStageRecord {
  id: number
  batch_id: number
  stage: string
  sequence: number
  title: string
  description: string
  location: string
  operator_id: number
  operator_name: string
  operator_role: string
  occurred_at: string
  created_at: string
  updated_at: string
}

export interface MetricInput {
  metric_name: string
  score: number
  comment?: string
}

export interface RadarItem {
  metric_name: string
  metric_label: string
  score: number
  weight: number
  weighted_score: number
  comment?: string
}

export interface QualityEvaluation {
  id: number
  batch_id: number
  evaluator_id: number
  rule_version: string
  total_score: number
  grade: string
  summary: string
  evaluated_at: string
  created_at: string
  updated_at: string
}

export interface QualityEvaluationView {
  evaluation: QualityEvaluation
  radar_data: RadarItem[]
}

export interface AuditRecord {
  id: number
  batch_id: number
  stage_record_id?: number
  reviewer_id: number
  reviewer_name: string
  action: string
  status: string
  comment: string
  reviewed_at: string
  created_at: string
  updated_at: string
}

export interface AuditCreateRequest {
  stage_record_id?: number
  action: string
  status: string
  comment: string
}

export interface PaginationResult<T> {
  items: T[]
  pagination: {
    page: number
    page_size: number
    total: number
  }
}

export interface OverviewStats {
  total_batches: number
  public_batches: number
  total_evaluations: number
  average_score: number
}

export interface ProductionDistributionItem {
  origin: string
  batch_count: number
  total_quantity_kg: number
}

export interface GradeDistributionItem {
  grade: string
  count: number
}

export interface MetricTrendItem {
  day: string
  metric_name: string
  metric_label: string
  average_score: number
}

export interface PublicTraceView {
  batch: {
    id: number
    batch_code: string
    trace_code: string
    product_code: string
    tea_name: string
    tea_type: string
    origin: string
    farm_name: string
    enterprise_name: string
    quantity_kg: number
    harvest_date?: string
    packaging_date?: string
    audit_status: string
    latest_grade: string
  }
  trace_path: TraceStageRecord[]
  latest_evaluation?: QualityEvaluationView
}

export interface ConsumerFavorite {
  id: number
  user_id: number
  batch_id: number
  created_at: string
  batch: TeaBatch
}

export interface ConsumerFeedback {
  id: number
  user_id: number
  batch_id?: number
  trace_code?: string
  content: string
  contact_info: string
  created_at: string
}

export interface ConsumerQueryHistory {
  id: number
  user_id: number
  code_queried: string
  batch_id?: number
  batch_code: string
  trace_code: string
  queried_at: string
  created_at: string
}
