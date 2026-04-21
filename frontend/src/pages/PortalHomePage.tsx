import { Card, Col, Row, Space, Statistic, Typography } from 'antd'
import { Link } from 'react-router-dom'

import { getRoleLabel, withPortalPrefix } from '../auth/roles'
import { useAuth } from '../auth/useAuth'

export function PortalHomePage({ title, description, shortcuts }: { title: string; description: string; shortcuts: Array<{ label: string; to: string }> }) {
  const { user } = useAuth()

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
        <Typography.Text type="secondary">{description}</Typography.Text>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="当前角色" value={getRoleLabel(user?.role_code || '')} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="账号状态" value={user?.approval_status || '-'} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="所属组织" value={user?.organization || '-'} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {shortcuts.map((shortcut) => (
          <Col xs={24} md={12} lg={8} key={shortcut.to}>
            <Card hoverable>
              <Space direction="vertical">
                <Typography.Text strong>{shortcut.label}</Typography.Text>
                <Link to={withPortalPrefix(user, shortcut.to)}>进入页面</Link>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>
    </Space>
  )
}

