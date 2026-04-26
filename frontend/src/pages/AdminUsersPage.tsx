import { useCallback, useEffect, useState } from 'react'
import { EyeOutlined, ReloadOutlined, SearchOutlined, TeamOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Descriptions, Drawer, Input, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd'

import { getRoleLabel } from '../auth/roles'
import { useAuth } from '../auth/useAuth'
import { EmptyState } from '../components/EmptyState'
import { adminRegistrationStatusOptions, adminRoleOptions } from '../lib/admin'
import { api } from '../lib/api'
import { getAccountStatusMeta, getAuditStatusMeta } from '../lib/display'
import type { UserProfile } from '../types'

export function AdminUsersPage() {
  const { token } = useAuth()
  const [items, setItems] = useState<UserProfile[]>([])
  const [keyword, setKeyword] = useState('')
  const [role, setRole] = useState('')
  const [approvalStatus, setApprovalStatus] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadUsers = useCallback(
    async (nextKeyword = keyword, nextRole = role, nextApprovalStatus = approvalStatus) => {
      setLoading(true)
      setError('')
      try {
        const result = await api.getAdminUsers(token, {
          keyword: nextKeyword,
          role: nextRole,
          approval_status: nextApprovalStatus,
        })
        setItems(result)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '加载用户列表失败')
      } finally {
        setLoading(false)
      }
    },
    [approvalStatus, keyword, role, token],
  )

  useEffect(() => {
    void loadUsers('', '', '')
  }, [loadUsers])

  const columns = [
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
    { title: '所属组织', dataIndex: 'organization', key: 'organization' },
    { title: '手机号', dataIndex: 'phone', key: 'phone' },
    {
      title: '联系信息',
      dataIndex: 'contact_info',
      key: 'contact_info',
      render: (value: string) => (
        <Typography.Text ellipsis style={{ maxWidth: 180 }} title={value || '-'}>
          {value || '-'}
        </Typography.Text>
      ),
    },
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
      title: '账号状态',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => {
        const meta = getAccountStatusMeta(value)
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
          {record.status === 'disabled' ? (
            <Popconfirm title="确认启用该账号？" onConfirm={() => void handleEnable(record)}>
              <Button size="small" type="primary" ghost>
                启用
              </Button>
            </Popconfirm>
          ) : (
            <Popconfirm title="确认停用该账号？" onConfirm={() => void handleDisable(record)}>
              <Button size="small" danger ghost>
                停用
              </Button>
            </Popconfirm>
          )}
          <Popconfirm title="确认重置该账号密码为 123456？" onConfirm={() => void handleResetPassword(record)}>
            <Button size="small">重置密码</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  async function handleEnable(record: UserProfile) {
    setError('')
    setSuccess('')
    try {
      const result = await api.enableUser(token, record.id)
      setSuccess(`已启用账号 ${result.user.username}`)
      if (selectedUser?.id === record.id) {
        setSelectedUser(result.user)
      }
      await loadUsers(keyword, role, approvalStatus)
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : '启用账号失败')
    }
  }

  async function handleDisable(record: UserProfile) {
    setError('')
    setSuccess('')
    try {
      const result = await api.disableUser(token, record.id)
      setSuccess(`已停用账号 ${result.user.username}`)
      if (selectedUser?.id === record.id) {
        setSelectedUser(result.user)
      }
      await loadUsers(keyword, role, approvalStatus)
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : '停用账号失败')
    }
  }

  async function handleResetPassword(record: UserProfile) {
    setError('')
    setSuccess('')
    try {
      const result = await api.resetUserPassword(token, record.id)
      setSuccess(`已重置账号 ${result.user.username} 的密码，临时密码为 ${result.temporary_password || '123456'}`)
      if (selectedUser?.id === record.id) {
        setSelectedUser(result.user)
      }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : '重置密码失败')
    }
  }

  return (
    <Space direction="vertical" size={16} className="admin-page-stack">
      <Card bordered={false} className="admin-hero-card admin-hero-card--section">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Tag bordered={false} className="admin-hero-badge">
            User Governance Console
          </Tag>
          <Typography.Title level={2} className="admin-hero-title">
            用户管理
          </Typography.Title>
          <Typography.Paragraph className="admin-hero-description">
            按角色、审核状态和关键词查看平台用户，统一查看账号资料、联系信息和当前状态，便于后续治理与核验。
          </Typography.Paragraph>
          <div className="admin-toolbar">
            <div className="admin-toolbar-filters">
              <Input
                prefix={<SearchOutlined />}
                placeholder="按用户名 / 显示名称 / 组织搜索"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                style={{ width: 280 }}
              />
              <Select
                placeholder="角色筛选"
                allowClear
                value={role || undefined}
                style={{ width: 170 }}
                options={adminRoleOptions}
                onChange={(value) => setRole(value || '')}
              />
              <Select
                placeholder="审核状态"
                allowClear
                value={approvalStatus || undefined}
                style={{ width: 170 }}
                options={adminRegistrationStatusOptions}
                onChange={(value) => setApprovalStatus(value || '')}
              />
            </div>
            <Space wrap>
              <Button type="primary" icon={<SearchOutlined />} onClick={() => void loadUsers(keyword, role, approvalStatus)}>
                查询
              </Button>
              <Button icon={<ReloadOutlined />} onClick={() => void loadUsers(keyword, role, approvalStatus)}>
                刷新
              </Button>
            </Space>
          </div>
        </Space>
      </Card>

      {error ? <Alert showIcon type="error" message={error} /> : null}
      {success ? <Alert showIcon type="success" message={success} /> : null}

      <Card bordered={false} className="admin-section-card admin-table-card">
        <div className="admin-table-summary">
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              查询结果
            </Typography.Title>
            <Typography.Text type="secondary">当前共匹配到 {items.length} 位用户</Typography.Text>
          </div>
          <Tag className="admin-inline-tag" color="blue" icon={<TeamOutlined />}>
            平台用户查询
          </Tag>
        </div>

        <Table<UserProfile>
          rowKey="id"
          loading={loading}
          dataSource={items}
          columns={columns}
          pagination={{ pageSize: 8 }}
          scroll={{ x: 1080 }}
          locale={{ emptyText: <EmptyState description="暂无用户数据" /> }}
        />
      </Card>

      <Drawer
        title="用户详情"
        width={500}
        open={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        extra={
          selectedUser ? (
            <Space size={8}>
              <Tag color={getAuditStatusMeta(selectedUser.approval_status).color}>{getAuditStatusMeta(selectedUser.approval_status).text}</Tag>
              <Tag color={getAccountStatusMeta(selectedUser.status).color}>{getAccountStatusMeta(selectedUser.status).text}</Tag>
            </Space>
          ) : null
        }
      >
        {selectedUser ? (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="用户名">{selectedUser.username}</Descriptions.Item>
            <Descriptions.Item label="显示名称">{selectedUser.display_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="角色">{getRoleLabel(selectedUser.role_code)}</Descriptions.Item>
            <Descriptions.Item label="所属组织">{selectedUser.organization || '-'}</Descriptions.Item>
            <Descriptions.Item label="手机号">{selectedUser.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="联系信息">{selectedUser.contact_info || '-'}</Descriptions.Item>
            <Descriptions.Item label="审核状态">{getAuditStatusMeta(selectedUser.approval_status).text}</Descriptions.Item>
            <Descriptions.Item label="账号状态">{getAccountStatusMeta(selectedUser.status).text}</Descriptions.Item>
            <Descriptions.Item label="驳回原因">{selectedUser.rejection_reason || '-'}</Descriptions.Item>
          </Descriptions>
        ) : null}
      </Drawer>
    </Space>
  )
}
