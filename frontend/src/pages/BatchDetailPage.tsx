import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Timeline,
  Typography,
} from 'antd'
import { AuditOutlined, EditOutlined, PlusOutlined, TrophyOutlined } from '@ant-design/icons'
import { Link, useParams } from 'react-router-dom'

import { hasRole, withPortalPrefix } from '../auth/roles'
import { useAuth } from '../auth/useAuth'
import { EmptyState } from '../components/EmptyState'
import { api } from '../lib/api'
import { formatDateTime, getAuditStatusMeta, getBatchStatusMeta, getStageLabel } from '../lib/display'
import type { AuditRecord, TeaBatch } from '../types'

const initialStageForm = {
  stage: 'processing',
  sequence: 1,
  title: '',
  description: '',
  location: '',
  occurred_at: new Date().toISOString().slice(0, 16),
}

export function BatchDetailPage() {
  const { id = '' } = useParams()
  const { token, user } = useAuth()
  const [form] = Form.useForm()

  const [batch, setBatch] = useState<TeaBatch | null>(null)
  const [audits, setAudits] = useState<AuditRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadDetail = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [batchResult, auditResult] = await Promise.all([api.getBatch(token, id), api.getAudits(token, id)])
      setBatch(batchResult)
      setAudits(auditResult)
      form.setFieldsValue({
        ...initialStageForm,
        sequence: (batchResult.stage_records?.length ?? 0) + 1,
      })
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '加载批次详情失败')
    } finally {
      setLoading(false)
    }
  }, [form, id, token])

  useEffect(() => {
    void loadDetail()
  }, [loadDetail])

  async function handleAddStage(values: typeof initialStageForm) {
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      await api.createStage(token, id, {
        ...values,
        occurred_at: new Date(values.occurred_at).toISOString(),
      })
      setSuccess('阶段记录已新增')
      setDrawerOpen(false)
      form.resetFields()
      await loadDetail()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '新增阶段记录失败')
    } finally {
      setSubmitting(false)
    }
  }

  const latestEvaluation = batch?.quality_evaluations?.[0]
  const canEditStage = hasRole(user, 'enterprise') || hasRole(user, 'farmer')
  const canCreateQuality = hasRole(user, 'enterprise') || hasRole(user, 'regulator')
  const canReview = hasRole(user, 'regulator')
  const backPath = hasRole(user, 'regulator') ? '/regulator/reviews' : withPortalPrefix(user, '/batches')

  const auditColumns = useMemo(
    () => [
      { title: '审核人', dataIndex: 'reviewer_name', key: 'reviewer_name' },
      { title: '动作', dataIndex: 'action', key: 'action' },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (value: string) => {
          const meta = getAuditStatusMeta(value)
          return <Tag color={meta.color}>{meta.text}</Tag>
        },
      },
      { title: '意见', dataIndex: 'comment', key: 'comment', render: (value: string) => value || '-' },
      { title: '时间', dataIndex: 'reviewed_at', key: 'reviewed_at', render: formatDateTime },
    ],
    [],
  )

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {error ? <Alert showIcon type="error" message={error} /> : null}
      {success ? <Alert showIcon type="success" message={success} /> : null}

      <Card loading={loading}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {batch?.batch_code ?? '批次详情'}
            </Typography.Title>
            <Space size={8} wrap style={{ marginTop: 8 }}>
              <Tag color={getBatchStatusMeta(batch?.status).color}>{getBatchStatusMeta(batch?.status).text}</Tag>
              <Tag color={getAuditStatusMeta(batch?.audit_status).color}>
                {getAuditStatusMeta(batch?.audit_status).text}
              </Tag>
              <Tag>{batch?.latest_grade || '暂无等级'}</Tag>
            </Space>
          </Col>
          <Col>
            <Space wrap>
              <Button icon={<EditOutlined />}>
                <Link to={backPath}>返回列表</Link>
              </Button>
              {canCreateQuality ? (
                <Button type="primary" icon={<TrophyOutlined />}>
                  <Link to={withPortalPrefix(user, `/quality/new?batchId=${id}`)}>新增品质评估</Link>
                </Button>
              ) : null}
              {canReview ? (
                <Button icon={<AuditOutlined />}>
                  <Link to={withPortalPrefix(user, `/reviews?batchId=${id}`)}>进入审核页</Link>
                </Button>
              ) : null}
              {canEditStage ? (
                <Button type="primary" ghost icon={<PlusOutlined />} onClick={() => setDrawerOpen(true)}>
                  新增阶段
                </Button>
              ) : null}
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card title="批次基础信息" loading={loading}>
            {batch ? (
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="溯源码">{batch.trace_code}</Descriptions.Item>
                <Descriptions.Item label="产品编号">{batch.product_code}</Descriptions.Item>
                <Descriptions.Item label="茶名">{batch.tea_name}</Descriptions.Item>
                <Descriptions.Item label="茶类">{batch.tea_type}</Descriptions.Item>
                <Descriptions.Item label="产地">{batch.origin}</Descriptions.Item>
                <Descriptions.Item label="批次重量">{batch.quantity_kg} kg</Descriptions.Item>
                <Descriptions.Item label="茶园主体">{batch.farm_name}</Descriptions.Item>
                <Descriptions.Item label="企业主体">{batch.enterprise_name}</Descriptions.Item>
                <Descriptions.Item label="采摘日期">{formatDateTime(batch.harvest_date)}</Descriptions.Item>
                <Descriptions.Item label="包装日期">{formatDateTime(batch.packaging_date)}</Descriptions.Item>
                <Descriptions.Item label="公开查询">{batch.public_visible ? '是' : '否'}</Descriptions.Item>
                <Descriptions.Item label="备注" span={2}>
                  {batch.notes || '-'}
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <EmptyState description="暂无批次信息" />
            )}
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card title="品质概览" loading={loading}>
            {latestEvaluation ? (
              <Descriptions column={1} size="small">
                <Descriptions.Item label="综合得分">{latestEvaluation.total_score}</Descriptions.Item>
                <Descriptions.Item label="等级">{latestEvaluation.grade}</Descriptions.Item>
                <Descriptions.Item label="评估时间">{formatDateTime(latestEvaluation.evaluated_at)}</Descriptions.Item>
                <Descriptions.Item label="评估结论">{latestEvaluation.summary}</Descriptions.Item>
              </Descriptions>
            ) : (
              <Empty description="当前批次还没有品质评估记录" />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card title="溯源阶段链路" loading={loading}>
            {batch?.stage_records?.length ? (
              <Timeline
                items={batch.stage_records.map((record) => ({
                  color: 'blue',
                  children: (
                    <div>
                      <Space wrap>
                        <Typography.Text strong>{record.title}</Typography.Text>
                        <Tag>{getStageLabel(record.stage)}</Tag>
                      </Space>
                      <div style={{ marginTop: 6 }}>
                        <Typography.Text>{record.description}</Typography.Text>
                      </div>
                      <Typography.Text type="secondary">
                        {record.location} | {record.operator_name} | {formatDateTime(record.occurred_at)}
                      </Typography.Text>
                    </div>
                  ),
                }))}
              />
            ) : (
              <Empty description="当前还没有阶段记录" />
            )}
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card title="审核记录" loading={loading}>
            <Table<AuditRecord>
              rowKey="id"
              size="small"
              columns={auditColumns}
              dataSource={audits}
              pagination={false}
              locale={{ emptyText: <EmptyState description="暂无审核记录" /> }}
            />
          </Card>
        </Col>
      </Row>

      <Drawer
        title="新增溯源阶段"
        width={480}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
      >
        {canEditStage ? (
          <Form form={form} layout="vertical" initialValues={initialStageForm} onFinish={handleAddStage}>
            <Form.Item label="阶段类型" name="stage" rules={[{ required: true, message: '请选择阶段类型' }]}>
              <Select
                options={[
                  { label: '种植', value: 'planting' },
                  { label: '采摘', value: 'picking' },
                  { label: '加工', value: 'processing' },
                  { label: '包装', value: 'packaging' },
                  { label: '流通', value: 'distribution' },
                ]}
              />
            </Form.Item>
            <Form.Item label="顺序号" name="sequence">
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入标题' }]}>
              <Input />
            </Form.Item>
            <Form.Item label="地点" name="location">
              <Input />
            </Form.Item>
            <Form.Item label="描述" name="description">
              <Input.TextArea rows={4} />
            </Form.Item>
            <Form.Item label="发生时间" name="occurred_at">
              <Input type="datetime-local" />
            </Form.Item>
            <Space>
              <Button onClick={() => setDrawerOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                提交阶段记录
              </Button>
            </Space>
          </Form>
        ) : (
          <EmptyState description="当前角色无新增阶段权限" />
        )}
      </Drawer>
    </Space>
  )
}
