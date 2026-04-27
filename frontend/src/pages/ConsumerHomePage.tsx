import { useEffect, useState } from 'react'
import { ArrowRightOutlined, HeartOutlined, HistoryOutlined, MessageOutlined, SearchOutlined } from '@ant-design/icons'
import { Alert, Card, Col, Row, Space, Spin, Tag, Typography } from 'antd'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/useAuth'
import { EmptyState } from '../components/EmptyState'
import { api } from '../lib/api'
import { formatDateTime, getFeedbackStatusMeta } from '../lib/display'
import type { ConsumerQueryHistory } from '../types'

export function ConsumerHomePage() {
  const { token } = useAuth()
  const [favoriteCount, setFavoriteCount] = useState(0)
  const [historyCount, setHistoryCount] = useState(0)
  const [feedbackCount, setFeedbackCount] = useState(0)
  const [historyItems, setHistoryItems] = useState<ConsumerQueryHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [favorites, history, feedback] = await Promise.all([api.getFavorites(token), api.getHistory(token), api.getConsumerFeedback(token)])
        setFavoriteCount(favorites.length)
        setHistoryCount(history.length)
        setFeedbackCount(feedback.filter((item) => item.status !== 'resolved').length)
        setHistoryItems(history.slice(0, 5))
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '加载消费者工作台失败')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [token])

  return (
    <Space direction="vertical" size={16} className="admin-page-stack">
      <Card bordered={false} className="admin-hero-card portal-hero-card">
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} lg={14}>
            <Space direction="vertical" size={12}>
              <Tag bordered={false} className="admin-hero-badge">
                消费者查询中心
              </Tag>
              <Typography.Title level={2} className="admin-hero-title">
                消费者中心
              </Typography.Title>
              <Typography.Paragraph className="admin-hero-description">
                从公开溯源查询、收藏批次到反馈提交，集中管理个人关注的茶叶信息与查询轨迹。
              </Typography.Paragraph>
            </Space>
          </Col>
          <Col xs={24} lg={10}>
            <div className="portal-action-grid">
              <Link to="/consumer/query" className="portal-action-card">
                <div className="portal-action-icon">
                  <SearchOutlined />
                </div>
                <div>
                  <Typography.Text strong>溯源查询</Typography.Text>
                  <div>
                    <Typography.Text type="secondary">输入溯源码查看公开信息</Typography.Text>
                  </div>
                </div>
                <ArrowRightOutlined />
              </Link>
              <Link to="/consumer/favorites" className="portal-action-card">
                <div className="portal-action-icon">
                  <HeartOutlined />
                </div>
                <div>
                  <Typography.Text strong>我的收藏</Typography.Text>
                  <div>
                    <Typography.Text type="secondary">查看已收藏批次与等级</Typography.Text>
                  </div>
                </div>
                <ArrowRightOutlined />
              </Link>
              <Link to="/consumer/feedback" className="portal-action-card">
                <div className="portal-action-icon">
                  <MessageOutlined />
                </div>
                <div>
                  <Typography.Text strong>意见反馈</Typography.Text>
                  <div>
                    <Typography.Text type="secondary">提交问题与联系信息</Typography.Text>
                  </div>
                </div>
                <ArrowRightOutlined />
              </Link>
            </div>
          </Col>
        </Row>
      </Card>

      {error ? <Alert showIcon type="error" message={error} /> : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card bordered={false} className="admin-stat-card admin-stat-card--primary">
            <Typography.Text className="admin-stat-label">收藏批次</Typography.Text>
            <Typography.Title level={2} className="admin-stat-value">
              {loading ? <Spin size="small" /> : favoriteCount}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card bordered={false} className="admin-stat-card admin-stat-card--success">
            <Typography.Text className="admin-stat-label">查询历史</Typography.Text>
            <Typography.Title level={2} className="admin-stat-value">
              {loading ? <Spin size="small" /> : historyCount}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card bordered={false} className="admin-stat-card admin-stat-card--warning">
            <Typography.Text className="admin-stat-label">处理中反馈</Typography.Text>
            <Typography.Title level={2} className="admin-stat-value">
              {loading ? <Spin size="small" /> : feedbackCount}
            </Typography.Title>
          </Card>
        </Col>
      </Row>

      <Card bordered={false} className="admin-section-card">
        <div className="admin-table-summary">
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              最近查询历史
            </Typography.Title>
            <Typography.Text type="secondary">记录近期查询过的溯源码，便于再次进入公开查询页面。</Typography.Text>
          </div>
          <Tag className="admin-inline-tag" color="blue" icon={<HistoryOutlined />}>
            查询轨迹
          </Tag>
        </div>

        {loading ? (
          <div className="admin-inline-loading">
            <Spin />
          </div>
        ) : historyItems.length ? (
          <div className="admin-preview-list">
            {historyItems.map((item) => (
              <div key={item.id} className="admin-preview-item">
                <div className="admin-preview-main">
                  <Space size={8} wrap>
                    <Typography.Text strong>{item.code_queried}</Typography.Text>
                    <Tag color={getFeedbackStatusMeta('resolved').color}>可复查</Tag>
                  </Space>
                  <Typography.Text>{item.batch_code || '-'} · {item.trace_code || '-'}</Typography.Text>
                  <Typography.Text type="secondary">{formatDateTime(item.queried_at)}</Typography.Text>
                </div>
                <Link to={`/public-query?code=${item.code_queried}`} className="admin-card-link">
                  再次查询 <ArrowRightOutlined />
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState description="暂无查询历史" />
        )}
      </Card>
    </Space>
  )
}
