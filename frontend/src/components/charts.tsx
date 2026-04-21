import { Card, Space, Tag, Typography } from 'antd'
import { Column, Line, Pie, Radar } from '@ant-design/plots'
import { QRCodeSVG } from 'qrcode.react'

import type {
  GradeDistributionItem,
  MetricTrendItem,
  ProductionDistributionItem,
  RadarItem,
} from '../types'

const chartTheme = {
  styleSheet: {
    brandColor: '#1677ff',
    paletteQualitative10: ['#1677ff', '#52c41a', '#faad14', '#eb2f96', '#13c2c2', '#722ed1'],
  },
}

export function QualityRadarCard({
  items,
  title = '品质雷达图',
}: {
  items: RadarItem[]
  title?: string
}) {
  const data = items.map((item) => ({
    metric: item.metric_label,
    score: item.score,
  }))

  return (
    <Card title={title}>
      <Radar
        theme={chartTheme}
        data={data}
        xField="metric"
        yField="score"
        meta={{ score: { min: 0, max: 100 } }}
        area={{ style: { fillOpacity: 0.2 } }}
        point={{ size: 4 }}
        height={320}
      />
    </Card>
  )
}

export function ProductionDistributionCard({
  items,
}: {
  items: ProductionDistributionItem[]
}) {
  return (
    <Card title="产量分布图">
      <Column
        theme={chartTheme}
        data={items}
        xField="origin"
        yField="total_quantity_kg"
        label={{ position: 'top' }}
        colorField="origin"
        axis={{ x: { labelAutoRotate: true } }}
        tooltip={{ items: [{ channel: 'y', name: '总重量(kg)' }] }}
        height={320}
      />
    </Card>
  )
}

export function GradeDistributionCard({
  items,
}: {
  items: GradeDistributionItem[]
}) {
  return (
    <Card title="品质等级占比图">
      <Pie
        theme={chartTheme}
        data={items}
        angleField="count"
        colorField="grade"
        innerRadius={0.6}
        label={{ text: 'grade', position: 'outside' }}
        tooltip={{ items: [{ channel: 'y', name: '数量' }] }}
        legend={{ position: 'bottom' }}
        height={320}
      />
    </Card>
  )
}

export function MetricTrendCard({
  items,
}: {
  items: MetricTrendItem[]
}) {
  return (
    <Card title="品质指标趋势图">
      <Line
        theme={chartTheme}
        data={items}
        xField="day"
        yField="average_score"
        colorField="metric_label"
        point={{ shapeField: 'circle', sizeField: 4 }}
        tooltip={{ items: [{ channel: 'y', name: '平均分' }] }}
        legend={{ position: 'bottom' }}
        height={340}
      />
    </Card>
  )
}

export function TraceCodeCard({
  queryUrl,
  traceCode,
  batchCode,
  latestGrade,
}: {
  queryUrl: string
  traceCode: string
  batchCode: string
  latestGrade?: string
}) {
  return (
    <Card title="溯源码卡片">
      <div className="trace-code-grid">
        <div>
          <Space direction="vertical" size={12}>
            <div>
              <Typography.Text type="secondary">批次码</Typography.Text>
              <Typography.Title level={4} style={{ margin: '4px 0 0' }}>
                {batchCode}
              </Typography.Title>
            </div>
            <div>
              <Typography.Text type="secondary">溯源码</Typography.Text>
              <Typography.Paragraph copyable={{ text: traceCode }} style={{ marginBottom: 0 }}>
                {traceCode}
              </Typography.Paragraph>
            </div>
            <div>
              <Typography.Text type="secondary">品质等级</Typography.Text>
              <div style={{ marginTop: 4 }}>
                <Tag color="processing">{latestGrade || '暂无等级'}</Tag>
              </div>
            </div>
            <Typography.Text type="secondary">
              扫码后将直接打开公开查询页，并自动带入对应的溯源码。
            </Typography.Text>
          </Space>
        </div>
        <div className="qrcode-box">
          <QRCodeSVG value={queryUrl} size={176} includeMargin />
        </div>
      </div>
    </Card>
  )
}
