export function formatDateTime(value?: string) {
  if (!value) {
    return '-'
  }
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

export function formatDate(value?: string) {
  if (!value) {
    return '-'
  }
  return new Date(value).toLocaleDateString('zh-CN')
}

export function getAuditStatusMeta(status?: string) {
  switch (status) {
    case 'approved':
      return { color: 'success', text: '已通过' }
    case 'rejected':
      return { color: 'error', text: '已驳回' }
    case 'pending':
      return { color: 'processing', text: '待审核' }
    default:
      return { color: 'default', text: status || '-' }
  }
}

export function getAccountStatusMeta(status?: string) {
  switch (status) {
    case 'active':
    case 'enabled':
    case 'approved':
      return { color: 'success', text: '已启用' }
    case 'disabled':
      return { color: 'default', text: '已停用' }
    case 'locked':
      return { color: 'error', text: '已锁定' }
    case 'pending':
      return { color: 'processing', text: '待启用' }
    default:
      return { color: 'default', text: status || '-' }
  }
}

export function getBatchStatusMeta(status?: string) {
  switch (status) {
    case 'completed':
      return { color: 'success', text: '已完成' }
    case 'processing':
      return { color: 'processing', text: '处理中' }
    case 'draft':
      return { color: 'default', text: '草稿' }
    default:
      return { color: 'default', text: status || '-' }
  }
}

export function getRectificationStatusMeta(status?: string) {
  switch (status) {
    case 'completed':
      return { color: 'success', text: '已完成' }
    case 'submitted':
      return { color: 'processing', text: '待复审' }
    case 'pending_submission':
      return { color: 'warning', text: '待整改' }
    case 'none':
      return { color: 'default', text: '无整改' }
    default:
      return { color: 'default', text: status || '-' }
  }
}

export function getFeedbackStatusMeta(status?: string) {
  switch (status) {
    case 'resolved':
      return { color: 'success', text: '已处理' }
    case 'processing':
      return { color: 'processing', text: '处理中' }
    case 'pending':
      return { color: 'warning', text: '待处理' }
    default:
      return { color: 'default', text: status || '-' }
  }
}

export function getRiskSeverityMeta(severity?: string) {
  switch (severity) {
    case 'high':
      return { color: 'error', text: '高风险' }
    case 'medium':
      return { color: 'warning', text: '中风险' }
    case 'low':
      return { color: 'default', text: '低风险' }
    default:
      return { color: 'default', text: severity || '-' }
  }
}

export function getStageLabel(stage?: string) {
  switch (stage) {
    case 'planting':
      return '种植'
    case 'picking':
      return '采摘'
    case 'processing':
      return '加工'
    case 'packaging':
      return '包装'
    case 'distribution':
      return '流通'
    default:
      return stage || '-'
  }
}
