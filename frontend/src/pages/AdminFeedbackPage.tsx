import { useCallback, useEffect, useMemo, useState } from 'react'
import { EyeOutlined, MessageOutlined, ReloadOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Drawer, Form, Input, Select, Space, Table, Tag, Typography } from 'antd'

import { useAuth } from '../auth/useAuth'
import { EmptyState } from '../components/EmptyState'
import { api } from '../lib/api'
import { formatDateTime, getFeedbackStatusMeta } from '../lib/display'
import type { FeedbackTicket } from '../types'

export function AdminFeedbackPage() {
  const { token } = useAuth()
  const [items, setItems] = useState<FeedbackTicket[]>([])
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedItem, setSelectedItem] = useState<FeedbackTicket | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form] = Form.useForm<{ status: string; process_note: string }>()

  const loadFeedback = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await api.getAdminFeedback(token, { status: selectedStatus })
      setItems(result)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '加载反馈列表失败')
    } finally {
      setLoading(false)
    }
  }, [selectedStatus, token])

  useEffect(() => {
    void loadFeedback()
  }, [loadFeedback])

  const columns = useMemo(
    () => [
      {
        title: '反馈人',
        key: 'user',
        render: (_: unknown, record: FeedbackTicket) => (
          <Space direction="vertical" size={2}>
            <Typography.Text strong>{record.display_name || record.username || `用户 #${record.user_id}`}</Typography.Text>
            <Typography.Text type="secondary">{record.username || '-'}</Typography.Text>
          </Space>
        ),
      },
      {
        title: '批次 / 溯源码',
        key: 'trace',
        render: (_: unknown, record: FeedbackTicket) => (
          <Space direction="vertical" size={2}>
            <Typography.Text>{record.batch_code || '-'}</Typography.Text>
            <Typography.Text type="secondary">{record.trace_code || '-'}</Typography.Text>
          </Space>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (value: string) => {
          const meta = getFeedbackStatusMeta(value)
          return <Tag color={meta.color}>{meta.text}</Tag>
        },
      },
      {
        title: '提交时间',
        dataIndex: 'created_at',
        key: 'created_at',
        render: formatDateTime,
      },
      {
        title: '操作',
        key: 'action',
        render: (_: unknown, record: FeedbackTicket) => (
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedItem(record)
              form.setFieldsValue({ status: record.status, process_note: record.process_note || '' })
              setDrawerOpen(true)
            }}
          >
            处理
          </Button>
        ),
      },
    ],
    [form],
  )

  async function handleSubmit(values: { status: string; process_note: string }) {
    if (!selectedItem) {
      return
    }

    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      await api.processFeedback(token, selectedItem.id, values)
      setSuccess('反馈处理状态已更新。')
      setDrawerOpen(false)
      setSelectedItem(null)
      await loadFeedback()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '更新反馈状态失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Space direction="vertical" size={16} className="admin-page-stack">
      <Card bordered={false} className="admin-hero-card admin-hero-card--section">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Tag bordered={false} className="admin-hero-badge">
            Feedback Workflow Desk
          </Tag>
          <Typography.Title level={2} className="admin-hero-title">
            反馈处理
          </Typography.Title>
          <Typography.Paragraph className="admin-hero-description">
            统一查看消费者反馈工单，更新处理状态并记录处理备注，形成可追踪的管理闭环。
          </Typography.Paragraph>
          <Space wrap>
            <Select
              allowClear
              placeholder="按状态筛选"
              style={{ width: 180 }}
              value={selectedStatus || undefined}
              options={[
                { label: '待处理', value: 'pending' },
                { label: '处理中', value: 'processing' },
                { label: '已处理', value: 'resolved' },
              ]}
              onChange={(value) => setSelectedStatus(value || '')}
            />
            <Button type="primary" icon={<ReloadOutlined />} onClick={() => void loadFeedback()}>
              刷新列表
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
              反馈工单列表
            </Typography.Title>
            <Typography.Text type="secondary">当前共 {items.length} 条反馈记录</Typography.Text>
          </div>
          <Tag className="admin-inline-tag" color="gold" icon={<MessageOutlined />}>
            消费者反馈工单
          </Tag>
        </div>

        <Table<FeedbackTicket>
          rowKey="id"
          loading={loading}
          dataSource={items}
          columns={columns}
          pagination={{ pageSize: 8 }}
          locale={{ emptyText: <EmptyState description="暂无反馈工单" /> }}
        />
      </Card>

      <Drawer
        title="处理反馈工单"
        width={520}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setSelectedItem(null)
        }}
        destroyOnClose
      >
        {selectedItem ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card size="small">
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Typography.Text strong>{selectedItem.display_name || selectedItem.username || `用户 #${selectedItem.user_id}`}</Typography.Text>
                <Typography.Text type="secondary">
                  批次：{selectedItem.batch_code || '-'} · 溯源码：{selectedItem.trace_code || '-'}
                </Typography.Text>
                <Typography.Paragraph style={{ marginBottom: 0 }}>{selectedItem.content}</Typography.Paragraph>
              </Space>
            </Card>

            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Form.Item label="处理状态" name="status" rules={[{ required: true, message: '请选择处理状态' }]}>
                <Select
                  options={[
                    { label: '待处理', value: 'pending' },
                    { label: '处理中', value: 'processing' },
                    { label: '已处理', value: 'resolved' },
                  ]}
                />
              </Form.Item>
              <Form.Item label="处理备注" name="process_note">
                <Input.TextArea rows={5} placeholder="记录处理进展、回复意见或关闭原因" />
              </Form.Item>
              <Space>
                <Button onClick={() => setDrawerOpen(false)}>取消</Button>
                <Button type="primary" htmlType="submit" loading={submitting}>
                  保存处理结果
                </Button>
              </Space>
            </Form>
          </Space>
        ) : null}
      </Drawer>
    </Space>
  )
}
