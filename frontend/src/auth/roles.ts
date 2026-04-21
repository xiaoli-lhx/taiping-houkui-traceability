import type { AppRole, UserProfile } from '../types'

export function hasRole(user: UserProfile | null, role: AppRole) {
  return user?.role_code === role || Boolean(user?.roles.includes(role))
}

export function hasAnyRole(user: UserProfile | null, roles: AppRole[]) {
  return roles.some((role) => hasRole(user, role))
}

export function getDefaultRoute(user: UserProfile | null) {
  const prefix = getPortalPrefix(user)
  if (prefix) {
    return prefix
  }
  return '/login'
}

export function getPortalPrefix(user: UserProfile | null) {
  if (hasRole(user, 'admin')) {
    return '/admin'
  }
  if (hasRole(user, 'consumer')) {
    return '/consumer'
  }
  if (hasRole(user, 'regulator')) {
    return '/regulator'
  }
  if (hasRole(user, 'enterprise')) {
    return '/enterprise'
  }
  if (hasRole(user, 'farmer')) {
    return '/farmer'
  }
  return ''
}

export function withPortalPrefix(user: UserProfile | null, path: string) {
  const prefix = getPortalPrefix(user)
  if (!prefix) {
    return path
  }
  if (!path.startsWith('/')) {
    return `${prefix}/${path}`
  }
  return `${prefix}${path}`
}

export function getRoleLabel(role: string) {
  switch (role) {
    case 'enterprise':
      return '企业'
    case 'admin':
      return '管理员'
    case 'farmer':
      return '茶农'
    case 'regulator':
      return '监管方'
    case 'consumer':
      return '消费者'
    default:
      return role
  }
}
