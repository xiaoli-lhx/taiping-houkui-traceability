import { useEffect, useState } from 'react'
import { Card, Table, Tag } from 'antd'
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
    <Card title="我的收藏">
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
  )
}
