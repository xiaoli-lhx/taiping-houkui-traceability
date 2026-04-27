import { useCallback, useEffect, useMemo, useState } from 'react'
import { EyeOutlined, PlusOutlined, SearchOutlined, TagsOutlined } from '@ant-design/icons'
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
  const isFarmer = hasRole(user, 'farmer')

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

  const batchStats = useMemo(
    () => [
      { label: '批次总数', value: batches.length, tone: 'primary' as const },
      { label: '处理中', value: batches.filter((item) => item.status === 'processing').length, tone: 'warning' as const },
      { label: '已完成', value: batches.filter((item) => item.status === 'completed').length, tone: 'success' as const },
      { label: '待审核', value: batches.filter((item) => item.audit_status === 'pending').length, tone: 'danger' as const },
    ],
    [batches],
  )

  const columns = useMemo(
    () => [
      {
        title: '批次信息',
        dataIndex: 'batch_code',
        key: 'batch_code',
        render: (value: string, record: TeaBatch) => (
          <Space direction="vertical" size={2}>
            <Typography.Text strong>{value}</Typography.Text>
            <Typography.Text type="secondary">{record.trace_code}</Typography.Text>
          </Space>
        ),
      },
      {
        title: '产地 / 主体',
        key: 'origin',
        render: (_: unknown, record: TeaBatch) => (
          <Space direction="vertical" size={2}>
            <Typography.Text>{record.origin}</Typography.Text>
            <Typography.Text type="secondary">{record.farm_name || record.enterprise_name || '-'}</Typography.Text>
          </Space>
        ),
      },
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
          <Button type="link" icon={<EyeOutlined />} className="table-action-link">
            <Link to={withPortalPrefix(user, `/batches/${record.id}`)}>查看详情</Link>
          </Button>
        ),
      },
    ],
    [user],
  )

  return (
    <Space direction="vertical" size={16} className="admin-page-stack">
      <Card bordered={false} className="admin-hero-card portal-hero-card">
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} xl={15}>
            <Space direction="vertical" size={12}>
              <Tag bordered={false} className="admin-hero-badge">
                批次工作区
              </Tag>
              <Typography.Title level={2} className="admin-hero-title">
                {isFarmer ? '我的批次' : '批次管理'}
              </Typography.Title>
              <Typography.Paragraph className="admin-hero-description">
                {isFarmer
                  ? '查看与自己相关的批次、审核状态与阶段链路，进入详情后补录种植、采摘和加工节点。'
                  : '集中管理茶叶批次、溯源码和公开状态，支持创建批次并进入详情页补充阶段记录与品质数据。'}
              </Typography.Paragraph>
            </Space>
          </Col>
          <Col xs={24} xl={9}>
            <Space wrap className="admin-hero-actions">
              {canCreateBatch ? (
                <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => setDrawerOpen(true)}>
                  新建批次
                </Button>
              ) : null}
              <Button icon={<SearchOutlined />} size="large" onClick={() => void loadBatches(searchForm.getFieldsValue())}>
                刷新列表
              </Button>
              {!canCreateBatch ? <Tag color="gold">当前角色无批次创建权限</Tag> : null}
            </Space>
          </Col>
        </Row>
      </Card>

      {error ? <Alert showIcon type="error" message={error} /> : null}
      {success ? <Alert showIcon type="success" message={success} /> : null}

      <Row gutter={[16, 16]}>
        {batchStats.map((item) => (
          <Col xs={24} sm={12} xl={6} key={item.label}>
            <Card bordered={false} className={`admin-stat-card admin-stat-card--${item.tone}`}>
              <Typography.Text className="admin-stat-label">{item.label}</Typography.Text>
              <Typography.Title level={2} className="admin-stat-value">
                {item.value}
              </Typography.Title>
            </Card>
          </Col>
        ))}
      </Row>

      <Card bordered={false} className="admin-section-card">
        <div className="admin-table-summary">
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              筛选条件
            </Typography.Title>
            <Typography.Text type="secondary">按批次码、业务状态和审核状态快速定位目标批次。</Typography.Text>
          </div>
        </div>
        <Form
          form={searchForm}
          layout="inline"
          onFinish={(values) => {
            void loadBatches(values)
          }}
          className="admin-toolbar-filters"
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

      <Card bordered={false} className="admin-section-card admin-table-card">
        <div className="admin-table-summary">
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              批次列表
            </Typography.Title>
            <Typography.Text type="secondary">共 {batches.length} 条记录，支持进入详情页查看链路、审核与品质结果。</Typography.Text>
          </div>
          <Tag className="admin-inline-tag" color="green" icon={<TagsOutlined />}>
            批次工作区
          </Tag>
        </div>

        <Table<TeaBatch>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={batches}
          locale={{ emptyText: <EmptyState description="暂无批次数据" /> }}
          pagination={{ pageSize: 8, showSizeChanger: false }}
        />
      </Card>

      <Drawer title="新建茶叶批次" width={520} open={drawerOpen} onClose={() => setDrawerOpen(false)} destroyOnClose>
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
