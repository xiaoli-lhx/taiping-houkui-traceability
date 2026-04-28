import { useCallback, useEffect, useState } from 'react'
import { AuditOutlined, ReloadOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Input, Select, Space, Table, Tag, Typography } from 'antd'

import { EmptyState } from '../components/EmptyState'
import { useAuth } from '../auth/useAuth'
import { api } from '../lib/api'
import { formatDateTime, getOperationActionLabel } from '../lib/display'
import type { OperationLogItem } from '../types'

export function AdminLogsPage() {
  const { token } = useAuth()
  const [items, setItems] = useState<OperationLogItem[]>([])
  const [actorId, setActorId] = useState('')
  const [action, setAction] = useState('')
  const [targetType, setTargetType] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadLogs = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await api.getAdminLogs(token, {
        actorId: actorId ? Number(actorId) : undefined,
        action,
        targetType,
        pageSize: 50,
      })
      setItems(result.items)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '加载操作日志失败')
    } finally {
      setLoading(false)
    }
  }, [action, actorId, targetType, token])

  useEffect(() => {
    void loadLogs()
  }, [loadLogs])

  return (
    <Space direction="vertical" size={16} className="admin-page-stack">
      <Card bordered={false} className="admin-hero-card admin-hero-card--section">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Tag bordered={false} className="admin-hero-badge">
            Operation Logs
          </Tag>
          <Typography.Title level={2} className="admin-hero-title">
            操作日志
          </Typography.Title>
          <Typography.Paragraph className="admin-hero-description">
            查看关键写操作的执行记录，包括资料更新、账号治理、审核整改、反馈处理和附件操作。
          </Typography.Paragraph>
          <Space wrap>
            <Input
              placeholder="操作人 ID"
              style={{ width: 140 }}
              value={actorId}
              onChange={(event) => setActorId(event.target.value)}
            />
            <Select
              allowClear
              placeholder="动作类型"
              style={{ width: 180 }}
              value={action || undefined}
              options={[
                { label: '修改资料', value: 'profile_update' },
                { label: '修改密码', value: 'change_password' },
                { label: '通过注册', value: 'approve_registration' },
                { label: '驳回注册', value: 'reject_registration' },
                { label: '启用账号', value: 'enable_user' },
                { label: '停用账号', value: 'disable_user' },
                { label: '重置密码', value: 'reset_password' },
                { label: '提交审核', value: 'create_audit' },
                { label: '提交整改', value: 'submit_rectification' },
                { label: '复审整改', value: 'review_rectification' },
                { label: '处理反馈', value: 'process_feedback' },
                { label: '上传附件', value: 'upload_attachment' },
                { label: '删除附件', value: 'delete_attachment' },
              ]}
              onChange={(value) => setAction(value || '')}
            />
            <Select
              allowClear
              placeholder="目标类型"
              style={{ width: 180 }}
              value={targetType || undefined}
              options={[
                { label: '用户资料', value: 'user_profile' },
                { label: '账号管理', value: 'user_account' },
                { label: '审核记录', value: 'audit_record' },
                { label: '整改任务', value: 'rectification_task' },
                { label: '反馈工单', value: 'feedback_ticket' },
                { label: '附件', value: 'attachment' },
              ]}
              onChange={(value) => setTargetType(value || '')}
            />
            <Button icon={<ReloadOutlined />} onClick={() => void loadLogs()}>
              刷新
            </Button>
          </Space>
        </Space>
      </Card>

      {error ? <Alert showIcon type="error" message={error} /> : null}

      <Card bordered={false} className="admin-section-card admin-table-card">
        <div className="admin-table-summary">
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              日志列表
            </Typography.Title>
            <Typography.Text type="secondary">当前共 {items.length} 条操作记录</Typography.Text>
          </div>
          <Tag className="admin-inline-tag" color="gold" icon={<AuditOutlined />}>
            平台审计日志
          </Tag>
        </div>

        <Table<OperationLogItem>
          rowKey="id"
          loading={loading}
          dataSource={items}
          pagination={{ pageSize: 8 }}
          locale={{ emptyText: <EmptyState description="暂无操作日志" /> }}
          columns={[
            {
              title: '操作人',
              key: 'actor',
              render: (_: unknown, record: OperationLogItem) => (
                <Space direction="vertical" size={2}>
                  <Typography.Text strong>{record.actor_display_name || record.actor_username || `用户 #${record.actor_id}`}</Typography.Text>
                  <Typography.Text type="secondary">{record.actor_role}</Typography.Text>
                </Space>
              ),
            },
            { title: '动作', dataIndex: 'action', key: 'action', render: getOperationActionLabel },
            { title: '目标类型', dataIndex: 'target_type', key: 'target_type' },
            { title: '目标 ID', dataIndex: 'target_id', key: 'target_id' },
            { title: '摘要', dataIndex: 'summary', key: 'summary' },
            { title: '时间', dataIndex: 'created_at', key: 'created_at', render: formatDateTime },
          ]}
        />
      </Card>
    </Space>
  )
}
