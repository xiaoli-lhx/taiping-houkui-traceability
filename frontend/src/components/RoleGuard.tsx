import type { ReactElement } from 'react'
import { notification } from 'antd'
import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import type { AppRole } from '../types'
import { getDefaultRoute, hasAnyRole } from '../auth/roles'
import { useAuth } from '../auth/useAuth'

export function RoleGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: AppRole[]
  children: ReactElement
}) {
  const { user } = useAuth()
  const location = useLocation()
  const allowed = hasAnyRole(user, allowedRoles)

  useEffect(() => {
    if (!allowed) {
      notification.warning({
        message: '无权访问当前页面',
        description: '系统已根据你的角色跳转到可访问的默认页面。',
      })
    }
  }, [allowed])

  if (!allowed) {
    return <Navigate to={getDefaultRoute(user)} replace state={{ from: location.pathname }} />
  }

  return children
}
