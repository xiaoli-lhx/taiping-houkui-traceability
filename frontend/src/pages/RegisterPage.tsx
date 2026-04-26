import { useState } from 'react'
import { Alert, Button, Card, Divider, Flex, Form, Input, Select, Space, Tag, Typography } from 'antd'
import { CheckCircleFilled, SafetyCertificateOutlined, TeamOutlined } from '@ant-design/icons'
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
    <div className="login-page login-page--hero register-page">
      <div className="login-shell register-shell">
        <section className="login-hero-panel register-hero-panel">
          <Space direction="vertical" size={18} className="login-hero-stack">
            <Tag className="login-hero-badge" bordered={false}>
              New Account Enrollment
            </Tag>
            <Typography.Title level={1} className="login-hero-title register-hero-title">
              注册主体账号，接入太平猴魁业务流程
            </Typography.Title>
            <Typography.Paragraph className="login-hero-description">
              面向茶农、企业与消费者的统一注册入口。提交基础资料后进入管理员审核，审核通过即可登录系统并进入对应业务工作台。
            </Typography.Paragraph>
            <Flex gap={10} wrap>
              <Tag className="login-hero-tag" bordered={false}>
                茶农 / 企业 / 消费者
              </Tag>
              <Tag className="login-hero-tag" bordered={false}>
                资料在线提交
              </Tag>
              <Tag className="login-hero-tag" bordered={false}>
                审核后激活
              </Tag>
            </Flex>
          </Space>

          <div className="login-hero-metrics register-hero-metrics">
            <div className="login-metric-card">
              <Typography.Text className="login-metric-label">注册对象</Typography.Text>
              <Typography.Title level={3} className="login-metric-value">
                茶农 / 企业 / 消费者
              </Typography.Title>
            </div>
            <div className="login-metric-card">
              <Typography.Text className="login-metric-label">开通流程</Typography.Text>
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <Flex align="center" gap={8} className="login-feature-item">
                  <TeamOutlined />
                  <span>在线填写主体资料</span>
                </Flex>
                <Flex align="center" gap={8} className="login-feature-item">
                  <SafetyCertificateOutlined />
                  <span>管理员审核激活</span>
                </Flex>
                <Flex align="center" gap={8} className="login-feature-item">
                  <CheckCircleFilled />
                  <span>通过后即可登录使用</span>
                </Flex>
              </Space>
            </div>
          </div>
        </section>

        <Card bordered={false} className="login-card simple-login-card login-card--glass register-card--glass">
          <Space direction="vertical" size={10} style={{ width: '100%', marginBottom: 28 }}>
            <Typography.Text className="login-card-eyebrow">Create Your Account</Typography.Text>
            <Typography.Title level={2} className="login-card-title">
              账号注册
            </Typography.Title>
            <Typography.Text className="login-card-subtitle">Tea Traceability System Enrollment</Typography.Text>
            <Typography.Text type="secondary">请填写注册信息，提交后由管理员审核激活。</Typography.Text>
          </Space>

          <Form layout="vertical" size="large" onFinish={handleSubmit} initialValues={{ role: 'consumer' }}>
            <div className="register-form-grid">
              <Form.Item label="用户类型" name="role" rules={[{ required: true, message: '请选择用户类型' }]} className="register-form-span-2">
                <Select options={registerRoles as unknown as { label: string; value: string }[]} />
              </Form.Item>
              <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }]}>
                <Input placeholder="请输入用户名" />
              </Form.Item>
              <Form.Item label="显示名称" name="display_name" rules={[{ required: true, message: '请输入显示名称' }]}>
                <Input placeholder="请输入显示名称" />
              </Form.Item>
              <Form.Item label="手机号" name="phone" rules={[{ required: true, message: '请输入手机号' }]}>
                <Input placeholder="请输入手机号" />
              </Form.Item>
              <Form.Item label="所属主体/组织" name="organization" rules={[{ required: true, message: '请输入所属主体或组织' }]}>
                <Input placeholder="请输入所属主体或组织" />
              </Form.Item>
              <Form.Item label="联系信息" name="contact_info" className="register-form-span-2">
                <Input placeholder="可填写邮箱、微信或其他联系信息" />
              </Form.Item>
              <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}>
                <Input.Password placeholder="请输入密码" />
              </Form.Item>
              <Form.Item label="确认密码" name="confirm_password" rules={[{ required: true, message: '请确认密码' }]}>
                <Input.Password placeholder="请再次输入密码" />
              </Form.Item>
            </div>

            {error ? <Alert showIcon type="error" message={error} style={{ marginBottom: 16 }} /> : null}
            {success ? <Alert showIcon type="success" message={success} style={{ marginBottom: 16 }} /> : null}

            <div className="register-submit-wrap">
              <Button type="primary" htmlType="submit" loading={submitting} block size="large" className="login-submit-button">
                提交注册申请
              </Button>
              <Flex align="center" gap={8} className="register-tip">
                <CheckCircleFilled />
                <span>提交后将进入管理员审核流程</span>
              </Flex>
            </div>
          </Form>

          <div className="login-footer-link">
            <Divider className="login-footer-divider" />
            <Flex justify="space-between" align="center" wrap gap={12}>
              <Typography.Text type="secondary">已有账号可直接返回登录</Typography.Text>
              <Link to="/login">返回登录</Link>
            </Flex>
          </div>
        </Card>
      </div>
    </div>
  )
}
