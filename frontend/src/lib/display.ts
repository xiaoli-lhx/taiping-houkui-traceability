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
