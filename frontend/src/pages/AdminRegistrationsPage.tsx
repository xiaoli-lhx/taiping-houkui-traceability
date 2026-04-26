import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuditOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons'
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  Input,
  Modal,
  Segmented,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'

import { getRoleLabel } from '../auth/roles'
import { useAuth } from '../auth/useAuth'
import { EmptyState } from '../components/EmptyState'
import type { AdminRegistrationStatus } from '../lib/admin'
import { adminRegistrationStatusOptions } from '../lib/admin'
import { api } from '../lib/api'
import { getAuditStatusMeta } from '../lib/display'
import type { UserProfile } from '../types'

type RegistrationCounts = Record<AdminRegistrationStatus, number>

const defaultCounts: RegistrationCounts = {
  pending: 0,
  approved: 0,
  rejected: 0,
  disabled: 0,
}

export function AdminRegistrationsPage() {
  const { token } = useAuth()
  const [items, setItems] = useState<UserProfile[]>([])
  const [status, setStatus] = useState<AdminRegistrationStatus>('pending')
  const [counts, setCounts] = useState<RegistrationCounts>(defaultCounts)
  const [loading, setLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [error, setError] = useState('')
  const [rejectingUser, setRejectingUser] = useState<UserProfile | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const loadCounts = useCallback(async () => {
    setSummaryLoading(true)
    try {
      const [pending, approved, rejected, disabled] = await Promise.all([
        api.getAdminRegistrations(token, 'pending'),
        api.getAdminRegistrations(token, 'approved'),
        api.getAdminRegistrations(token, 'rejected'),
        api.getAdminRegistrations(token, 'disabled'),
      ])
      setCounts({
        pending: pending.length,
        approved: approved.length,
        rejected: rejected.length,
        disabled: disabled.length,
      })
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '加载注册申请统计失败')
    } finally {
      setSummaryLoading(false)
    }
  }, [token])

  const loadRegistrations = useCallback(
    async (selectedStatus: AdminRegistrationStatus = status) => {
      setLoading(true)
      setError('')
      try {
        const result = await api.getAdminRegistrations(token, selectedStatus)
        setItems(result)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '加载注册申请失败')
      } finally {
        setLoading(false)
      }
    },
    [status, token],
  )

  useEffect(() => {
    void Promise.all([loadCounts(), loadRegistrations('pending')])
  }, [loadCounts, loadRegistrations])

  const refreshAll = useCallback(
    async (selectedStatus: AdminRegistrationStatus = status) => {
      await Promise.all([loadCounts(), loadRegistrations(selectedStatus)])
    },
    [loadCounts, loadRegistrations, status],
  )

  const columns = useMemo(
    () => [
      {
        title: '用户名',
        dataIndex: 'username',
        key: 'username',
        render: (value: string, record: UserProfile) => (
          <Space direction="vertical" size={2}>
            <Typography.Text strong>{record.display_name || value}</Typography.Text>
            <Typography.Text type="secondary">{value}</Typography.Text>
          </Space>
        ),
      },
      {
        title: '角色',
        dataIndex: 'role_code',
        key: 'role_code',
        render: (value: string) => <Tag>{getRoleLabel(value)}</Tag>,
      },
      { title: '组织', dataIndex: 'organization', key: 'organization' },
      { title: '手机号', dataIndex: 'phone', key: 'phone' },
      {
        title: '审核状态',
        dataIndex: 'approval_status',
        key: 'approval_status',
        render: (value: string) => {
          const meta = getAuditStatusMeta(value)
          return <Tag color={meta.color}>{meta.text}</Tag>
        },
      },
      {
        title: '操作',
        key: 'action',
        render: (_: unknown, record: UserProfile) => (
          <Space wrap>
            <Button size="small" icon={<EyeOutlined />} onClick={() => setSelectedUser(record)}>
              查看详情
            </Button>
            <Button
              type="primary"
              size="small"
              onClick={async () => {
                await api.approveRegistration(token, record.id)
                await refreshAll(status)
              }}
            >
              通过
            </Button>
            <Button size="small" danger onClick={() => setRejectingUser(record)}>
              驳回
            </Button>
          </Space>
        ),
      },
    ],
    [refreshAll, status, token],
  )

  return (
    <Space direction="vertical" size={16} className="admin-page-stack">
      <Card bordered={false} className="admin-hero-card admin-hero-card--section">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Tag bordered={false} className="admin-hero-badge">
            Registration Review Queue
          </Tag>
          <Typography.Title level={2} className="admin-hero-title">
            注册申请审核
          </Typography.Title>
          <Typography.Paragraph className="admin-hero-description">
            审核茶农、企业和消费者提交的注册申请，优先处理待审核事项，并可查看完整资料后再执行通过或驳回。
          </Typography.Paragraph>
          <Space wrap className="admin-hero-actions">
            <Segmented
              className="admin-filter-segmented"
              value={status}
              options={adminRegistrationStatusOptions.map((option) => ({
                label: `${option.label} (${counts[option.value]})`,
                value: option.value,
              }))}
              onChange={(value) => {
                const nextStatus = value as AdminRegistrationStatus
                setStatus(nextStatus)
                void loadRegistrations(nextStatus)
              }}
            />
            <Button icon={<ReloadOutlined />} onClick={() => void refreshAll(status)}>
              刷新
            </Button>
          </Space>
        </Space>
      </Card>

      <div className="admin-overview-grid">
        {adminRegistrationStatusOptions.map((option) => (
          <Card bordered={false} className="admin-stat-card admin-stat-card--neutral" key={option.value}>
            <Typography.Text className="admin-stat-label">{option.label}</Typography.Text>
            <Typography.Title level={3} className="admin-stat-value">
              {summaryLoading ? '...' : counts[option.value]}
            </Typography.Title>
          </Card>
        ))}
      </div>

      {error ? <Alert showIcon type="error" message={error} /> : null}

      <Card bordered={false} className="admin-section-card admin-table-card">
        <div className="admin-table-summary">
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              当前筛选结果
            </Typography.Title>
            <Typography.Text type="secondary">
              当前状态：{adminRegistrationStatusOptions.find((item) => item.value === status)?.label}，共 {items.length} 条申请
            </Typography.Text>
          </div>
          <Tag className="admin-inline-tag" color="processing" icon={<AuditOutlined />}>
            审批工作页
          </Tag>
        </div>

        <Table<UserProfile>
          rowKey="id"
          loading={loading}
          dataSource={items}
          columns={columns}
          pagination={{ pageSize: 8 }}
          locale={{ emptyText: <EmptyState description="暂无注册申请" /> }}
        />
      </Card>

      <Drawer
        title="申请详情"
        width={480}
        open={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        extra={
          selectedUser ? (
            <Tag color={getAuditStatusMeta(selectedUser.approval_status).color}>
              {getAuditStatusMeta(selectedUser.approval_status).text}
            </Tag>
          ) : null
        }
      >
        {selectedUser ? (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="用户名">{selectedUser.username}</Descriptions.Item>
            <Descriptions.Item label="显示名称">{selectedUser.display_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="角色">{getRoleLabel(selectedUser.role_code)}</Descriptions.Item>
            <Descriptions.Item label="组织">{selectedUser.organization || '-'}</Descriptions.Item>
            <Descriptions.Item label="手机号">{selectedUser.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="联系信息">{selectedUser.contact_info || '-'}</Descriptions.Item>
            <Descriptions.Item label="审核状态">{getAuditStatusMeta(selectedUser.approval_status).text}</Descriptions.Item>
            <Descriptions.Item label="驳回原因">{selectedUser.rejection_reason || '-'}</Descriptions.Item>
          </Descriptions>
        ) : null}
      </Drawer>

      <Modal
        title="驳回注册申请"
        open={Boolean(rejectingUser)}
        onCancel={() => {
          setRejectingUser(null)
          setRejectReason('')
        }}
        onOk={async () => {
          if (!rejectingUser) {
            return
          }
          await api.rejectRegistration(token, rejectingUser.id, rejectReason)
          setRejectingUser(null)
          setRejectReason('')
          await refreshAll(status)
        }}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Typography.Text type="secondary">
            请填写驳回原因，系统将保留当前审批记录并用于后续说明。
          </Typography.Text>
          <Input.TextArea rows={4} value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="请输入驳回原因" />
        </Space>
      </Modal>
    </Space>
  )
}
