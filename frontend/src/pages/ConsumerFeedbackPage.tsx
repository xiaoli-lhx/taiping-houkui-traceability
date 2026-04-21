import { useState } from 'react'
import { Alert, Button, Card, Form, Input, Space, Typography } from 'antd'

import { useAuth } from '../auth/useAuth'
import { api } from '../lib/api'

export function ConsumerFeedbackPage() {
  const { token, user } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(values: { trace_code?: string; batch_id?: number; content: string; contact_info: string }) {
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      await api.createFeedback(token, values)
      setSuccess('反馈已提交，感谢你的意见。')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '提交反馈失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card title="意见反馈">
      <Typography.Paragraph type="secondary">
        你可以针对溯源查询结果、茶叶品质信息或系统使用体验提交反馈。
      </Typography.Paragraph>
      {error ? <Alert showIcon type="error" message={error} style={{ marginBottom: 16 }} /> : null}
      {success ? <Alert showIcon type="success" message={success} style={{ marginBottom: 16 }} /> : null}
      <Form layout="vertical" onFinish={handleSubmit} initialValues={{ contact_info: user?.contact_info || user?.phone || '' }}>
        <Form.Item label="溯源码" name="trace_code">
          <Input />
        </Form.Item>
        <Form.Item label="批次 ID" name="batch_id">
          <Input />
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
  )
}

