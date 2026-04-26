import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Form,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
} from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import { Link, useSearchParams } from 'react-router-dom'

import { getRoleLabel, withPortalPrefix } from '../auth/roles'
import { useAuth } from '../auth/useAuth'
import { EmptyState } from '../components/EmptyState'
import { api } from '../lib/api'
import {
  formatDateTime,
  getAuditStatusMeta,
  getBatchStatusMeta,
  getRectificationStatusMeta,
} from '../lib/display'
import type { AuditCreateRequest, AuditRecord, RectificationTask, TeaBatch } from '../types'

const initialAuditForm: AuditCreateRequest = {
  action: 'review',
  status: 'approved',
  comment: '',
}

export function ReviewPage() {
  const { token, user } = useAuth()
  const [searchParams] = useSearchParams()
  const presetBatchId = searchParams.get('batchId') ?? ''
  const [auditForm] = Form.useForm<AuditCreateRequest>()
  const [reviewForm] = Form.useForm<{ status: string; reviewer_comment: string }>()

  const [batches, setBatches] = useState<TeaBatch[]>([])
  const [selectedBatchId, setSelectedBatchId] = useState(presetBatchId)
  const [selectedBatch, setSelectedBatch] = useState<TeaBatch | null>(null)
  const [audits, setAudits] = useState<AuditRecord[]>([])
  const [rectifications, setRectifications] = useState<RectificationTask[]>([])
  const [selectedRectification, setSelectedRectification] = useState<RectificationTask | null>(null)
  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false)
  const [rectificationDrawerOpen, setRectificationDrawerOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const selectedStageOptions = useMemo(
    () => selectedBatch?.stage_records?.map((item) => ({ label: item.title, value: item.id })) ?? [],
    [selectedBatch],
  )

  const loadBatches = useCallback(async () => {
    const result = await api.getBatches(token, { pageSize: 100 })
    setBatches(result.items)

    const candidateId = presetBatchId || result.items[0]?.id?.toString() || ''
    if (!selectedBatchId && candidateId) {
      setSelectedBatchId(candidateId)
    }
  }, [presetBatchId, selectedBatchId, token])

  const loadSelectedBatch = useCallback(async () => {
    if (!selectedBatchId) {
      setSelectedBatch(null)
      setAudits([])
      return
    }

    try {
      const [batch, auditList] = await Promise.all([api.getBatch(token, selectedBatchId), api.getAudits(token, selectedBatchId)])
      setSelectedBatch(batch)
      setAudits(auditList)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '加载审核数据失败')
    }
  }, [selectedBatchId, token])

  const loadRectifications = useCallback(async () => {
    try {
      const result = await api.getRectifications(token, { status: 'submitted' })
      setRectifications(result)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '加载整改复审列表失败')
    }
  }, [token])

  const reloadAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      await Promise.all([loadBatches(), loadSelectedBatch(), loadRectifications()])
    } finally {
      setLoading(false)
    }
  }, [loadBatches, loadRectifications, loadSelectedBatch])

  useEffect(() => {
    auditForm.setFieldsValue(initialAuditForm)
    reviewForm.setFieldsValue({ status: 'approved', reviewer_comment: '' })
  }, [auditForm, reviewForm])

  useEffect(() => {
    void reloadAll()
  }, [reloadAll])

  async function handleAuditSubmit(values: AuditCreateRequest) {
    if (!selectedBatchId) {
      return
    }

    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      await api.createAudit(token, selectedBatchId, values)
      setSuccess('审核记录已提交，批次审核状态已更新。')
      auditForm.resetFields()
      setAuditDrawerOpen(false)
      await reloadAll()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '提交审核失败')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRectificationReview(values: { status: string; reviewer_comment: string }) {
    if (!selectedRectification) {
      return
    }

    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      await api.reviewRectification(token, selectedRectification.id, values)
      setSuccess('整改复审结果已提交。')
      setRectificationDrawerOpen(false)
      setSelectedRectification(null)
      await reloadAll()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '提交整改复审失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Typography.Title level={3} style={{ margin: 0 }}>
          监管审核中心
        </Typography.Title>
        <Typography.Text type="secondary">监管方可在此执行批次审核与整改复审，统一查看批次状态和复审任务。</Typography.Text>
      </Card>

      {error ? <Alert showIcon type="error" message={error} /> : null}
      {success ? <Alert showIcon type="success" message={success} /> : null}

      <Tabs
        items={[
          {
            key: 'audits',
            label: '批次审核',
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} xl={11}>
                  <Card title="批次审核列表">
                    <Table<TeaBatch>
                      rowKey="id"
                      loading={loading}
                      dataSource={batches}
                      rowSelection={{
                        type: 'radio',
                        selectedRowKeys: selectedBatchId ? [Number(selectedBatchId)] : [],
                        onChange: (keys) => setSelectedBatchId(String(keys[0])),
                      }}
                      pagination={{ pageSize: 6, showSizeChanger: false }}
                      locale={{ emptyText: <EmptyState description="暂无待审核批次" /> }}
                      columns={[
                        { title: '批次码', dataIndex: 'batch_code', key: 'batch_code' },
                        { title: '产地', dataIndex: 'origin', key: 'origin' },
                        {
                          title: '业务状态',
                          dataIndex: 'status',
                          key: 'status',
                          render: (value: string) => {
                            const meta = getBatchStatusMeta(value)
                            return <Tag color={meta.color}>{meta.text}</Tag>
                          },
                        },
                        {
                          title: '审核状态',
                          dataIndex: 'audit_status',
                          key: 'audit_status',
                          render: (value: string) => {
                            const meta = getAuditStatusMeta(value)
                            return <Tag color={meta.color}>{meta.text}</Tag>
                          },
                        },
                      ]}
                    />
                  </Card>
                </Col>

                <Col xs={24} xl={13}>
                  <Card
                    title={selectedBatch ? `审核详情：${selectedBatch.batch_code}` : '审核详情'}
                    extra={
                      <Space>
                        {selectedBatchId ? (
                          <Button icon={<EyeOutlined />}>
                            <Link to={withPortalPrefix(user, `/batches/${selectedBatchId}`)}>查看批次详情</Link>
                          </Button>
                        ) : null}
                        <Button type="primary" disabled={!selectedBatch} onClick={() => setAuditDrawerOpen(true)}>
                          提交审核
                        </Button>
                      </Space>
                    }
                  >
                    {selectedBatch ? (
                      <Space direction="vertical" size={16} style={{ width: '100%' }}>
                        <Descriptions bordered size="small" column={2}>
                          <Descriptions.Item label="批次码">{selectedBatch.batch_code}</Descriptions.Item>
                          <Descriptions.Item label="溯源码">{selectedBatch.trace_code}</Descriptions.Item>
                          <Descriptions.Item label="业务状态">
                            <Tag color={getBatchStatusMeta(selectedBatch.status).color}>
                              {getBatchStatusMeta(selectedBatch.status).text}
                            </Tag>
                          </Descriptions.Item>
                          <Descriptions.Item label="审核状态">
                            <Tag color={getAuditStatusMeta(selectedBatch.audit_status).color}>
                              {getAuditStatusMeta(selectedBatch.audit_status).text}
                            </Tag>
                          </Descriptions.Item>
                          <Descriptions.Item label="整改状态">
                            <Tag color={getRectificationStatusMeta(selectedBatch.rectification_status).color}>
                              {getRectificationStatusMeta(selectedBatch.rectification_status).text}
                            </Tag>
                          </Descriptions.Item>
                          <Descriptions.Item label="公开查询">{selectedBatch.public_visible ? '是' : '否'}</Descriptions.Item>
                        </Descriptions>

                        <Card size="small" title="阶段链路摘要">
                          {selectedBatch.stage_records?.length ? (
                            <Timeline
                              items={selectedBatch.stage_records.map((item) => ({
                                children: `${item.title} | ${formatDateTime(item.occurred_at)}`,
                              }))}
                            />
                          ) : (
                            <EmptyState description="暂无阶段记录" />
                          )}
                        </Card>

                        <Card size="small" title="审核历史">
                          <Table<AuditRecord>
                            rowKey="id"
                            size="small"
                            pagination={false}
                            dataSource={audits}
                            locale={{ emptyText: <EmptyState description="暂无审核记录" /> }}
                            columns={[
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
                            ]}
                          />
                        </Card>
                      </Space>
                    ) : (
                      <EmptyState description="请先从左侧选择一个批次" />
                    )}
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'rectifications',
            label: '整改复审',
            children: (
              <Card title="待复审整改任务">
                <Table<RectificationTask>
                  rowKey="id"
                  loading={loading}
                  dataSource={rectifications}
                  pagination={{ pageSize: 8 }}
                  locale={{ emptyText: <EmptyState description="暂无待复审整改任务" /> }}
                  columns={[
                    {
                      title: '批次信息',
                      key: 'batch',
                      render: (_: unknown, record: RectificationTask) => (
                        <Space direction="vertical" size={2}>
                          <Typography.Text strong>{record.batch?.batch_code || `批次 #${record.batch_id}`}</Typography.Text>
                          <Typography.Text type="secondary">{record.batch?.trace_code || '-'}</Typography.Text>
                        </Space>
                      ),
                    },
                    {
                      title: '责任角色',
                      dataIndex: 'responsible_role',
                      key: 'responsible_role',
                      render: (value: string) => <Tag>{getRoleLabel(value)}</Tag>,
                    },
                    {
                      title: '整改状态',
                      dataIndex: 'status',
                      key: 'status',
                      render: (value: string) => {
                        const meta = getRectificationStatusMeta(value)
                        return <Tag color={meta.color}>{meta.text}</Tag>
                      },
                    },
                    { title: '问题摘要', dataIndex: 'issue_summary', key: 'issue_summary' },
                    { title: '整改说明', dataIndex: 'response_comment', key: 'response_comment', render: (value: string) => value || '-' },
                    { title: '提交时间', dataIndex: 'submitted_at', key: 'submitted_at', render: formatDateTime },
                    {
                      title: '操作',
                      key: 'action',
                      render: (_: unknown, record: RectificationTask) => (
                        <Space wrap>
                          <Link to={withPortalPrefix(user, `/batches/${record.batch_id}`)}>查看批次</Link>
                          <Button
                            size="small"
                            type="primary"
                            ghost
                            onClick={() => {
                              setSelectedRectification(record)
                              reviewForm.setFieldsValue({ status: 'approved', reviewer_comment: record.reviewer_comment || '' })
                              setRectificationDrawerOpen(true)
                            }}
                          >
                            复审整改
                          </Button>
                        </Space>
                      ),
                    },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />

      <Drawer title="提交审核记录" width={480} open={auditDrawerOpen} onClose={() => setAuditDrawerOpen(false)} destroyOnClose>
        <Form form={auditForm} layout="vertical" initialValues={initialAuditForm} onFinish={handleAuditSubmit}>
          <Form.Item label="审核动作" name="action" rules={[{ required: true, message: '请输入审核动作' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="审核状态" name="status" rules={[{ required: true, message: '请选择审核状态' }]}>
            <Select
              options={[
                { label: '已通过', value: 'approved' },
                { label: '已驳回', value: 'rejected' },
                { label: '待审核', value: 'pending' },
              ]}
            />
          </Form.Item>
          <Form.Item label="关联阶段" name="stage_record_id">
            <Select allowClear placeholder="批次整体审核" options={selectedStageOptions} />
          </Form.Item>
          <Form.Item label="审核意见" name="comment">
            <Input.TextArea rows={4} placeholder="例如：批次信息完整，允许公开查询。" />
          </Form.Item>
          <Space>
            <Button onClick={() => setAuditDrawerOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              提交审核
            </Button>
          </Space>
        </Form>
      </Drawer>

      <Drawer
        title="整改复审"
        width={520}
        open={rectificationDrawerOpen}
        onClose={() => {
          setRectificationDrawerOpen(false)
          setSelectedRectification(null)
        }}
        destroyOnClose
      >
        {selectedRectification ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card size="small">
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Typography.Text strong>{selectedRectification.batch?.batch_code || `批次 #${selectedRectification.batch_id}`}</Typography.Text>
                <Typography.Text type="secondary">问题摘要：{selectedRectification.issue_summary || '-'}</Typography.Text>
                <Typography.Paragraph style={{ marginBottom: 0 }}>
                  整改说明：{selectedRectification.response_comment || '-'}
                </Typography.Paragraph>
              </Space>
            </Card>
            <Form form={reviewForm} layout="vertical" onFinish={handleRectificationReview}>
              <Form.Item label="复审结果" name="status" rules={[{ required: true, message: '请选择复审结果' }]}>
                <Select
                  options={[
                    { label: '通过整改', value: 'approved' },
                    { label: '驳回整改', value: 'rejected' },
                  ]}
                />
              </Form.Item>
              <Form.Item label="复审意见" name="reviewer_comment">
                <Input.TextArea rows={5} placeholder="填写复审意见或再次整改要求" />
              </Form.Item>
              <Space>
                <Button onClick={() => setRectificationDrawerOpen(false)}>取消</Button>
                <Button type="primary" htmlType="submit" loading={submitting}>
                  提交复审
                </Button>
              </Space>
            </Form>
          </Space>
        ) : null}
      </Drawer>
    </Space>
  )
}
