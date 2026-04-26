import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Card, Form, Input, InputNumber, Space, Table, Tag, Typography } from 'antd'

import { useAuth } from '../auth/useAuth'
import { EmptyState } from '../components/EmptyState'
import { api } from '../lib/api'
import { formatDateTime, getFeedbackStatusMeta } from '../lib/display'
import type { FeedbackTicket } from '../types'

export function ConsumerFeedbackPage() {
  const { token, user } = useAuth()
  const [form] = Form.useForm<{ trace_code?: string; batch_id?: number; content: string; contact_info: string }>()
  const [items, setItems] = useState<FeedbackTicket[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadFeedback = useCallback(async () => {
    setLoading(true)
    try {
      const result = await api.getConsumerFeedback(token)
      setItems(result)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '加载反馈列表失败')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    form.setFieldsValue({ contact_info: user?.contact_info || user?.phone || '' })
    void loadFeedback()
  }, [form, loadFeedback, user])

  async function handleSubmit(values: { trace_code?: string; batch_id?: number; content: string; contact_info: string }) {
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      await api.createFeedback(token, values)
      setSuccess('反馈已提交，感谢你的意见。')
      form.resetFields()
      form.setFieldsValue({ contact_info: user?.contact_info || user?.phone || '' })
      await loadFeedback()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '提交反馈失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card title="意见反馈">
        <Typography.Paragraph type="secondary">
          你可以针对溯源查询结果、茶叶品质信息或系统使用体验提交反馈，并跟踪管理员处理进度。
        </Typography.Paragraph>
        {error ? <Alert showIcon type="error" message={error} style={{ marginBottom: 16 }} /> : null}
        {success ? <Alert showIcon type="success" message={success} style={{ marginBottom: 16 }} /> : null}
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="溯源码" name="trace_code">
            <Input />
          </Form.Item>
          <Form.Item label="批次 ID" name="batch_id">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="反馈内容" name="content" rules={[{ required: true, message: '请输入反馈内容' }]}>
            <Input.TextArea rows={5} />
          </Form.Item>
          <Form.Item label="联系信息" name="contact_info">
            <Input />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              提交反馈
            </Button>
          </Space>
        </Form>
      </Card>

      <Card title="我的反馈记录">
        <Table<FeedbackTicket>
          rowKey="id"
          loading={loading}
          dataSource={items}
          pagination={{ pageSize: 6 }}
          locale={{ emptyText: <EmptyState description="暂无反馈记录" /> }}
          columns={[
            { title: '批次码', dataIndex: 'batch_code', key: 'batch_code', render: (value: string) => value || '-' },
            { title: '溯源码', dataIndex: 'trace_code', key: 'trace_code', render: (value: string) => value || '-' },
            { title: '反馈内容', dataIndex: 'content', key: 'content' },
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
              title: '处理备注',
              dataIndex: 'process_note',
              key: 'process_note',
              render: (value: string) => value || '-',
            },
            { title: '提交时间', dataIndex: 'created_at', key: 'created_at', render: formatDateTime },
          ]}
        />
      </Card>
    </Space>
  )
}
