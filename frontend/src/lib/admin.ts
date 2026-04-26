import { getRoleLabel } from '../auth/roles'
import type { AppRole } from '../types'

export type AdminRegistrationStatus = 'pending' | 'approved' | 'rejected' | 'disabled'

export const adminRegistrationStatusOptions: Array<{ label: string; value: AdminRegistrationStatus }> = [
  { label: '待审核', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已驳回', value: 'rejected' },
  { label: '已停用', value: 'disabled' },
]

const adminRoles: AppRole[] = ['admin', 'farmer', 'enterprise', 'regulator', 'consumer']

export const adminRoleOptions = adminRoles.map((role) => ({
  label: getRoleLabel(role),
  value: role,
}))
