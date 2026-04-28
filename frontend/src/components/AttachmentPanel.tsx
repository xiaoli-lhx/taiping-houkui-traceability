import { useCallback, useEffect, useState } from 'react'
import { DeleteOutlined, InboxOutlined, PaperClipOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Popconfirm, Space, Table, Tag, Typography, Upload } from 'antd'
import type { UploadProps } from 'antd'

import { useAuth } from '../auth/useAuth'
import { api, resolveFileUrl } from '../lib/api'
import { formatDateTime, formatFileSize } from '../lib/display'
import type { AttachmentItem } from '../types'

export function AttachmentPanel({
  bizType,
  bizId,
  title,
  canManage,
}: {
  bizType: string
  bizId?: number
  title: string
  canManage: boolean
}) {
  const { token } = useAuth()
  const [items, setItems] = useState<AttachmentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadAttachments = useCallback(async () => {
    if (!bizId) {
      setItems([])
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await api.getAttachments(token, bizType, bizId)
      setItems(result)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '加载附件失败')
    } finally {
      setLoading(false)
    }
  }, [bizId, bizType, token])

  useEffect(() => {
    void loadAttachments()
  }, [loadAttachments])

  async function handleUpload(file: File) {
    if (!bizId) {
      return false
    }

    const formData = new FormData()
    formData.append('biz_type', bizType)
    formData.append('biz_id', String(bizId))
    formData.append('file', file)

    setError('')
    setSuccess('')
    try {
      await api.uploadAttachment(token, formData)
      setSuccess('附件上传成功。')
      await loadAttachments()
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : '附件上传失败')
    }

    return false
  }

  const uploadProps: UploadProps = {
    beforeUpload: (file) => {
      void handleUpload(file)
      return false
    },
    showUploadList: false,
  }

  async function handleDelete(id: number) {
    setError('')
    setSuccess('')
    try {
      await api.deleteAttachment(token, id)
      setSuccess('附件已删除。')
      await loadAttachments()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '删除附件失败')
    }
  }

  return (
    <Card
      size="small"
      title={title}
      extra={
        <Space>
          <Button size="small" icon={<ReloadOutlined />} onClick={() => void loadAttachments()}>
            刷新
          </Button>
          {canManage ? (
            <Upload {...uploadProps}>
              <Button size="small" type="primary" ghost icon={<UploadOutlined />} disabled={!bizId}>
                上传附件
              </Button>
            </Upload>
          ) : null}
        </Space>
      }
    >
      {error ? <Alert showIcon type="error" message={error} style={{ marginBottom: 12 }} /> : null}
      {success ? <Alert showIcon type="success" message={success} style={{ marginBottom: 12 }} /> : null}

      {!bizId ? (
        <Upload.Dragger disabled>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">请先创建业务记录后再上传附件</p>
        </Upload.Dragger>
      ) : (
        <Table<AttachmentItem>
          rowKey="id"
          size="small"
          loading={loading}
          dataSource={items}
          pagination={false}
          locale={{ emptyText: '暂无附件' }}
          columns={[
            {
              title: '文件',
              key: 'file',
              render: (_: unknown, record: AttachmentItem) => (
                <Space direction="vertical" size={2}>
                  <a href={resolveFileUrl(`/uploads/${record.relative_path}`)} target="_blank" rel="noreferrer">
                    <Space size={6}>
                      <PaperClipOutlined />
                      <span>{record.file_name}</span>
                    </Space>
                  </a>
                  <Typography.Text type="secondary">{record.mime_type || '-'}</Typography.Text>
                </Space>
              ),
            },
            { title: '大小', dataIndex: 'file_size', key: 'file_size', render: formatFileSize },
            { title: '上传时间', dataIndex: 'created_at', key: 'created_at', render: formatDateTime },
            {
              title: '操作',
              key: 'action',
              render: (_: unknown, record: AttachmentItem) =>
                canManage ? (
                  <Popconfirm title="确认删除该附件？" onConfirm={() => void handleDelete(record.id)}>
                    <Button size="small" danger ghost icon={<DeleteOutlined />}>
                      删除
                    </Button>
                  </Popconfirm>
                ) : (
                  <Tag>只读</Tag>
                ),
            },
          ]}
        />
      )}
    </Card>
  )
}
