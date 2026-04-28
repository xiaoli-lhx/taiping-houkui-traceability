import { useState } from 'react'
import { CheckCircleFilled, LockOutlined, UploadOutlined, UserOutlined } from '@ant-design/icons'
import { Avatar, Button, Card, Col, Descriptions, Drawer, Form, Input, Row, Space, Tag, Typography, Upload } from 'antd'
import type { UploadFile, UploadProps } from 'antd'

import { getRoleLabel } from '../auth/roles'
import { useAuth } from '../auth/useAuth'
import { api, resolveFileUrl } from '../lib/api'
import { getAccountStatusMeta, getAuditStatusMeta, formatDateTime } from '../lib/display'

export function ProfilePage() {
  const { user, token, setSession } = useAuth()
  const [profileForm] = Form.useForm<{ display_name: string; phone: string; contact_info: string }>()
  const [passwordForm] = Form.useForm<{ old_password: string; new_password: string; confirm_password: string }>()
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false)
  const [passwordDrawerOpen, setPasswordDrawerOpen] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const approvalMeta = getAuditStatusMeta(user?.approval_status)
  const accountMeta = getAccountStatusMeta(user?.status)
  const avatarUploadList: UploadFile[] = selectedAvatar
    ? [{ uid: selectedAvatar.name, name: selectedAvatar.name, status: 'done' }]
    : []

  async function handleProfileSubmit(values: { display_name: string; phone: string; contact_info: string }) {
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      const formData = new FormData()
      formData.append('display_name', values.display_name)
      formData.append('phone', values.phone || '')
      formData.append('contact_info', values.contact_info || '')
      if (selectedAvatar) {
        formData.append('avatar', selectedAvatar)
      }
      const result = await api.updateProfile(token, formData)
      setSession(result.access_token, result.user)
      setSuccess('个人资料已更新。')
      setProfileDrawerOpen(false)
      setSelectedAvatar(null)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '更新个人资料失败')
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePasswordSubmit(values: { old_password: string; new_password: string; confirm_password: string }) {
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      await api.changePassword(token, values)
      setSuccess('密码修改成功。')
      passwordForm.resetFields()
      setPasswordDrawerOpen(false)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '修改密码失败')
    } finally {
      setSubmitting(false)
    }
  }

  const avatarUploadProps: UploadProps = {
    beforeUpload: (file) => {
      setSelectedAvatar(file)
      return false
    },
    fileList: avatarUploadList,
  }

  return (
    <Space direction="vertical" size={16} className="admin-page-stack">
      <Card bordered={false} className="admin-hero-card admin-hero-card--section">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Tag bordered={false} className="admin-hero-badge">
            账号资料
          </Tag>
          <Typography.Title level={2} className="admin-hero-title">
            个人中心
          </Typography.Title>
          <Typography.Paragraph className="admin-hero-description">
            管理头像、基础资料和登录密码，保持当前账号信息准确可用。
          </Typography.Paragraph>
          <Space wrap>
            <Button
              type="primary"
              onClick={() => {
                profileForm.setFieldsValue({
                  display_name: user?.display_name || '',
                  phone: user?.phone || '',
                  contact_info: user?.contact_info || '',
                })
                setProfileDrawerOpen(true)
              }}
            >
              编辑资料
            </Button>
            <Button icon={<LockOutlined />} onClick={() => setPasswordDrawerOpen(true)}>
              修改密码
            </Button>
          </Space>
        </Space>
      </Card>

      {error ? <Card bordered={false}><Typography.Text type="danger">{error}</Typography.Text></Card> : null}
      {success ? <Card bordered={false}><Typography.Text type="success">{success}</Typography.Text></Card> : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card bordered={false} className="admin-stat-card admin-stat-card--neutral">
            <Space direction="vertical" size={12}>
              <Avatar size={88} src={resolveFileUrl(user?.avatar_url)} icon={<UserOutlined />} />
              <Typography.Text className="admin-stat-label">当前身份</Typography.Text>
              <Typography.Title level={3} className="admin-stat-value">
                {user?.display_name || user?.username || '-'}
              </Typography.Title>
              <Space size={8} wrap>
                <Tag color="blue">{getRoleLabel(user?.role_code || '')}</Tag>
                <Tag color={approvalMeta.color}>{approvalMeta.text}</Tag>
                <Tag color={accountMeta.color}>{accountMeta.text}</Tag>
              </Space>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card bordered={false} className="admin-stat-card admin-stat-card--success">
            <Typography.Text className="admin-stat-label">所属组织</Typography.Text>
            <Typography.Title level={3} className="admin-stat-value">
              {user?.organization || '-'}
            </Typography.Title>
            <Typography.Text type="secondary">组织信息由注册和后台治理维护</Typography.Text>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card bordered={false} className="admin-stat-card admin-stat-card--primary">
            <Typography.Text className="admin-stat-label">审核时间</Typography.Text>
            <Typography.Title level={4} className="admin-stat-value">
              {formatDateTime(user?.approved_at)}
            </Typography.Title>
            <Typography.Text type="secondary">审核通过后记录最近一次审批时间</Typography.Text>
          </Card>
        </Col>
      </Row>

      <Card bordered={false} className="admin-section-card admin-table-card">
        <div className="admin-table-summary">
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              账号资料
            </Typography.Title>
            <Typography.Text type="secondary">展示当前登录账号的完整资料与审批状态</Typography.Text>
          </div>
          <Tag className="admin-inline-tag" color="processing" icon={<UserOutlined />}>
            账号详情
          </Tag>
        </div>

        <Descriptions column={2} bordered size="middle" className="admin-profile-descriptions">
          <Descriptions.Item label="用户名">{user?.username || '-'}</Descriptions.Item>
          <Descriptions.Item label="显示名称">{user?.display_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="手机号">{user?.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="所属组织">{user?.organization || '-'}</Descriptions.Item>
          <Descriptions.Item label="角色">
            <Tag color="blue">{getRoleLabel(user?.role_code || '')}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="审核状态">
            <Tag color={approvalMeta.color}>{approvalMeta.text}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="账号状态">
            <Tag color={accountMeta.color}>{accountMeta.text}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="审核时间">{formatDateTime(user?.approved_at)}</Descriptions.Item>
          <Descriptions.Item label="联系信息" span={2}>
            {user?.contact_info || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="驳回原因" span={2}>
            {user?.rejection_reason ? (
              <Space size={8}>
                <CheckCircleFilled style={{ color: '#d48806' }} />
                <span>{user.rejection_reason}</span>
              </Space>
            ) : (
              '-'
            )}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Drawer title="编辑个人资料" width={520} open={profileDrawerOpen} onClose={() => setProfileDrawerOpen(false)} destroyOnClose>
        <Form form={profileForm} layout="vertical" onFinish={handleProfileSubmit}>
          <Form.Item label="头像">
            <Upload {...avatarUploadProps}>
              <Button icon={<UploadOutlined />}>选择头像</Button>
            </Upload>
          </Form.Item>
          <Form.Item label="显示名称" name="display_name" rules={[{ required: true, message: '请输入显示名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="手机号" name="phone">
            <Input />
          </Form.Item>
          <Form.Item label="联系信息" name="contact_info">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Space>
            <Button onClick={() => setProfileDrawerOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              保存资料
            </Button>
          </Space>
        </Form>
      </Drawer>

      <Drawer title="修改密码" width={460} open={passwordDrawerOpen} onClose={() => setPasswordDrawerOpen(false)} destroyOnClose>
        <Form form={passwordForm} layout="vertical" onFinish={handlePasswordSubmit}>
          <Form.Item label="原密码" name="old_password" rules={[{ required: true, message: '请输入原密码' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item label="新密码" name="new_password" rules={[{ required: true, message: '请输入新密码' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item label="确认新密码" name="confirm_password" rules={[{ required: true, message: '请再次输入新密码' }]}>
            <Input.Password />
          </Form.Item>
          <Space>
            <Button onClick={() => setPasswordDrawerOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              保存密码
            </Button>
          </Space>
        </Form>
      </Drawer>
    </Space>
  )
}
