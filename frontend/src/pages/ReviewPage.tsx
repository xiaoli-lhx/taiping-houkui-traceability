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
  Tag,
  Timeline,
  Typography,
} from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import { Link, useSearchParams } from 'react-router-dom'

import { withPortalPrefix } from '../auth/roles'
import { useAuth } from '../auth/useAuth'
import { EmptyState } from '../components/EmptyState'
import { api } from '../lib/api'
import { formatDateTime, getAuditStatusMeta, getBatchStatusMeta } from '../lib/display'
import type { AuditCreateRequest, AuditRecord, TeaBatch } from '../types'

const initialForm: AuditCreateRequest = {
  action: 'review',
  status: 'approved',
  comment: '',
}

export function ReviewPage() {
  const { token, user } = useAuth()
  const [searchParams] = useSearchParams()
  const [form] = Form.useForm()
  const presetBatchId = searchParams.get('batchId') ?? ''

  const [batches, setBatches] = useState<TeaBatch[]>([])
  const [selectedBatchId, setSelectedBatchId] = useState(presetBatchId)
  const [selectedBatch, setSelectedBatch] = useState<TeaBatch | null>(null)
  const [audits, setAudits] = useState<AuditRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
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

    setLoading(true)
    setError('')
    try {
      const [batch, auditList] = await Promise.all([
        api.getBatch(token, selectedBatchId),
        api.getAudits(token, selectedBatchId),
      ])
      setSelectedBatch(batch)
      setAudits(auditList)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '加载审核数据失败')
    } finally {
      setLoading(false)
    }
  }, [selectedBatchId, token])

  useEffect(() => {
    void loadBatches()
  }, [loadBatches])

  useEffect(() => {
    void loadSelectedBatch()
  }, [loadSelectedBatch])

  useEffect(() => {
    form.setFieldsValue(initialForm)
  }, [form])

  async function handleSubmit(values: AuditCreateRequest) {
    if (!selectedBatchId) {
      return
    }

    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      await api.createAudit(token, selectedBatchId, values)
      setSuccess('审核记录已提交，批次审核状态已更新。')
      form.resetFields()
      setDrawerOpen(false)
      await loadSelectedBatch()
      await loadBatches()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '提交审核失败')
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
        <Typography.Text type="secondary">
          监管方可在此查看批次审核状态、阶段信息和品质评估结果，并提交审核记录。
        </Typography.Text>
      </Card>

      {error ? <Alert showIcon type="error" message={error} /> : null}
      {success ? <Alert showIcon type="success" message={success} /> : null}

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
                <Button type="primary" disabled={!selectedBatch} onClick={() => setDrawerOpen(true)}>
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
                  <Descriptions.Item label="最新等级">{selectedBatch.latest_grade || '暂无'}</Descriptions.Item>
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

      <Drawer title="提交审核记录" width={480} open={drawerOpen} onClose={() => setDrawerOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical" initialValues={initialForm} onFinish={handleSubmit}>
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
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              提交审核
            </Button>
          </Space>
        </Form>
      </Drawer>
    </Space>
  )
}
