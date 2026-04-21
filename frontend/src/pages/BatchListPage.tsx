import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd'
import { EyeOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'

import { hasRole, withPortalPrefix } from '../auth/roles'
import { useAuth } from '../auth/useAuth'
import { EmptyState } from '../components/EmptyState'
import { api } from '../lib/api'
import { getAuditStatusMeta, getBatchStatusMeta } from '../lib/display'
import type { TeaBatch } from '../types'

const initialForm = {
  batch_code: '',
  trace_code: '',
  product_code: '',
  tea_name: '太平猴魁',
  tea_type: '绿茶',
  origin: '安徽省黄山市黄山区',
  farm_name: '毕业设计演示茶园',
  enterprise_name: '黄山猴魁茶业有限公司',
  quantity_kg: 50,
  harvest_date: new Date().toISOString().slice(0, 10),
  packaging_date: new Date().toISOString().slice(0, 10),
  status: 'processing',
  public_visible: true,
  notes: '',
}

export function BatchListPage() {
  const { token, user } = useAuth()
  const [form] = Form.useForm()
  const [searchForm] = Form.useForm()
  const [batches, setBatches] = useState<TeaBatch[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const canCreateBatch = hasRole(user, 'enterprise')

  const loadBatches = useCallback(
    async (values?: { keyword?: string; status?: string; audit_status?: string }) => {
      setLoading(true)
      setError('')
      try {
        const result = await api.getBatches(token, {
          keyword: values?.keyword || '',
          status: values?.status || '',
          auditStatus: values?.audit_status || '',
          pageSize: 100,
        })
        setBatches(result.items)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '加载批次列表失败')
      } finally {
        setLoading(false)
      }
    },
    [token],
  )

  useEffect(() => {
    void loadBatches()
  }, [loadBatches])

  async function handleCreateBatch(values: typeof initialForm) {
    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
      const payload = {
        ...values,
        batch_code: values.batch_code || `HKWEB-${stamp}`,
        trace_code: values.trace_code || `TRACE-HKWEB-${stamp}`,
        product_code: values.product_code || `PROD-HKWEB-${stamp}`,
      }
      const created = await api.createBatch(token, payload)
      setSuccess(`批次 ${created.batch_code} 创建成功`)
      form.setFieldsValue(initialForm)
      setDrawerOpen(false)
      await loadBatches(searchForm.getFieldsValue())
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '创建批次失败')
    } finally {
      setSubmitting(false)
    }
  }

  const columns = useMemo(
    () => [
      {
        title: '批次码',
        dataIndex: 'batch_code',
        key: 'batch_code',
        render: (value: string, record: TeaBatch) => (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{value}</Typography.Text>
            <Typography.Text type="secondary">{record.trace_code}</Typography.Text>
          </Space>
        ),
      },
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
      {
        title: '最新等级',
        dataIndex: 'latest_grade',
        key: 'latest_grade',
        render: (value: string) => <Tag>{value || '暂无'}</Tag>,
      },
      {
        title: '操作',
        key: 'action',
        render: (_: unknown, record: TeaBatch) => (
          <Button type="link" icon={<EyeOutlined />}>
            <Link to={withPortalPrefix(user, `/batches/${record.id}`)}>查看详情</Link>
          </Button>
        ),
      },
    ],
    [user],
  )

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Typography.Title level={3} style={{ margin: 0 }}>
              茶叶批次管理
            </Typography.Title>
            <Typography.Text type="secondary">
              企业端可创建批次，茶农端可查看批次并在详情页补录阶段信息。
            </Typography.Text>
          </Col>
          <Col>
            {canCreateBatch ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerOpen(true)}>
                新建批次
              </Button>
            ) : (
              <Tag color="gold">茶农角色无批次创建权限</Tag>
            )}
          </Col>
        </Row>
      </Card>

      {error ? <Alert showIcon type="error" message={error} /> : null}
      {success ? <Alert showIcon type="success" message={success} /> : null}

      <Card title="筛选条件">
        <Form
          form={searchForm}
          layout="inline"
          onFinish={(values) => {
            void loadBatches(values)
          }}
        >
          <Form.Item name="keyword">
            <Input placeholder="按批次码/溯源码/产品编号搜索" allowClear style={{ width: 280 }} />
          </Form.Item>
          <Form.Item name="status">
            <Select
              placeholder="业务状态"
              allowClear
              options={[
                { label: '草稿', value: 'draft' },
                { label: '处理中', value: 'processing' },
                { label: '已完成', value: 'completed' },
              ]}
              style={{ width: 160 }}
            />
          </Form.Item>
          <Form.Item name="audit_status">
            <Select
              placeholder="审核状态"
              allowClear
              options={[
                { label: '待审核', value: 'pending' },
                { label: '已通过', value: 'approved' },
                { label: '已驳回', value: 'rejected' },
              ]}
              style={{ width: 160 }}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
              查询
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="批次列表">
        <Table<TeaBatch>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={batches}
          locale={{ emptyText: <EmptyState description="暂无批次数据" /> }}
          pagination={{ pageSize: 8, showSizeChanger: false }}
        />
      </Card>

      <Drawer
        title="新建茶叶批次"
        width={520}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={initialForm} onFinish={handleCreateBatch}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="批次码" name="batch_code">
                <Input placeholder="留空自动生成" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="溯源码" name="trace_code">
                <Input placeholder="留空自动生成" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="产品编号" name="product_code">
                <Input placeholder="留空自动生成" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="茶名" name="tea_name" rules={[{ required: true, message: '请输入茶名' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="茶类" name="tea_type">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="批次重量(kg)" name="quantity_kg">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="产地" name="origin" rules={[{ required: true, message: '请输入产地' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="茶园主体" name="farm_name" rules={[{ required: true, message: '请输入茶园主体' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="企业主体" name="enterprise_name">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="采摘日期" name="harvest_date">
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="包装日期" name="packaging_date">
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="批次状态" name="status">
                <Select
                  options={[
                    { label: '草稿', value: 'draft' },
                    { label: '处理中', value: 'processing' },
                    { label: '已完成', value: 'completed' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="是否公开" name="public_visible" valuePropName="checked">
                <Switch checkedChildren="公开" unCheckedChildren="隐藏" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="备注" name="notes">
                <Input.TextArea rows={4} />
              </Form.Item>
            </Col>
          </Row>
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              创建批次
            </Button>
          </Space>
        </Form>
      </Drawer>
    </Space>
  )
}
