import type {
  AdminUserActionResult,
  AttachmentItem,
  ApiEnvelope,
  AppRole,
  AuditCreateRequest,
  AuditRecord,
  ConsumerFavorite,
  ConsumerQueryHistory,
  FeedbackTicket,
  GradeDistributionItem,
  LoginResponse,
  MetricTrendItem,
  NotificationListResult,
  NotificationItem,
  OverviewStats,
  OperationLogListResult,
  PaginationResult,
  ProfileUpdateResponse,
  ProductionDistributionItem,
  PublicTraceView,
  QualityEvaluationView,
  RectificationTask,
  RegisterRequest,
  RegistrationStatusResponse,
  RiskAlertItem,
  TeaBatch,
  TodoSummary,
  TraceStageRecord,
  UserProfile,
} from '../types'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8080/api/v1'
export const API_ORIGIN = new URL(API_BASE_URL).origin

export function resolveFileUrl(path?: string) {
  if (!path) {
    return ''
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  return new URL(path, API_ORIGIN).toString()
}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers ?? {})
  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  })

  const payload = (await response.json()) as ApiEnvelope<T>
  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.message || '请求失败')
  }

  return payload.data
}

export const api = {
  login(username: string, password: string, role: AppRole) {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, role }),
    })
  },
  register(body: RegisterRequest) {
    return request<UserProfile>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },
  getRegistrationStatus(username: string) {
    return request<RegistrationStatusResponse>(`/auth/registration-status?username=${encodeURIComponent(username)}`, {
      method: 'GET',
    })
  },
  getMe(token: string) {
    return request<UserProfile>('/auth/me', { method: 'GET' }, token)
  },
  updateProfile(token: string, body: FormData) {
    return request<ProfileUpdateResponse>('/auth/profile', { method: 'PUT', body }, token)
  },
  changePassword(token: string, body: { old_password: string; new_password: string; confirm_password: string }) {
    return request<{ changed: boolean }>('/auth/change-password', { method: 'POST', body: JSON.stringify(body) }, token)
  },
  getNotifications(token: string, options: { isRead?: boolean; page?: number; pageSize?: number } = {}) {
    const search = new URLSearchParams()
    if (typeof options.isRead === 'boolean') {
      search.set('is_read', String(options.isRead))
    }
    if (options.page) {
      search.set('page', String(options.page))
    }
    if (options.pageSize) {
      search.set('page_size', String(options.pageSize))
    }
    const query = search.toString()
    return request<NotificationListResult>(`/notifications${query ? `?${query}` : ''}`, { method: 'GET' }, token)
  },
  markNotificationRead(token: string, id: number) {
    return request<NotificationItem>(`/notifications/${id}/read`, { method: 'POST', body: JSON.stringify({}) }, token)
  },
  markAllNotificationsRead(token: string) {
    return request<{ read_all: boolean }>('/notifications/read-all', { method: 'POST', body: JSON.stringify({}) }, token)
  },
  getTodos(token: string) {
    return request<TodoSummary>('/dashboard/todos', { method: 'GET' }, token)
  },
  getAdminUsers(token: string, options: { keyword?: string; role?: string; approval_status?: string } = {}) {
    const search = new URLSearchParams()
    if (options.keyword?.trim()) {
      search.set('keyword', options.keyword.trim())
    }
    if (options.role?.trim()) {
      search.set('role', options.role.trim())
    }
    if (options.approval_status?.trim()) {
      search.set('approval_status', options.approval_status.trim())
    }
    return request<UserProfile[]>(`/admin/users?${search.toString()}`, { method: 'GET' }, token)
  },
  getAdminRegistrations(token: string, status = 'pending') {
    return request<UserProfile[]>(`/admin/registrations?status=${encodeURIComponent(status)}`, { method: 'GET' }, token)
  },
  approveRegistration(token: string, id: number) {
    return request<UserProfile>(`/admin/registrations/${id}/approve`, { method: 'POST', body: JSON.stringify({}) }, token)
  },
  rejectRegistration(token: string, id: number, reason: string) {
    return request<UserProfile>(
      `/admin/registrations/${id}/reject`,
      { method: 'POST', body: JSON.stringify({ reason }) },
      token,
    )
  },
  enableUser(token: string, id: number) {
    return request<AdminUserActionResult>(`/admin/users/${id}/enable`, { method: 'POST', body: JSON.stringify({}) }, token)
  },
  disableUser(token: string, id: number) {
    return request<AdminUserActionResult>(`/admin/users/${id}/disable`, { method: 'POST', body: JSON.stringify({}) }, token)
  },
  resetUserPassword(token: string, id: number) {
    return request<AdminUserActionResult>(`/admin/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({}) }, token)
  },
  getAdminFeedback(token: string, options: { status?: string } = {}) {
    const search = new URLSearchParams()
    if (options.status?.trim()) {
      search.set('status', options.status.trim())
    }
    const query = search.toString()
    return request<FeedbackTicket[]>(`/admin/feedback${query ? `?${query}` : ''}`, { method: 'GET' }, token)
  },
  processFeedback(token: string, id: number, body: { status: string; process_note: string }) {
    return request<FeedbackTicket>(`/admin/feedback/${id}/process`, { method: 'POST', body: JSON.stringify(body) }, token)
  },
  getAdminLogs(token: string, options: { actorId?: number; action?: string; targetType?: string; page?: number; pageSize?: number } = {}) {
    const search = new URLSearchParams()
    if (options.actorId) {
      search.set('actor_id', String(options.actorId))
    }
    if (options.action?.trim()) {
      search.set('action', options.action.trim())
    }
    if (options.targetType?.trim()) {
      search.set('target_type', options.targetType.trim())
    }
    if (options.page) {
      search.set('page', String(options.page))
    }
    if (options.pageSize) {
      search.set('page_size', String(options.pageSize))
    }
    return request<OperationLogListResult>(`/admin/logs?${search.toString()}`, { method: 'GET' }, token)
  },
  getBatches(
    token: string,
    options: {
      keyword?: string
      status?: string
      auditStatus?: string
      origin?: string
      page?: number
      pageSize?: number
    } = {},
  ) {
    const search = new URLSearchParams()
    if (options.keyword?.trim()) {
      search.set('keyword', options.keyword.trim())
    }
    if (options.status?.trim()) {
      search.set('status', options.status.trim())
    }
    if (options.auditStatus?.trim()) {
      search.set('audit_status', options.auditStatus.trim())
    }
    if (options.origin?.trim()) {
      search.set('origin', options.origin.trim())
    }
    if (options.page) {
      search.set('page', String(options.page))
    }
    if (options.pageSize) {
      search.set('page_size', String(options.pageSize))
    }
    const query = search.toString()
    return request<PaginationResult<TeaBatch>>(`/trace/batches${query ? `?${query}` : ''}`, { method: 'GET' }, token)
  },
  createBatch(token: string, body: Record<string, unknown>) {
    return request<TeaBatch>('/trace/batches', { method: 'POST', body: JSON.stringify(body) }, token)
  },
  getBatch(token: string, id: string) {
    return request<TeaBatch>(`/trace/batches/${id}`, { method: 'GET' }, token)
  },
  createStage(token: string, batchId: string, body: Record<string, unknown>) {
    return request<TraceStageRecord>(`/trace/batches/${batchId}/stages`, { method: 'POST', body: JSON.stringify(body) }, token)
  },
  createQualityEvaluation(token: string, body: Record<string, unknown>) {
    return request<QualityEvaluationView>('/quality/evaluations', { method: 'POST', body: JSON.stringify(body) }, token)
  },
  getLatestQualityEvaluation(token: string, batchId: string) {
    return request<QualityEvaluationView>(`/quality/batches/${batchId}/latest`, { method: 'GET' }, token)
  },
  getOverview(token: string) {
    return request<OverviewStats>('/stats/overview', { method: 'GET' }, token)
  },
  getProductionDistribution(token: string) {
    return request<ProductionDistributionItem[]>('/stats/production-distribution', { method: 'GET' }, token)
  },
  getGradeDistribution(token: string) {
    return request<GradeDistributionItem[]>('/stats/grade-distribution', { method: 'GET' }, token)
  },
  getMetricTrends(token: string) {
    return request<MetricTrendItem[]>('/stats/metric-trends', { method: 'GET' }, token)
  },
  getPublicTrace(code: string) {
    return request<PublicTraceView>(`/public/traces/${encodeURIComponent(code)}`, { method: 'GET' })
  },
  getAudits(token: string, batchId: string) {
    return request<AuditRecord[]>(`/trace/batches/${batchId}/audits`, { method: 'GET' }, token)
  },
  createAudit(token: string, batchId: string, body: AuditCreateRequest) {
    return request<AuditRecord>(`/trace/batches/${batchId}/audits`, { method: 'POST', body: JSON.stringify(body) }, token)
  },
  getRectifications(token: string, options: { status?: string } = {}) {
    const search = new URLSearchParams()
    if (options.status?.trim()) {
      search.set('status', options.status.trim())
    }
    const query = search.toString()
    return request<RectificationTask[]>(`/trace/rectifications${query ? `?${query}` : ''}`, { method: 'GET' }, token)
  },
  submitRectification(token: string, id: number, body: { response_comment: string }) {
    return request<RectificationTask>(`/trace/rectifications/${id}/submit`, { method: 'POST', body: JSON.stringify(body) }, token)
  },
  reviewRectification(token: string, id: number, body: { status: string; reviewer_comment: string }) {
    return request<RectificationTask>(`/trace/rectifications/${id}/review`, { method: 'POST', body: JSON.stringify(body) }, token)
  },
  getAttachments(token: string, bizType: string, bizId: number) {
    return request<AttachmentItem[]>(
      `/attachments?biz_type=${encodeURIComponent(bizType)}&biz_id=${encodeURIComponent(String(bizId))}`,
      { method: 'GET' },
      token,
    )
  },
  uploadAttachment(token: string, body: FormData) {
    return request<AttachmentItem>('/attachments', { method: 'POST', body }, token)
  },
  deleteAttachment(token: string, id: number) {
    return request<{ deleted: boolean }>(`/attachments/${id}`, { method: 'DELETE' }, token)
  },
  createFavorite(token: string, batchId: number) {
    return request<ConsumerFavorite>('/consumer/favorites', { method: 'POST', body: JSON.stringify({ batch_id: batchId }) }, token)
  },
  getFavorites(token: string) {
    return request<ConsumerFavorite[]>('/consumer/favorites', { method: 'GET' }, token)
  },
  createFeedback(token: string, body: { batch_id?: number; trace_code?: string; content: string; contact_info: string }) {
    return request<FeedbackTicket>('/consumer/feedback', { method: 'POST', body: JSON.stringify(body) }, token)
  },
  getConsumerFeedback(token: string) {
    return request<FeedbackTicket[]>('/consumer/feedback', { method: 'GET' }, token)
  },
  getHistory(token: string) {
    return request<ConsumerQueryHistory[]>('/consumer/history', { method: 'GET' }, token)
  },
  createHistory(token: string, code: string) {
    return request<ConsumerQueryHistory>('/consumer/history', { method: 'POST', body: JSON.stringify({ code }) }, token)
  },
  getRiskAlerts(token: string) {
    return request<RiskAlertItem[]>('/stats/risk-alerts', { method: 'GET' }, token)
  },
}
