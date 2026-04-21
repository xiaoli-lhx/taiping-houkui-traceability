import { useState } from 'react'
import { Alert, Button, Card, Form, Input, Select, Space, Typography } from 'antd'
import { Link, useNavigate } from 'react-router-dom'

import { api } from '../lib/api'
import type { RegisterRequest } from '../types'

const registerRoles = [
  { label: '茶农', value: 'farmer' },
  { label: '企业', value: 'enterprise' },
  { label: '消费者', value: 'consumer' },
] as const

export function RegisterPage() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(values: RegisterRequest) {
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      await api.register(values)
      setSuccess('注册成功，当前账号已进入待审核状态，请等待管理员审核。')
      setTimeout(() => navigate('/login'), 1200)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '注册失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <Card bordered={false} className="login-card simple-login-card">
        <Space direction="vertical" size={8} style={{ width: '100%', marginBottom: 24 }}>
          <Typography.Text type="secondary">Tea Traceability System</Typography.Text>
          <Typography.Title level={2} style={{ margin: 0 }}>
            账号注册
          </Typography.Title>
          <Typography.Text type="secondary">
            请选择用户类型并填写注册信息，提交后由管理员审核激活。
          </Typography.Text>
        </Space>

        <Form layout="vertical" onFinish={handleSubmit} initialValues={{ role: 'consumer' }}>
          <Form.Item label="用户类型" name="role" rules={[{ required: true, message: '请选择用户类型' }]}>
            <Select options={registerRoles as unknown as { label: string; value: string }[]} />
          </Form.Item>
          <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="显示名称" name="display_name" rules={[{ required: true, message: '请输入显示名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="手机号" name="phone" rules={[{ required: true, message: '请输入手机号' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="所属主体/组织" name="organization" rules={[{ required: true, message: '请输入所属主体或组织' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="联系信息" name="contact_info">
            <Input placeholder="可填写邮箱、微信或其他联系信息" />
          </Form.Item>
          <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item label="确认密码" name="confirm_password" rules={[{ required: true, message: '请确认密码' }]}>
            <Input.Password />
          </Form.Item>

          {error ? <Alert showIcon type="error" message={error} style={{ marginBottom: 16 }} /> : null}
          {success ? <Alert showIcon type="success" message={success} style={{ marginBottom: 16 }} /> : null}

          <Button type="primary" htmlType="submit" loading={submitting} block size="large">
            提交注册申请
          </Button>
        </Form>

        <div className="login-footer-link">
          <Link to="/login">已有账号，返回登录</Link>
        </div>
      </Card>
    </div>
  )
}

