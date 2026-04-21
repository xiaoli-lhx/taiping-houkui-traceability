import { useState } from 'react'
import { Alert, Button, Card, Form, Input, Select, Space, Typography } from 'antd'
import { LockOutlined, LoginOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { getDefaultRoute, getRoleLabel } from '../auth/roles'
import { useAuth } from '../auth/useAuth'
import type { AppRole } from '../types'

const loginRoles: { label: string; value: AppRole }[] = [
  { label: '管理员', value: 'admin' },
  { label: '茶农', value: 'farmer' },
  { label: '企业', value: 'enterprise' },
  { label: '监管方', value: 'regulator' },
  { label: '消费者', value: 'consumer' },
]

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(values: { role: AppRole; username: string; password: string }) {
    setSubmitting(true)
    setError('')
    try {
      const result = await login(values.username, values.password, values.role)
      const redirectPath = (location.state as { from?: string } | null)?.from ?? getDefaultRoute(result.user)
      navigate(redirectPath, { replace: true })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '登录失败')
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
            系统登录
          </Typography.Title>
          <Typography.Text type="secondary">
            请选择用户类型并输入账号密码后登录。
          </Typography.Text>
        </Space>

        <Form layout="vertical" onFinish={handleSubmit} initialValues={{ role: 'enterprise' }}>
          <Form.Item label="用户类型" name="role" rules={[{ required: true, message: '请选择用户类型' }]}>
            <Select options={loginRoles} optionRender={(option) => <Space>{getRoleLabel(option.data.value)}</Space>} />
          </Form.Item>
          <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="请输入用户名" autoComplete="username" />
          </Form.Item>
          <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" autoComplete="current-password" />
          </Form.Item>

          {error ? <Alert showIcon type="error" message="登录失败" description={error} style={{ marginBottom: 16 }} /> : null}

          <Button type="primary" htmlType="submit" icon={<LoginOutlined />} loading={submitting} block size="large">
            登录
          </Button>
        </Form>

        <div className="login-footer-link">
          <Space split={<span>|</span>}>
            <Link to="/register">注册新账号</Link>
            <Button type="link" icon={<SearchOutlined />} onClick={() => navigate('/public-query')}>
              匿名公开查询
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  )
}
