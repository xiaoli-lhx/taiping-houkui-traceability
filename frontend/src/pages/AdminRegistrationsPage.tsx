import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Input, Modal, Select, Space, Table, Tag, Typography } from 'antd'

import { getRoleLabel } from '../auth/roles'
import { useAuth } from '../auth/useAuth'
import { EmptyState } from '../components/EmptyState'
import { api } from '../lib/api'
import type { UserProfile } from '../types'

export function AdminRegistrationsPage() {
  const { token } = useAuth()
  const [items, setItems] = useState<UserProfile[]>([])
  const [status, setStatus] = useState('pending')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rejectingUser, setRejectingUser] = useState<UserProfile | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const loadRegistrations = useCallback(
    async (selectedStatus = status) => {
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
    void loadRegistrations('pending')
  }, [loadRegistrations])

  const columns = useMemo(
    () => [
      { title: '用户名', dataIndex: 'username', key: 'username' },
      { title: '显示名称', dataIndex: 'display_name', key: 'display_name' },
      { title: '手机号', dataIndex: 'phone', key: 'phone' },
      { title: '组织', dataIndex: 'organization', key: 'organization' },
      {
        title: '角色',
        dataIndex: 'role_code',
        key: 'role_code',
        render: (value: string) => <Tag>{getRoleLabel(value)}</Tag>,
      },
      {
        title: '状态',
        dataIndex: 'approval_status',
        key: 'approval_status',
        render: (value: string) => (
          <Tag color={value === 'approved' ? 'success' : value === 'rejected' ? 'error' : 'processing'}>{value}</Tag>
        ),
      },
      {
        title: '操作',
        key: 'action',
        render: (_: unknown, record: UserProfile) => (
          <Space>
            <Button
              type="primary"
              size="small"
              onClick={async () => {
                await api.approveRegistration(token, record.id)
                await loadRegistrations(status)
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
    [loadRegistrations, status, token],
  )

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        title="注册申请审核"
        extra={
          <Select
            value={status}
            style={{ width: 160 }}
            options={[
              { label: '待审核', value: 'pending' },
              { label: '已通过', value: 'approved' },
              { label: '已驳回', value: 'rejected' },
              { label: '已停用', value: 'disabled' },
            ]}
            onChange={(value) => {
              setStatus(value)
              void loadRegistrations(value)
            }}
          />
        }
      >
        <Typography.Text type="secondary">管理员负责审核茶农、企业和消费者提交的注册申请。</Typography.Text>
      </Card>

      {error ? <Alert showIcon type="error" message={error} /> : null}

      <Card>
        <Table<UserProfile>
          rowKey="id"
          loading={loading}
          dataSource={items}
          columns={columns}
          locale={{ emptyText: <EmptyState description="暂无注册申请" /> }}
        />
      </Card>

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
          await loadRegistrations(status)
        }}
      >
        <Input.TextArea rows={4} value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="请输入驳回原因" />
      </Modal>
    </Space>
  )
}
