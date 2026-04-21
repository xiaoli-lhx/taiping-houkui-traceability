import { Card, Descriptions, Tag } from 'antd'

import { getRoleLabel } from '../auth/roles'
import { useAuth } from '../auth/useAuth'
import { formatDateTime } from '../lib/display'

export function ProfilePage() {
  const { user } = useAuth()

  return (
    <Card title="个人中心">
      <Descriptions bordered column={2}>
        <Descriptions.Item label="用户名">{user?.username || '-'}</Descriptions.Item>
        <Descriptions.Item label="显示名称">{user?.display_name || '-'}</Descriptions.Item>
        <Descriptions.Item label="手机号">{user?.phone || '-'}</Descriptions.Item>
        <Descriptions.Item label="所属组织">{user?.organization || '-'}</Descriptions.Item>
        <Descriptions.Item label="角色">
          <Tag color="blue">{getRoleLabel(user?.role_code || '')}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="审核状态">{user?.approval_status || '-'}</Descriptions.Item>
        <Descriptions.Item label="联系信息">{user?.contact_info || '-'}</Descriptions.Item>
        <Descriptions.Item label="审核时间">{formatDateTime(user?.approved_at)}</Descriptions.Item>
        <Descriptions.Item label="驳回原因" span={2}>
          {user?.rejection_reason || '-'}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  )
}
