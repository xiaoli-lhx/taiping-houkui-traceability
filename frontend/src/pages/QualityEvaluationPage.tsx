import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Row,
  Space,
  Statistic,
  Table,
  Typography,
} from 'antd'
import { Link, useSearchParams } from 'react-router-dom'

import { withPortalPrefix } from '../auth/roles'
import { useAuth } from '../auth/useAuth'
import { EmptyState } from '../components/EmptyState'
import { QualityRadarCard } from '../components/charts'
import { api } from '../lib/api'
import type { MetricInput, QualityEvaluationView } from '../types'

const metricTemplates: MetricInput[] = [
  { metric_name: 'appearance', score: 90, comment: '外形匀整' },
  { metric_name: 'color', score: 88, comment: '色泽翠绿' },
  { metric_name: 'aroma', score: 91, comment: '香气清雅' },
  { metric_name: 'taste', score: 89, comment: '滋味鲜爽' },
]

export function QualityEvaluationPage() {
  const { token, user } = useAuth()
  const [form] = Form.useForm()
  const [searchParams] = useSearchParams()
  const batchId = useMemo(() => searchParams.get('batchId') ?? '', [searchParams])

  const [result, setResult] = useState<QualityEvaluationView | null>(null)
  const [loadingLatest, setLoadingLatest] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    form.setFieldsValue({
      summary: '适合作为毕业设计前端联调演示评估记录。',
      metrics: metricTemplates,
    })
  }, [form])

  useEffect(() => {
    async function loadLatest() {
      if (!batchId) {
        return
      }
      setLoadingLatest(true)
      try {
        const latest = await api.getLatestQualityEvaluation(token, batchId)
        setResult(latest)
      } catch {
        setResult(null)
      } finally {
        setLoadingLatest(false)
      }
    }

    void loadLatest()
  }, [batchId, token])

  async function handleSubmit(values: { summary: string; metrics: MetricInput[] }) {
    setSubmitting(true)
    setError('')
    try {
      const created = await api.createQualityEvaluation(token, {
        batch_id: Number(batchId),
        rule_version: 'v1',
        summary: values.summary,
        metrics: values.metrics,
      })
      setResult(created)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '创建品质评估失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Typography.Title level={3} style={{ margin: 0 }}>
              品质辅助评估
            </Typography.Title>
            <Typography.Text type="secondary">
              基于外形、色泽、香气、滋味四项指标，自动生成综合得分与等级判定。
            </Typography.Text>
          </Col>
          <Col>
            <Button>
              <Link to={batchId ? withPortalPrefix(user, `/batches/${batchId}`) : withPortalPrefix(user, '/batches')}>
                返回批次详情
              </Link>
            </Button>
          </Col>
        </Row>
      </Card>

      {error ? <Alert showIcon type="error" message={error} /> : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={11}>
          <Card title="录入品质指标">
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Form.Item label="批次 ID">
                <Input value={batchId} disabled />
              </Form.Item>
              <Form.Item label="评估结论" name="summary">
                <Input.TextArea rows={4} />
              </Form.Item>

              <Form.List name="metrics">
                {(fields) => (
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {fields.map((field, index) => (
                      <Card key={field.key} size="small" title={metricTemplates[index]?.metric_name}>
                        <Form.Item
                          hidden
                          name={[field.name, 'metric_name']}
                          rules={[{ required: true, message: '指标名称不能为空' }]}
                        >
                          <Input />
                        </Form.Item>
                        <Form.Item
                          label="分值"
                          name={[field.name, 'score']}
                          rules={[{ required: true, message: '请输入分值' }]}
                        >
                          <InputNumber min={0} max={100} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item label="说明" name={[field.name, 'comment']}>
                          <Input />
                        </Form.Item>
                      </Card>
                    ))}
                  </Space>
                )}
              </Form.List>

              <Button type="primary" htmlType="submit" loading={submitting} block disabled={!batchId}>
                生成品质评估
              </Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} xl={13}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {result ? (
              <>
                <Card title="评估结果概览">
                  <Row gutter={16}>
                    <Col span={12}>
                      <Statistic title="综合得分" value={result.evaluation.total_score} precision={2} />
                    </Col>
                    <Col span={12}>
                      <Statistic title="等级判定" value={result.evaluation.grade} />
                    </Col>
                  </Row>
                  <Descriptions column={1} size="small" style={{ marginTop: 16 }}>
                    <Descriptions.Item label="规则版本">{result.evaluation.rule_version}</Descriptions.Item>
                    <Descriptions.Item label="评估结论">{result.evaluation.summary}</Descriptions.Item>
                  </Descriptions>
                </Card>

                <QualityRadarCard items={result.radar_data} />

                <Card title="指标明细">
                  <Table
                    rowKey="metric_name"
                    size="small"
                    pagination={false}
                    dataSource={result.radar_data}
                    columns={[
                      { title: '指标', dataIndex: 'metric_label', key: 'metric_label' },
                      { title: '分值', dataIndex: 'score', key: 'score' },
                      { title: '权重', dataIndex: 'weight', key: 'weight' },
                      { title: '加权分', dataIndex: 'weighted_score', key: 'weighted_score' },
                      { title: '说明', dataIndex: 'comment', key: 'comment', render: (value: string) => value || '-' },
                    ]}
                  />
                </Card>
              </>
            ) : (
              <Card title="最新评估结果">
                {loadingLatest ? (
                  <Typography.Text type="secondary">正在读取当前批次的最新评估结果...</Typography.Text>
                ) : (
                  <EmptyState description="当前批次暂无品质评估记录" />
                )}
              </Card>
            )}
          </Space>
        </Col>
      </Row>
    </Space>
  )
}
