import { useEffect, useState } from 'react'
import { HeartOutlined } from '@ant-design/icons'
import { Card, Space, Table, Tag, Typography } from 'antd'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/useAuth'
import { EmptyState } from '../components/EmptyState'
import { api } from '../lib/api'
import { formatDateTime } from '../lib/display'
import type { ConsumerFavorite } from '../types'

export function ConsumerFavoritesPage() {
  const { token } = useAuth()
  const [items, setItems] = useState<ConsumerFavorite[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const result = await api.getFavorites(token)
        setItems(result)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [token])

  return (
    <Space direction="vertical" size={16} className="admin-page-stack">
      <Card bordered={false} className="admin-hero-card portal-hero-card">
        <Space direction="vertical" size={12}>
          <Tag bordered={false} className="admin-hero-badge">
            收藏批次
          </Tag>
          <Typography.Title level={2} className="admin-hero-title">
            我的收藏
          </Typography.Title>
          <Typography.Paragraph className="admin-hero-description">
            管理已收藏的公开批次，快速回看其溯源码、产地与品质等级，并跳转到公众查询页再次核验。
          </Typography.Paragraph>
        </Space>
      </Card>

      <Card bordered={false} className="admin-section-card admin-table-card">
        <div className="admin-table-summary">
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              收藏批次列表
            </Typography.Title>
            <Typography.Text type="secondary">当前共收藏 {items.length} 个批次</Typography.Text>
          </div>
          <Tag className="admin-inline-tag" color="red" icon={<HeartOutlined />}>
            收藏清单
          </Tag>
        </div>

        <Table<ConsumerFavorite>
          rowKey="id"
          loading={loading}
          dataSource={items}
          locale={{ emptyText: <EmptyState description="暂无收藏批次" /> }}
          columns={[
            { title: '批次码', dataIndex: ['batch', 'batch_code'], key: 'batch_code' },
            { title: '茶名', dataIndex: ['batch', 'tea_name'], key: 'tea_name' },
            { title: '产地', dataIndex: ['batch', 'origin'], key: 'origin' },
            {
              title: '等级',
              dataIndex: ['batch', 'latest_grade'],
              key: 'latest_grade',
              render: (value: string) => <Tag>{value || '暂无'}</Tag>,
            },
            { title: '收藏时间', dataIndex: 'created_at', key: 'created_at', render: formatDateTime },
            {
              title: '操作',
              key: 'action',
              render: (_: unknown, record: ConsumerFavorite) => <Link to={`/public-query?code=${record.batch.trace_code}`}>查看公开页</Link>,
            },
          ]}
        />
      </Card>
    </Space>
  )
}
