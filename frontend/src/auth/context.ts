import { createContext } from 'react'

import type { AppRole, LoginResponse, UserProfile } from '../types'

interface AuthState {
  token: string
  user: UserProfile | null
}

export interface AuthContextValue extends AuthState {
  isAuthenticated: boolean
  login: (username: string, password: string, role: AppRole) => Promise<LoginResponse>
  logout: () => void
  refreshMe: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
