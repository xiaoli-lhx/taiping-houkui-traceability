import { useEffect, useMemo, useState } from 'react'
import { ArrowRightOutlined, AuditOutlined, BarChartOutlined, BellOutlined, ClockCircleOutlined, TagsOutlined } from '@ant-design/icons'
import { Alert, Card, Col, Empty, Row, Space, Spin, Tag, Typography } from 'antd'
import { Link } from 'react-router-dom'

import { getRoleLabel, withPortalPrefix } from '../auth/roles'
import { useAuth } from '../auth/useAuth'
import { api } from '../lib/api'
import {
  formatDateTime,
  getAuditStatusMeta,
  getBatchStatusMeta,
  getNotificationCategoryLabel,
  getRectificationStatusMeta,
  getRiskSeverityMeta,
} from '../lib/display'
import type { NotificationItem, OverviewStats, RectificationTask, RiskAlertItem, TeaBatch, TodoSummary } from '../types'

type PortalStat = {
  label: string
  value: number | string
  tone: 'primary' | 'success' | 'warning' | 'danger'
}

type PortalPreviewItem = {
  title: string
  subtitle: string
  meta: string
  statusText: string
  statusColor: string
  to: string
}

export function PortalHomePage({
  title,
  description,
  shortcuts,
}: {
  title: string
  description: string
  shortcuts: Array<{ label: string; to: string }>
}) {
  const { user, token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState<PortalStat[]>([])
  const [previewTitle, setPreviewTitle] = useState('工作概览')
  const [previewDescription, setPreviewDescription] = useState('')
  const [previewItems, setPreviewItems] = useState<PortalPreviewItem[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  const role = user?.role_code

  useEffect(() => {
    async function loadWorkspace() {
      if (!role) {
        return
      }

      setLoading(true)
      setError('')
      try {
        const requests: Array<Promise<unknown>> = [
          api.getBatches(token, { pageSize: 100 }),
          api.getTodos(token),
          api.getNotifications(token, { isRead: false, pageSize: 5 }),
        ]
        if (role === 'enterprise' || role === 'regulator') {
          requests.push(api.getOverview(token))
        }
        if (role === 'farmer' || role === 'enterprise' || role === 'regulator') {
          requests.push(api.getRectifications(token))
        }
        if (role === 'regulator') {
          requests.push(api.getRiskAlerts(token))
        }

        const results = await Promise.all(requests)
        const batches = (results[0] as { items: TeaBatch[] }).items
        const todos = results[1] as TodoSummary
        const notificationResult = results[2] as { items: NotificationItem[] }
        setNotifications(notificationResult.items)

        const unreadCount = todos.items.find((item) => item.key === 'unread_notifications')?.count ?? 0

        if (role === 'farmer') {
          const rectifications = (results[3] as RectificationTask[]) ?? []
          const pendingRectifications = rectifications.filter((item) => item.responsible_role === 'farmer' && item.status !== 'completed')
          setStats([
            { label: '我的批次', value: batches.length, tone: 'primary' },
            { label: '处理中', value: batches.filter((item) => item.status === 'processing').length, tone: 'warning' },
            { label: '已完成', value: batches.filter((item) => item.status === 'completed').length, tone: 'success' },
            { label: '待整改', value: pendingRectifications.length, tone: 'danger' },
            { label: '未读通知', value: unreadCount, tone: 'primary' },
          ])
          setPreviewTitle('生产批次列表')
          setPreviewDescription('查看最近批次、审核状态与生产节点进度，便于快速进入补录或详情页。')
          setPreviewItems(
            batches.slice(0, 5).map((item) => {
              const statusMeta = getBatchStatusMeta(item.status)
              return {
                title: item.batch_code,
                subtitle: `${item.origin} · ${item.farm_name || '-'}`,
                meta: `${item.trace_code} · ${formatDateTime(item.updated_at)}`,
                statusText: statusMeta.text,
                statusColor: statusMeta.color,
                to: withPortalPrefix(user, `/batches/${item.id}`),
              }
            }),
          )
          return
        }

        if (role === 'enterprise') {
          const overview = results[3] as OverviewStats
          const rectifications = (results[4] as RectificationTask[]) ?? []
          setStats([
            { label: '在产批次', value: batches.length, tone: 'primary' },
            { label: '公开批次', value: overview.public_batches, tone: 'success' },
            { label: '评估总数', value: overview.total_evaluations, tone: 'warning' },
            { label: '平均得分', value: overview.average_score.toFixed(1), tone: 'danger' },
            { label: '待整改', value: rectifications.filter((item) => item.status === 'pending_submission').length, tone: 'warning' },
            { label: '未读通知', value: unreadCount, tone: 'primary' },
          ])
          setPreviewTitle('批次管理')
          setPreviewDescription('优先展示最新批次、公开状态与品质等级，帮助企业快速进入批次管理与品质评估。')
          setPreviewItems(
            batches.slice(0, 5).map((item) => {
              const auditMeta = getAuditStatusMeta(item.audit_status)
              return {
                title: item.batch_code,
                subtitle: `${item.enterprise_name || '-'} · 等级 ${item.latest_grade || '暂无'}`,
                meta: `${item.trace_code} · ${formatDateTime(item.updated_at)}`,
                statusText: auditMeta.text,
                statusColor: auditMeta.color,
                to: withPortalPrefix(user, `/batches/${item.id}`),
              }
            }),
          )
          return
        }

        if (role === 'regulator') {
          const overview = results[3] as OverviewStats
          const rectifications = (results[4] as RectificationTask[]) ?? []
          const risks = (results[5] as RiskAlertItem[]) ?? []
          const pendingBatches = batches.filter((item) => item.audit_status === 'pending')
          setStats([
            { label: '待审核批次', value: pendingBatches.length, tone: 'warning' },
            { label: '待复审整改', value: rectifications.filter((item) => item.status === 'submitted').length, tone: 'danger' },
            { label: '风险预警', value: risks.length, tone: 'primary' },
            { label: '公开批次', value: overview.public_batches, tone: 'success' },
            { label: '未读通知', value: unreadCount, tone: 'warning' },
          ])
          setPreviewTitle('审查队列')
          setPreviewDescription('优先展示待审核批次和风险事项，便于监管方快速进入审查、复审和风险研判。')
          setPreviewItems(
            (risks.length ? risks : pendingBatches).slice(0, 5).map((item) => {
              if ('severity' in item) {
                const riskMeta = getRiskSeverityMeta(item.severity)
                return {
                  title: item.batch_code,
                  subtitle: item.message,
                  meta: `${item.trace_code} · 指标值 ${item.metric_value}`,
                  statusText: riskMeta.text,
                  statusColor: riskMeta.color,
                  to: withPortalPrefix(user, `/batches/${item.batch_id}`),
                }
              }

              const auditMeta = getAuditStatusMeta(item.audit_status)
              return {
                title: item.batch_code,
                subtitle: `${item.origin} · 整改${getRectificationStatusMeta(item.rectification_status).text}`,
                meta: `${item.trace_code} · ${formatDateTime(item.updated_at)}`,
                statusText: auditMeta.text,
                statusColor: auditMeta.color,
                to: withPortalPrefix(user, `/batches/${item.id}`),
              }
            }),
          )
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '加载工作台失败')
      } finally {
        setLoading(false)
      }
    }

    void loadWorkspace()
  }, [role, token, user])

  const heroBadge = useMemo(() => {
    switch (role) {
      case 'farmer':
        return '茶农工作台'
      case 'enterprise':
        return '企业工作台'
      case 'regulator':
        return '监管工作台'
      default:
        return '工作台总览'
    }
  }, [role])

  const shortcutCards = useMemo(
    () =>
      shortcuts.map((shortcut) => ({
        ...shortcut,
        icon:
          shortcut.to.includes('batches') ? (
            <TagsOutlined />
          ) : shortcut.to.includes('stats') ? (
            <BarChartOutlined />
          ) : shortcut.to.includes('quality') || shortcut.to.includes('reviews') ? (
            <AuditOutlined />
          ) : (
            <ClockCircleOutlined />
          ),
      })),
    [shortcuts],
  )

  return (
    <Space direction="vertical" size={16} className="admin-page-stack">
      <Card bordered={false} className="admin-hero-card portal-hero-card">
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} lg={14}>
            <Space direction="vertical" size={12}>
              <Tag bordered={false} className="admin-hero-badge">
                {heroBadge}
              </Tag>
              <Typography.Title level={2} className="admin-hero-title">
                {title}
              </Typography.Title>
              <Typography.Paragraph className="admin-hero-description">
                {description}
              </Typography.Paragraph>
              <Space wrap>
                <Tag className="portal-inline-pill" bordered={false}>
                  当前角色：{getRoleLabel(role || '')}
                </Tag>
                <Tag className="portal-inline-pill" bordered={false}>
                  审核状态：{getAuditStatusMeta(user?.approval_status).text}
                </Tag>
                <Tag className="portal-inline-pill" bordered={false}>
                  组织：{user?.organization || '-'}
                </Tag>
              </Space>
            </Space>
          </Col>
          <Col xs={24} lg={10}>
            <div className="portal-action-grid">
              <Link to="/notifications" className="portal-action-card">
                <div className="portal-action-icon">
                  <BellOutlined />
                </div>
                <div>
                  <Typography.Text strong>通知中心</Typography.Text>
                  <div>
                    <Typography.Text type="secondary">查看最近通知和待办消息</Typography.Text>
                  </div>
                </div>
                <ArrowRightOutlined />
              </Link>
              {shortcutCards.map((shortcut) => (
                <Link key={shortcut.to} to={withPortalPrefix(user, shortcut.to)} className="portal-action-card">
                  <div className="portal-action-icon">{shortcut.icon}</div>
                  <div>
                    <Typography.Text strong>{shortcut.label}</Typography.Text>
                    <div>
                      <Typography.Text type="secondary">进入对应业务模块</Typography.Text>
                    </div>
                  </div>
                  <ArrowRightOutlined />
                </Link>
              ))}
            </div>
          </Col>
        </Row>
      </Card>

      {error ? <Alert showIcon type="error" message={error} /> : null}

      <Row gutter={[16, 16]}>
        {stats.map((item) => (
          <Col xs={24} sm={12} xl={6} key={item.label}>
            <Card bordered={false} className={`admin-stat-card admin-stat-card--${item.tone}`}>
              <Typography.Text className="admin-stat-label">{item.label}</Typography.Text>
              <Typography.Title level={2} className="admin-stat-value">
                {loading ? <Spin size="small" /> : item.value}
              </Typography.Title>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card bordered={false} className="admin-section-card">
            <div className="admin-table-summary">
              <div>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  {previewTitle}
                </Typography.Title>
                <Typography.Text type="secondary">{previewDescription}</Typography.Text>
              </div>
            </div>

            {loading ? (
              <div className="admin-inline-loading">
                <Spin />
              </div>
            ) : previewItems.length ? (
              <div className="admin-preview-list">
                {previewItems.map((item) => (
                  <div key={`${item.title}-${item.meta}`} className="admin-preview-item">
                    <div className="admin-preview-main">
                      <Space size={8} wrap>
                        <Typography.Text strong>{item.title}</Typography.Text>
                        <Tag color={item.statusColor}>{item.statusText}</Tag>
                      </Space>
                      <Typography.Text>{item.subtitle}</Typography.Text>
                      <Typography.Text type="secondary">{item.meta}</Typography.Text>
                    </div>
                    <Link to={item.to} className="admin-card-link">
                      查看详情 <ArrowRightOutlined />
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前暂无可展示数据" />
            )}
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card bordered={false} className="admin-section-card">
            <Typography.Title level={4} style={{ marginTop: 0 }}>
              最近通知
            </Typography.Title>
            {loading ? (
              <div className="admin-inline-loading">
                <Spin />
              </div>
            ) : notifications.length ? (
              <div className="admin-preview-list">
                {notifications.map((item) => (
                  <div key={item.id} className="admin-preview-item">
                    <div className="admin-preview-main">
                      <Space size={8} wrap>
                        <Typography.Text strong>{item.title}</Typography.Text>
                        <Tag>{getNotificationCategoryLabel(item.category)}</Tag>
                      </Space>
                      <Typography.Text>{item.content}</Typography.Text>
                      <Typography.Text type="secondary">{formatDateTime(item.created_at)}</Typography.Text>
                    </div>
                    <Link to={item.link || '/notifications'} className="admin-card-link">
                      查看 <ArrowRightOutlined />
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无未读通知" />
            )}
          </Card>
        </Col>
      </Row>
    </Space>
  )
}
