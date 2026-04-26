import { useEffect, useState } from 'react'
import { Card, Col, Row, Space, Statistic, Table, Typography } from 'antd'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/useAuth'
import { EmptyState } from '../components/EmptyState'
import { api } from '../lib/api'
import { formatDateTime } from '../lib/display'
import type { ConsumerQueryHistory } from '../types'

export function ConsumerHomePage() {
  const { token } = useAuth()
  const [favoriteCount, setFavoriteCount] = useState(0)
  const [historyCount, setHistoryCount] = useState(0)
  const [feedbackCount, setFeedbackCount] = useState(0)
  const [historyItems, setHistoryItems] = useState<ConsumerQueryHistory[]>([])

  useEffect(() => {
    async function load() {
      const [favorites, history, feedback] = await Promise.all([api.getFavorites(token), api.getHistory(token), api.getConsumerFeedback(token)])
      setFavoriteCount(favorites.length)
      setHistoryCount(history.length)
      setFeedbackCount(feedback.filter((item) => item.status !== 'resolved').length)
      setHistoryItems(history.slice(0, 5))
    }
    void load()
  }, [token])

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Typography.Title level={3} style={{ margin: 0 }}>
          消费者中心
        </Typography.Title>
        <Typography.Text type="secondary">
          已登录消费者可查看个人查询历史、收藏感兴趣的批次，并提交反馈。
        </Typography.Text>
      </Card>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card>
            <Statistic title="收藏批次数" value={favoriteCount} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card>
            <Statistic title="查询历史数" value={historyCount} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card>
            <Statistic title="处理中反馈数" value={feedbackCount} />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card hoverable>
            <Link to="/consumer/query">进入查询中心</Link>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card hoverable>
            <Link to="/consumer/favorites">查看我的收藏</Link>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card hoverable>
            <Link to="/consumer/feedback">提交反馈</Link>
          </Card>
        </Col>
      </Row>

      <Card title="最近查询历史">
        <Table<ConsumerQueryHistory>
          rowKey="id"
          pagination={false}
          dataSource={historyItems}
          locale={{ emptyText: <EmptyState description="暂无查询历史" /> }}
          columns={[
            { title: '查询码', dataIndex: 'code_queried', key: 'code_queried' },
            { title: '批次码', dataIndex: 'batch_code', key: 'batch_code', render: (value: string) => value || '-' },
            { title: '时间', dataIndex: 'queried_at', key: 'queried_at', render: formatDateTime },
            { title: '操作', key: 'action', render: (_: unknown, record: ConsumerQueryHistory) => <Link to={`/public-query?code=${record.code_queried}`}>再次查询</Link> },
          ]}
        />
      </Card>
    </Space>
  )
}
