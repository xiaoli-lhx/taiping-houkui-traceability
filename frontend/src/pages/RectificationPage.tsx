import { useCallback, useEffect, useMemo, useState } from 'react'
import { EditOutlined, ReloadOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Drawer, Form, Input, Select, Space, Table, Tag, Typography } from 'antd'
import { Link } from 'react-router-dom'

import { getRoleLabel, withPortalPrefix } from '../auth/roles'
import { useAuth } from '../auth/useAuth'
import { EmptyState } from '../components/EmptyState'
import { api } from '../lib/api'
import { formatDateTime, getRectificationStatusMeta } from '../lib/display'
import type { RectificationTask } from '../types'

export function RectificationPage() {
  const { token, user } = useAuth()
  const [items, setItems] = useState<RectificationTask[]>([])
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedTask, setSelectedTask] = useState<RectificationTask | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form] = Form.useForm<{ response_comment: string }>()

  const loadTasks = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await api.getRectifications(token, { status: selectedStatus })
      setItems(result)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '加载整改任务失败')
    } finally {
      setLoading(false)
    }
  }, [selectedStatus, token])

  useEffect(() => {
    void loadTasks()
  }, [loadTasks])

  const columns = useMemo(
    () => [
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
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (value: string) => {
          const meta = getRectificationStatusMeta(value)
          return <Tag color={meta.color}>{meta.text}</Tag>
        },
      },
      {
        title: '问题摘要',
        dataIndex: 'issue_summary',
        key: 'issue_summary',
        render: (value: string) => (
          <Typography.Paragraph ellipsis={{ rows: 2, expandable: false }} style={{ marginBottom: 0 }}>
            {value || '-'}
          </Typography.Paragraph>
        ),
      },
      {
        title: '更新时间',
        dataIndex: 'updated_at',
        key: 'updated_at',
        render: formatDateTime,
      },
      {
        title: '操作',
        key: 'action',
        render: (_: unknown, record: RectificationTask) => (
          <Space wrap>
            <Link to={withPortalPrefix(user, `/batches/${record.batch_id}`)}>查看批次</Link>
            {record.status === 'pending_submission' ? (
              <Button
                size="small"
                type="primary"
                ghost
                icon={<EditOutlined />}
                onClick={() => {
                  setSelectedTask(record)
                  form.setFieldsValue({ response_comment: record.response_comment || '' })
                  setDrawerOpen(true)
                }}
              >
                提交整改
              </Button>
            ) : null}
          </Space>
        ),
      },
    ],
    [form, user],
  )

  async function handleSubmit(values: { response_comment: string }) {
    if (!selectedTask) {
      return
    }

    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      await api.submitRectification(token, selectedTask.id, values)
      setSuccess('整改说明已提交，批次已进入待复审状态。')
      setDrawerOpen(false)
      setSelectedTask(null)
      await loadTasks()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '提交整改失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Typography.Title level={3} style={{ margin: 0 }}>
          整改任务
        </Typography.Title>
        <Typography.Text type="secondary">查看监管驳回后分配到当前角色的整改任务，并提交整改说明。</Typography.Text>
      </Card>

      {error ? <Alert showIcon type="error" message={error} /> : null}
      {success ? <Alert showIcon type="success" message={success} /> : null}

      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Select
            allowClear
            placeholder="按整改状态筛选"
            style={{ width: 180 }}
            value={selectedStatus || undefined}
            options={[
              { label: '待整改', value: 'pending_submission' },
              { label: '待复审', value: 'submitted' },
              { label: '已完成', value: 'completed' },
            ]}
            onChange={(value) => setSelectedStatus(value || '')}
          />
          <Button icon={<ReloadOutlined />} onClick={() => void loadTasks()}>
            刷新
          </Button>
        </Space>

        <Table<RectificationTask>
          rowKey="id"
          loading={loading}
          dataSource={items}
          columns={columns}
          pagination={{ pageSize: 8 }}
          locale={{ emptyText: <EmptyState description="暂无整改任务" /> }}
        />
      </Card>

      <Drawer
        title="提交整改说明"
        width={520}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setSelectedTask(null)
        }}
        destroyOnClose
      >
        {selectedTask ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card size="small">
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Typography.Text strong>{selectedTask.batch?.batch_code || `批次 #${selectedTask.batch_id}`}</Typography.Text>
                <Typography.Text type="secondary">问题摘要：{selectedTask.issue_summary || '-'}</Typography.Text>
                <Typography.Paragraph style={{ marginBottom: 0 }}>
                  要求动作：{selectedTask.required_action || '-'}
                </Typography.Paragraph>
              </Space>
            </Card>
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Form.Item label="整改说明" name="response_comment" rules={[{ required: true, message: '请输入整改说明' }]}>
                <Input.TextArea rows={6} placeholder="说明已完成的整改动作、补充的数据或复核依据" />
              </Form.Item>
              <Space>
                <Button onClick={() => setDrawerOpen(false)}>取消</Button>
                <Button type="primary" htmlType="submit" loading={submitting}>
                  提交整改
                </Button>
              </Space>
            </Form>
          </Space>
        ) : null}
      </Drawer>
    </Space>
  )
}
