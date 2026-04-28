import { useCallback, useEffect, useState } from 'react'
import { BellOutlined, CheckOutlined, ReloadOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Select, Space, Table, Tag, Typography } from 'antd'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/useAuth'
import { EmptyState } from '../components/EmptyState'
import { api } from '../lib/api'
import { formatDateTime, getNotificationCategoryLabel } from '../lib/display'
import type { NotificationItem } from '../types'

export function NotificationCenterPage() {
  const { token } = useAuth()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [isReadFilter, setIsReadFilter] = useState<'all' | 'read' | 'unread'>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await api.getNotifications(token, {
        isRead: isReadFilter === 'all' ? undefined : isReadFilter === 'read',
        pageSize: 50,
      })
      setItems(result.items)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '加载通知失败')
    } finally {
      setLoading(false)
    }
  }, [isReadFilter, token])

  useEffect(() => {
    void loadNotifications()
  }, [loadNotifications])

  async function handleRead(id: number) {
    setError('')
    setSuccess('')
    try {
      await api.markNotificationRead(token, id)
      setSuccess('通知已标记为已读。')
      await loadNotifications()
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : '标记通知失败')
    }
  }

  async function handleReadAll() {
    setError('')
    setSuccess('')
    try {
      await api.markAllNotificationsRead(token)
      setSuccess('已全部标记为已读。')
      await loadNotifications()
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : '批量标记失败')
    }
  }

  return (
    <Space direction="vertical" size={16} className="admin-page-stack">
      <Card bordered={false} className="admin-hero-card admin-hero-card--section">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Tag bordered={false} className="admin-hero-badge">
            Notification Center
          </Tag>
          <Typography.Title level={2} className="admin-hero-title">
            通知中心
          </Typography.Title>
          <Typography.Paragraph className="admin-hero-description">
            集中查看与你账号相关的审核、整改、反馈和系统通知，并快速跳转到对应业务页面。
          </Typography.Paragraph>
          <Space wrap>
            <Select
              value={isReadFilter}
              style={{ width: 180 }}
              options={[
                { label: '全部通知', value: 'all' },
                { label: '未读通知', value: 'unread' },
                { label: '已读通知', value: 'read' },
              ]}
              onChange={(value) => setIsReadFilter(value)}
            />
            <Button icon={<ReloadOutlined />} onClick={() => void loadNotifications()}>
              刷新
            </Button>
            <Button type="primary" ghost icon={<CheckOutlined />} onClick={() => void handleReadAll()}>
              全部已读
            </Button>
          </Space>
        </Space>
      </Card>

      {error ? <Alert showIcon type="error" message={error} /> : null}
      {success ? <Alert showIcon type="success" message={success} /> : null}

      <Card bordered={false} className="admin-section-card admin-table-card">
        <div className="admin-table-summary">
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              通知列表
            </Typography.Title>
            <Typography.Text type="secondary">当前共 {items.length} 条通知</Typography.Text>
          </div>
          <Tag className="admin-inline-tag" color="processing" icon={<BellOutlined />}>
            站内通知
          </Tag>
        </div>

        <Table<NotificationItem>
          rowKey="id"
          loading={loading}
          dataSource={items}
          pagination={{ pageSize: 8 }}
          locale={{ emptyText: <EmptyState description="暂无通知" /> }}
          columns={[
            {
              title: '类型',
              dataIndex: 'category',
              key: 'category',
              render: (value: string) => <Tag>{getNotificationCategoryLabel(value)}</Tag>,
            },
            {
              title: '标题',
              dataIndex: 'title',
              key: 'title',
              render: (value: string, record: NotificationItem) => (
                <Space direction="vertical" size={2}>
                  <Typography.Text strong={!record.is_read}>{value}</Typography.Text>
                  <Typography.Text type="secondary">{record.content}</Typography.Text>
                </Space>
              ),
            },
            { title: '时间', dataIndex: 'created_at', key: 'created_at', render: formatDateTime },
            {
              title: '状态',
              dataIndex: 'is_read',
              key: 'is_read',
              render: (value: boolean) => <Tag color={value ? 'default' : 'processing'}>{value ? '已读' : '未读'}</Tag>,
            },
            {
              title: '操作',
              key: 'action',
              render: (_: unknown, record: NotificationItem) => (
                <Space wrap>
                  {record.link ? <Link to={record.link}>查看详情</Link> : null}
                  {!record.is_read ? (
                    <Button size="small" ghost onClick={() => void handleRead(record.id)}>
                      标记已读
                    </Button>
                  ) : null}
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </Space>
  )
}
