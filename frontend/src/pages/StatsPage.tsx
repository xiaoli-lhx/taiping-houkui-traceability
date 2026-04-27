import { useEffect, useState } from 'react'
import { Alert, Card, Col, Row, Space, Table, Tag, Typography } from 'antd'
import { BarChartOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'

import { hasAnyRole, withPortalPrefix } from '../auth/roles'
import { useAuth } from '../auth/useAuth'
import { EmptyState } from '../components/EmptyState'
import { GradeDistributionCard, MetricTrendCard, ProductionDistributionCard } from '../components/charts'
import { api } from '../lib/api'
import { getRiskSeverityMeta } from '../lib/display'
import type { GradeDistributionItem, MetricTrendItem, OverviewStats, ProductionDistributionItem, RiskAlertItem } from '../types'

export function StatsPage() {
  const { token, user } = useAuth()
  const [overview, setOverview] = useState<OverviewStats | null>(null)
  const [production, setProduction] = useState<ProductionDistributionItem[]>([])
  const [grades, setGrades] = useState<GradeDistributionItem[]>([])
  const [trends, setTrends] = useState<MetricTrendItem[]>([])
  const [riskAlerts, setRiskAlerts] = useState<RiskAlertItem[]>([])
  const [error, setError] = useState('')
  const canViewRiskAlerts = hasAnyRole(user, ['admin', 'regulator'])

  useEffect(() => {
    async function loadStats() {
      setError('')
      try {
        const requests: Array<Promise<unknown>> = [
          api.getOverview(token),
          api.getProductionDistribution(token),
          api.getGradeDistribution(token),
          api.getMetricTrends(token),
        ]
        if (canViewRiskAlerts) {
          requests.push(api.getRiskAlerts(token))
        }
        const [overviewResult, productionResult, gradeResult, trendResult, riskResult] = await Promise.all(requests)
        setOverview(overviewResult as OverviewStats)
        setProduction(productionResult as ProductionDistributionItem[])
        setGrades(gradeResult as GradeDistributionItem[])
        setTrends(trendResult as MetricTrendItem[])
        setRiskAlerts((riskResult as RiskAlertItem[] | undefined) ?? [])
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '加载统计数据失败')
      }
    }

    void loadStats()
  }, [canViewRiskAlerts, token])

  return (
    <Space direction="vertical" size={16} className="admin-page-stack">
      <Card bordered={false} className="admin-hero-card portal-hero-card">
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} lg={15}>
            <Space direction="vertical" size={12}>
              <Tag bordered={false} className="admin-hero-badge">
                数据分析中心
              </Tag>
              <Typography.Title level={2} className="admin-hero-title">
                统计分析中心
              </Typography.Title>
              <Typography.Paragraph className="admin-hero-description">
                面向企业与监管方展示批次总量、公开覆盖、品质分布、趋势变化与风险预警，形成可追踪的数据分析面板。
              </Typography.Paragraph>
            </Space>
          </Col>
          <Col xs={24} lg={9}>
            <div className="portal-action-grid">
              <Link to={withPortalPrefix(user, '/batches')} className="portal-action-card">
                <div className="portal-action-icon">
                  <BarChartOutlined />
                </div>
                <div>
                  <Typography.Text strong>查看批次明细</Typography.Text>
                  <div>
                    <Typography.Text type="secondary">回到批次工作区核对基础数据</Typography.Text>
                  </div>
                </div>
              </Link>
            </div>
          </Col>
        </Row>
      </Card>

      {error ? <Alert showIcon type="error" message={error} /> : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}>
          <Card bordered={false} className="admin-stat-card admin-stat-card--primary">
            <Typography.Text className="admin-stat-label">批次总数</Typography.Text>
            <Typography.Title level={2} className="admin-stat-value">{overview?.total_batches ?? 0}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card bordered={false} className="admin-stat-card admin-stat-card--success">
            <Typography.Text className="admin-stat-label">公开批次</Typography.Text>
            <Typography.Title level={2} className="admin-stat-value">{overview?.public_batches ?? 0}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card bordered={false} className="admin-stat-card admin-stat-card--warning">
            <Typography.Text className="admin-stat-label">评估总数</Typography.Text>
            <Typography.Title level={2} className="admin-stat-value">{overview?.total_evaluations ?? 0}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card bordered={false} className="admin-stat-card admin-stat-card--danger">
            <Typography.Text className="admin-stat-label">平均得分</Typography.Text>
            <Typography.Title level={2} className="admin-stat-value">{overview?.average_score?.toFixed(2) ?? '0.00'}</Typography.Title>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          {production.length ? (
            <ProductionDistributionCard items={production} />
          ) : (
            <Card bordered={false} className="admin-section-card">
              <Typography.Title level={4} style={{ marginTop: 0 }}>产量分布图</Typography.Title>
              <EmptyState description="暂无产量分布数据" />
            </Card>
          )}
        </Col>
        <Col xs={24} xl={10}>
          {grades.length ? (
            <GradeDistributionCard items={grades} />
          ) : (
            <Card bordered={false} className="admin-section-card">
              <Typography.Title level={4} style={{ marginTop: 0 }}>品质等级占比图</Typography.Title>
              <EmptyState description="暂无等级占比数据" />
            </Card>
          )}
        </Col>
      </Row>

      <Card bordered={false} className="admin-section-card">
        <Typography.Title level={4} style={{ marginTop: 0 }}>品质趋势分析</Typography.Title>
        {trends.length ? <MetricTrendCard items={trends} /> : <EmptyState description="暂无品质趋势数据" />}
      </Card>

      {canViewRiskAlerts ? (
        <Card bordered={false} className="admin-section-card admin-table-card">
          <div className="admin-table-summary">
            <div>
              <Typography.Title level={4} style={{ margin: 0 }}>风险预警列表</Typography.Title>
              <Typography.Text type="secondary">识别可能影响公开溯源可信度或品质判断的风险批次。</Typography.Text>
            </div>
          </div>
          <Table<RiskAlertItem>
            rowKey={(record) => `${record.type}-${record.batch_id}-${record.metric_value}`}
            pagination={{ pageSize: 6 }}
            dataSource={riskAlerts}
            locale={{ emptyText: <EmptyState description="当前没有命中的风险预警" /> }}
            columns={[
              {
                title: '风险级别',
                dataIndex: 'severity',
                key: 'severity',
                render: (value: string) => {
                  const meta = getRiskSeverityMeta(value)
                  return <Tag color={meta.color}>{meta.text}</Tag>
                },
              },
              { title: '风险类型', dataIndex: 'type', key: 'type' },
              { title: '批次码', dataIndex: 'batch_code', key: 'batch_code' },
              { title: '溯源码', dataIndex: 'trace_code', key: 'trace_code' },
              { title: '指标值', dataIndex: 'metric_value', key: 'metric_value' },
              { title: '提示信息', dataIndex: 'message', key: 'message' },
              {
                title: '操作',
                key: 'action',
                render: (_: unknown, record: RiskAlertItem) => (
                  <Link to={withPortalPrefix(user, `/batches/${record.batch_id}`)}>查看批次</Link>
                ),
              },
            ]}
          />
        </Card>
      ) : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card bordered={false} className="admin-section-card admin-table-card">
            <Typography.Title level={4} style={{ marginTop: 0 }}>产量分布明细表</Typography.Title>
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
          <Card bordered={false} className="admin-section-card admin-table-card">
            <Typography.Title level={4} style={{ marginTop: 0 }}>品质等级明细表</Typography.Title>
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
