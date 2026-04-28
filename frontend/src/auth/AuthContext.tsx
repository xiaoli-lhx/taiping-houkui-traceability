import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { api } from '../lib/api'
import type { AppRole, LoginResponse } from '../types'
import { AuthContext, type AuthContextValue } from './context'

const STORAGE_KEY = 'tea-traceability-auth'

interface AuthState {
  token: string
  user: LoginResponse['user'] | null
}

function readStoredState(): AuthState {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return { token: '', user: null }
  }

  try {
    return JSON.parse(raw) as AuthState
  } catch {
    return { token: '', user: null }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => readStoredState())

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isAuthenticated: Boolean(state.token),
      async login(username: string, password: string, role: AppRole) {
        const result: LoginResponse = await api.login(username, password, role)
        setState({
          token: result.access_token,
          user: result.user,
        })
        return result
      },
      logout() {
        setState({ token: '', user: null })
      },
      async refreshMe() {
        if (!state.token) {
          return
        }
        const user = await api.getMe(state.token)
        setState((current) => ({
          ...current,
          user,
        }))
      },
      setSession(token: string, user: LoginResponse['user']) {
        setState({ token, user })
      },
    }),
    [state],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
