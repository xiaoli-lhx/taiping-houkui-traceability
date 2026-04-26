import { useMemo } from 'react'
import {
  AuditOutlined,
  BarChartOutlined,
  HomeOutlined,
  LogoutOutlined,
  MessageOutlined,
  SearchOutlined,
  SettingOutlined,
  StarOutlined,
  TagsOutlined,
  TeamOutlined,
  ToolOutlined,
  TrophyOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Avatar, Button, Layout, Menu, Space, Tag, Typography } from 'antd'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { getPortalPrefix, getRoleLabel, hasRole } from '../auth/roles'
import { useAuth } from '../auth/useAuth'
import { getAuditStatusMeta } from '../lib/display'

export function AppShell() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { Header, Sider, Content } = Layout

  const navItems = useMemo(() => {
    if (hasRole(user, 'admin')) {
      return [
        { key: '/admin', icon: <HomeOutlined />, label: '管理员首页' },
        { key: '/admin/registrations', icon: <AuditOutlined />, label: '注册审核' },
        { key: '/admin/users', icon: <TeamOutlined />, label: '用户管理' },
        { key: '/admin/feedback', icon: <MessageOutlined />, label: '反馈处理' },
        { key: '/profile', icon: <SettingOutlined />, label: '个人中心' },
      ]
    }
    if (hasRole(user, 'enterprise')) {
      return [
        { key: '/enterprise', icon: <HomeOutlined />, label: '企业首页' },
        { key: '/enterprise/batches', icon: <TagsOutlined />, label: '批次管理' },
        { key: '/enterprise/rectifications', icon: <ToolOutlined />, label: '整改任务' },
        { key: '/enterprise/quality/new', icon: <TrophyOutlined />, label: '品质评估' },
        { key: '/enterprise/stats', icon: <BarChartOutlined />, label: '统计分析' },
        { key: '/profile', icon: <SettingOutlined />, label: '个人中心' },
      ]
    }
    if (hasRole(user, 'farmer')) {
      return [
        { key: '/farmer', icon: <HomeOutlined />, label: '茶农首页' },
        { key: '/farmer/batches', icon: <TagsOutlined />, label: '我的批次' },
        { key: '/farmer/rectifications', icon: <ToolOutlined />, label: '整改任务' },
        { key: '/profile', icon: <SettingOutlined />, label: '个人中心' },
      ]
    }
    if (hasRole(user, 'regulator')) {
      return [
        { key: '/regulator', icon: <HomeOutlined />, label: '监管首页' },
        { key: '/regulator/reviews', icon: <AuditOutlined />, label: '批次审核' },
        { key: '/regulator/stats', icon: <BarChartOutlined />, label: '统计分析' },
        { key: '/profile', icon: <SettingOutlined />, label: '个人中心' },
      ]
    }
    if (hasRole(user, 'consumer')) {
      return [
        { key: '/consumer', icon: <HomeOutlined />, label: '消费者中心' },
        { key: '/consumer/query', icon: <SearchOutlined />, label: '查询中心' },
        { key: '/consumer/favorites', icon: <StarOutlined />, label: '我的收藏' },
        { key: '/consumer/feedback', icon: <AuditOutlined />, label: '意见反馈' },
        { key: '/profile', icon: <SettingOutlined />, label: '个人中心' },
      ]
    }
    return [{ key: '/profile', icon: <SettingOutlined />, label: '个人中心' }]
  }, [user])

  const selectedKey =
    [...navItems]
      .sort((left, right) => right.key.length - left.key.length)
      .find((item) => location.pathname.startsWith(item.key))?.key ?? location.pathname

  const approvalMeta = getAuditStatusMeta(user?.approval_status)
  const isAdminShell = hasRole(user, 'admin')

  return (
    <Layout className={`app-layout ${isAdminShell ? 'app-layout--admin' : ''}`}>
      <Sider width={248} theme="light" className={`app-sider ${isAdminShell ? 'app-sider--admin' : ''}`}>
        <div className="sider-brand">
          <Typography.Text type="secondary">Tea Traceability System</Typography.Text>
          <Typography.Title level={4} style={{ margin: '6px 0 0' }}>
            太平猴魁溯源与品质评估
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
            当前门户：{getRoleLabel(user?.role_code || '')}
          </Typography.Paragraph>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={navItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderInlineEnd: 'none' }}
        />

        <div className="sider-footer">
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            <Space align="start">
              <Avatar icon={<UserOutlined />} />
              <div>
                <Typography.Text strong>{user?.display_name ?? '未登录'}</Typography.Text>
                <div>
                  <Typography.Text type="secondary">{user?.organization || '-'}</Typography.Text>
                </div>
              </div>
            </Space>
            <div className="role-tag-wrap">
              <Tag color="blue">{getRoleLabel(user?.role_code || '')}</Tag>
              <Tag color={approvalMeta.color}>{approvalMeta.text}</Tag>
            </div>
            <Button icon={<LogoutOutlined />} onClick={logout}>
              退出登录
            </Button>
          </Space>
        </div>
      </Sider>

      <Layout>
        <Header className={`app-header ${isAdminShell ? 'app-header--admin' : ''}`}>
          <div className="app-header-main">
            <Space direction="vertical" size={0}>
              <Typography.Title level={3} style={{ margin: 0 }}>
                {navItems.find((item) => item.key === selectedKey)?.label ?? '系统首页'}
              </Typography.Title>
              <Typography.Text type="secondary">
                {getPortalPrefix(user) ? `当前已进入 ${getRoleLabel(user?.role_code || '')} 专属门户` : '系统页面'}
              </Typography.Text>
            </Space>
            <div className="app-header-tags">
              <Tag color="blue">{getRoleLabel(user?.role_code || '')}</Tag>
              <Tag color={approvalMeta.color}>{approvalMeta.text}</Tag>
            </div>
          </div>
          <Link to="/public-query" className="app-header-link">
            匿名公开查询
          </Link>
        </Header>
        <Content className="app-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
