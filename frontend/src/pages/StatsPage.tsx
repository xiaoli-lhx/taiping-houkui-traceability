import { useEffect, useState } from 'react'
import { Alert, Card, Col, Row, Space, Statistic, Table, Typography } from 'antd'

import { useAuth } from '../auth/useAuth'
import { EmptyState } from '../components/EmptyState'
import {
  GradeDistributionCard,
  MetricTrendCard,
  ProductionDistributionCard,
} from '../components/charts'
import { api } from '../lib/api'
import type {
  GradeDistributionItem,
  MetricTrendItem,
  OverviewStats,
  ProductionDistributionItem,
} from '../types'

export function StatsPage() {
  const { token } = useAuth()
  const [overview, setOverview] = useState<OverviewStats | null>(null)
  const [production, setProduction] = useState<ProductionDistributionItem[]>([])
  const [grades, setGrades] = useState<GradeDistributionItem[]>([])
  const [trends, setTrends] = useState<MetricTrendItem[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadStats() {
      setError('')
      try {
        const [overviewResult, productionResult, gradeResult, trendResult] = await Promise.all([
          api.getOverview(token),
          api.getProductionDistribution(token),
          api.getGradeDistribution(token),
          api.getMetricTrends(token),
        ])
        setOverview(overviewResult)
        setProduction(productionResult)
        setGrades(gradeResult)
        setTrends(trendResult)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '加载统计数据失败')
      }
    }

    void loadStats()
  }, [token])

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Typography.Title level={3} style={{ margin: 0 }}>
          统计分析中心
        </Typography.Title>
        <Typography.Text type="secondary">
          当前页面对应开题报告中的数据统计分析模块，图表已接入真实后端接口数据。
        </Typography.Text>
      </Card>

      {error ? <Alert showIcon type="error" message={error} /> : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic title="批次总数" value={overview?.total_batches ?? 0} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic title="公开批次" value={overview?.public_batches ?? 0} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic title="评估总数" value={overview?.total_evaluations ?? 0} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic title="平均得分" value={overview?.average_score ?? 0} precision={2} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          {production.length ? (
            <ProductionDistributionCard items={production} />
          ) : (
            <Card title="产量分布图">
              <EmptyState description="暂无产量分布数据" />
            </Card>
          )}
        </Col>
        <Col xs={24} xl={10}>
          {grades.length ? (
            <GradeDistributionCard items={grades} />
          ) : (
            <Card title="品质等级占比图">
              <EmptyState description="暂无等级占比数据" />
            </Card>
          )}
        </Col>
      </Row>

      <Card>
        {trends.length ? <MetricTrendCard items={trends} /> : <EmptyState description="暂无品质趋势数据" />}
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card title="产量分布明细表">
            <Table
              rowKey="origin"
              pagination={false}
              dataSource={production}
              locale={{ emptyText: <EmptyState description="暂无产量分布明细" /> }}
              columns={[
                { title: '产地', dataIndex: 'origin', key: 'origin' },
                { title: '批次数', dataIndex: 'batch_count', key: 'batch_count' },
                { title: '总重量(kg)', dataIndex: 'total_quantity_kg', key: 'total_quantity_kg' },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="品质等级明细表">
            <Table
              rowKey="grade"
              pagination={false}
              dataSource={grades}
              locale={{ emptyText: <EmptyState description="暂无等级分布明细" /> }}
              columns={[
                { title: '等级', dataIndex: 'grade', key: 'grade' },
                { title: '数量', dataIndex: 'count', key: 'count' },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </Space>
  )
}
