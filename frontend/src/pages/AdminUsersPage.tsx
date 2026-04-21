import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Input, Select, Space, Table, Tag } from 'antd'

import { getRoleLabel } from '../auth/roles'
import { useAuth } from '../auth/useAuth'
import { EmptyState } from '../components/EmptyState'
import { api } from '../lib/api'
import type { UserProfile } from '../types'

export function AdminUsersPage() {
  const { token } = useAuth()
  const [items, setItems] = useState<UserProfile[]>([])
  const [keyword, setKeyword] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadUsers = useCallback(async (nextKeyword = keyword, nextRole = role) => {
    setLoading(true)
    setError('')
    try {
      const result = await api.getAdminUsers(token, { keyword: nextKeyword, role: nextRole })
      setItems(result)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '加载用户列表失败')
    } finally {
      setLoading(false)
    }
  }, [keyword, role, token])

  useEffect(() => {
    void loadUsers('', '')
  }, [loadUsers])

  const columns = useMemo(
    () => [
      { title: '用户名', dataIndex: 'username', key: 'username' },
      { title: '显示名称', dataIndex: 'display_name', key: 'display_name' },
      { title: '手机号', dataIndex: 'phone', key: 'phone' },
      { title: '组织', dataIndex: 'organization', key: 'organization' },
      { title: '角色', dataIndex: 'role_code', key: 'role_code', render: (value: string) => <Tag>{getRoleLabel(value)}</Tag> },
      { title: '审核状态', dataIndex: 'approval_status', key: 'approval_status' },
      { title: '账号状态', dataIndex: 'status', key: 'status' },
    ],
    [],
  )

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card title="用户管理">
        <Space wrap>
          <Input
            placeholder="按用户名/显示名称/组织搜索"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            style={{ width: 260 }}
          />
          <Select
            placeholder="角色筛选"
            allowClear
            value={role || undefined}
            style={{ width: 180 }}
            options={[
              { label: '管理员', value: 'admin' },
              { label: '茶农', value: 'farmer' },
              { label: '企业', value: 'enterprise' },
              { label: '监管方', value: 'regulator' },
              { label: '消费者', value: 'consumer' },
            ]}
            onChange={(value) => setRole(value || '')}
          />
          <Button type="primary" onClick={() => void loadUsers(keyword, role)}>
            查询
          </Button>
        </Space>
      </Card>
      {error ? <Alert showIcon type="error" message={error} /> : null}
      <Card>
        <Table<UserProfile>
          rowKey="id"
          loading={loading}
          dataSource={items}
          columns={columns}
          locale={{ emptyText: <EmptyState description="暂无用户数据" /> }}
        />
      </Card>
    </Space>
  )
}
