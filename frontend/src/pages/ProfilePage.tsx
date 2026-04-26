import { CheckCircleFilled, UserOutlined } from '@ant-design/icons'
import { Card, Col, Descriptions, Row, Space, Tag, Typography } from 'antd'

import { getRoleLabel } from '../auth/roles'
import { useAuth } from '../auth/useAuth'
import { getAccountStatusMeta, getAuditStatusMeta, formatDateTime } from '../lib/display'

export function ProfilePage() {
  const { user } = useAuth()
  const approvalMeta = getAuditStatusMeta(user?.approval_status)
  const accountMeta = getAccountStatusMeta(user?.status)

  return (
    <Space direction="vertical" size={16} className="admin-page-stack">
      <Card bordered={false} className="admin-hero-card admin-hero-card--section">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Tag bordered={false} className="admin-hero-badge">
            Account Profile
          </Tag>
          <Typography.Title level={2} className="admin-hero-title">
            个人中心
          </Typography.Title>
          <Typography.Paragraph className="admin-hero-description">
            查看当前账号的基础资料、所属组织、审核状态和联系信息，保持管理员身份信息与平台状态一致。
          </Typography.Paragraph>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card bordered={false} className="admin-stat-card admin-stat-card--neutral">
            <Typography.Text className="admin-stat-label">当前身份</Typography.Text>
            <Typography.Title level={3} className="admin-stat-value">
              {user?.display_name || user?.username || '-'}
            </Typography.Title>
            <Space size={8} wrap>
              <Tag color="blue">{getRoleLabel(user?.role_code || '')}</Tag>
              <Tag color={approvalMeta.color}>{approvalMeta.text}</Tag>
              <Tag color={accountMeta.color}>{accountMeta.text}</Tag>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card bordered={false} className="admin-stat-card admin-stat-card--success">
            <Typography.Text className="admin-stat-label">所属组织</Typography.Text>
            <Typography.Title level={3} className="admin-stat-value">
              {user?.organization || '-'}
            </Typography.Title>
            <Typography.Text type="secondary">账号归属主体或平台管理机构</Typography.Text>
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
    </Space>
  )
}
