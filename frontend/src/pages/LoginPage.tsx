import { useState } from 'react'
import { Alert, Button, Card, Divider, Flex, Form, Input, Select, Space, Tag, Typography } from 'antd'
import { CheckCircleFilled, LockOutlined, LoginOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons'
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
    <div className="login-page login-page--hero">
      <div className="login-shell">
        <section className="login-hero-panel">
          <Space direction="vertical" size={18} className="login-hero-stack">
            <Tag className="login-hero-badge" bordered={false}>
              黄山太平猴魁数字化管理平台
            </Tag>
            <Typography.Title level={1} className="login-hero-title">
              太平猴魁溯源与品质评估系统
            </Typography.Title>
            <Typography.Paragraph className="login-hero-description">
              面向茶农、企业、监管方与消费者的一体化业务入口，覆盖种植档案、加工流转、品质评估与公开查询。
            </Typography.Paragraph>
            <Flex gap={10} wrap>
              <Tag className="login-hero-tag" bordered={false}>
                核心产区档案
              </Tag>
              <Tag className="login-hero-tag" bordered={false}>
                全链路溯源
              </Tag>
              <Tag className="login-hero-tag" bordered={false}>
                品质量化评估
              </Tag>
            </Flex>
          </Space>

          <div className="login-hero-metrics">
            <div className="login-metric-card">
              <Typography.Text className="login-metric-label">业务覆盖</Typography.Text>
              <Typography.Title level={3} className="login-metric-value">
                种植 / 加工 / 流通
              </Typography.Title>
            </div>
            <div className="login-metric-card">
              <Typography.Text className="login-metric-label">系统能力</Typography.Text>
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <Flex align="center" gap={8} className="login-feature-item">
                  <CheckCircleFilled />
                  <span>批次履历可追踪</span>
                </Flex>
                <Flex align="center" gap={8} className="login-feature-item">
                  <CheckCircleFilled />
                  <span>品质报告可沉淀</span>
                </Flex>
                <Flex align="center" gap={8} className="login-feature-item">
                  <CheckCircleFilled />
                  <span>公众查询可验证</span>
                </Flex>
              </Space>
            </div>
          </div>
        </section>

        <Card bordered={false} className="login-card simple-login-card login-card--glass">
          <Space direction="vertical" size={10} style={{ width: '100%', marginBottom: 28 }}>
            <Typography.Text className="login-card-eyebrow">Sign In To Continue</Typography.Text>
            <Typography.Title level={2} className="login-card-title">
              欢迎登录
            </Typography.Title>
            <Typography.Text className="login-card-subtitle">太平猴魁溯源与品质评估系统入口</Typography.Text>
            <Typography.Text type="secondary">请选择用户类型并输入账号密码后登录。</Typography.Text>
          </Space>

          <Form layout="vertical" size="large" onFinish={handleSubmit} initialValues={{ role: 'enterprise' }}>
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

            <Button
              type="primary"
              htmlType="submit"
              icon={<LoginOutlined />}
              loading={submitting}
              block
              size="large"
              className="login-submit-button"
            >
              登录
            </Button>
          </Form>

          <div className="login-footer-link">
            <Divider className="login-footer-divider" />
            <Flex justify="space-between" align="center" wrap gap={12}>
              <Link to="/register">注册新账号</Link>
              <Button type="link" icon={<SearchOutlined />} onClick={() => navigate('/public-query')} style={{ paddingInline: 0 }}>
                匿名公开查询
              </Button>
            </Flex>
          </div>
        </Card>
      </div>
    </div>
  )
}
