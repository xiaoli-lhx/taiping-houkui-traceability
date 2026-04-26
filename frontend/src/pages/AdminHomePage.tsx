import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRightOutlined, AuditOutlined, MessageOutlined, ReloadOutlined, TeamOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Col, Row, Space, Spin, Tag, Typography } from 'antd'
import { Link } from 'react-router-dom'

import { getRoleLabel } from '../auth/roles'
import { useAuth } from '../auth/useAuth'
import type { AdminRegistrationStatus } from '../lib/admin'
import { adminRegistrationStatusOptions } from '../lib/admin'
import { EmptyState } from '../components/EmptyState'
import { api } from '../lib/api'
import { getAuditStatusMeta } from '../lib/display'
import type { UserProfile } from '../types'

type RegistrationCounts = Record<AdminRegistrationStatus, number>

const defaultCounts: RegistrationCounts = {
  pending: 0,
  approved: 0,
  rejected: 0,
  disabled: 0,
}

export function AdminHomePage() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [counts, setCounts] = useState<RegistrationCounts>(defaultCounts)
  const [totalUsers, setTotalUsers] = useState(0)
  const [pendingFeedbackCount, setPendingFeedbackCount] = useState(0)
  const [pendingItems, setPendingItems] = useState<UserProfile[]>([])

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [pending, approved, rejected, users, feedback] = await Promise.all([
        api.getAdminRegistrations(token, 'pending'),
        api.getAdminRegistrations(token, 'approved'),
        api.getAdminRegistrations(token, 'rejected'),
        api.getAdminUsers(token),
        api.getAdminFeedback(token),
      ])

      setCounts({
        pending: pending.length,
        approved: approved.length,
        rejected: rejected.length,
        disabled: users.filter((item) => item.status === 'disabled').length,
      })
      setPendingItems(pending.slice(0, 6))
      setTotalUsers(users.length)
      setPendingFeedbackCount(feedback.filter((item) => item.status !== 'resolved').length)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '加载管理员工作台失败')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const overviewItems = useMemo(
    () => [
      { label: '待审核申请', value: counts.pending, tone: 'warning' },
      { label: '已通过申请', value: counts.approved, tone: 'success' },
      { label: '已驳回申请', value: counts.rejected, tone: 'danger' },
      { label: '当前用户总数', value: totalUsers, tone: 'primary' },
      { label: '待处理反馈', value: pendingFeedbackCount, tone: 'neutral' },
    ],
    [counts, pendingFeedbackCount, totalUsers],
  )

  return (
    <Space direction="vertical" size={16} className="admin-page-stack">
      <Card bordered={false} className="admin-hero-card">
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} lg={15}>
            <Space direction="vertical" size={12}>
              <Tag bordered={false} className="admin-hero-badge">
                Admin Control Deck
              </Tag>
              <Typography.Title level={2} className="admin-hero-title">
                管理员工作台
              </Typography.Title>
              <Typography.Paragraph className="admin-hero-description">
                聚焦注册申请审核和平台用户治理，优先展示待处理事项与高频管理动作，减少通用门户式空白信息。
              </Typography.Paragraph>
            </Space>
          </Col>
          <Col xs={24} lg={9}>
            <Space wrap className="admin-hero-actions">
              <Link to="/admin/registrations">
                <Button type="primary" size="large" icon={<AuditOutlined />}>
                  处理待审核申请
                </Button>
              </Link>
              <Link to="/admin/users">
                <Button size="large" icon={<TeamOutlined />}>
                  查看用户管理
                </Button>
              </Link>
              <Link to="/admin/feedback">
                <Button size="large" icon={<MessageOutlined />}>
                  处理反馈工单
                </Button>
              </Link>
              <Button size="large" icon={<ReloadOutlined />} onClick={() => void loadDashboard()}>
                刷新数据
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {error ? <Alert showIcon type="error" message={error} /> : null}

      <Row gutter={[16, 16]}>
        {overviewItems.map((item) => (
          <Col xs={24} md={12} xl={6} key={item.label}>
            <Card bordered={false} className={`admin-stat-card admin-stat-card--${item.tone}`}>
              <Typography.Text className="admin-stat-label">{item.label}</Typography.Text>
              <Typography.Title level={2} className="admin-stat-value">
                {loading ? <Spin size="small" /> : item.value}
              </Typography.Title>
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        bordered={false}
        className="admin-section-card"
        title="待审核申请预览"
        extra={
          <Link to="/admin/registrations" className="admin-card-link">
            查看全部 <ArrowRightOutlined />
          </Link>
        }
      >
        <Typography.Paragraph className="admin-section-description">
          优先显示当前待审核的注册申请，便于管理员快速进入处理流程。
        </Typography.Paragraph>

        {loading ? (
          <div className="admin-inline-loading">
            <Spin />
          </div>
        ) : pendingItems.length ? (
          <div className="admin-preview-list">
            {pendingItems.map((item) => {
              const statusMeta = getAuditStatusMeta(item.approval_status)
              return (
                <div key={item.id} className="admin-preview-item">
                  <div className="admin-preview-main">
                    <Space size={8} wrap>
                      <Typography.Text strong>{item.display_name || item.username}</Typography.Text>
                      <Tag>{getRoleLabel(item.role_code)}</Tag>
                      <Tag color={statusMeta.color}>{statusMeta.text}</Tag>
                    </Space>
                    <Typography.Text type="secondary">
                      用户名：{item.username} · 组织：{item.organization || '-'} · 手机号：{item.phone || '-'}
                    </Typography.Text>
                  </div>
                  <Link to="/admin/registrations" className="admin-card-link">
                    去审核 <ArrowRightOutlined />
                  </Link>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="admin-empty-panel">
            <EmptyState description="当前没有待审核申请" />
            <Space wrap>
              <Link to="/admin/users">
                <Button icon={<TeamOutlined />}>查看用户管理</Button>
              </Link>
              <Link to="/admin/registrations">
                <Button type="primary" ghost icon={<AuditOutlined />}>
                  查看历史审核
                </Button>
              </Link>
            </Space>
          </div>
        )}

        <div className="admin-status-summary">
          {adminRegistrationStatusOptions.map((option) => (
            <div key={option.value} className="admin-status-summary-item">
              <span>{option.label}</span>
              <strong>{counts[option.value]}</strong>
            </div>
          ))}
        </div>
      </Card>
    </Space>
  )
}
