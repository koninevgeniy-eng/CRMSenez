'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

const USER_DATA_KEY = 'senez_user_data'

interface AuthUser {
  id: string
  name?: string | null
  email?: string | null
  role?: string
  department?: string | null
}

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  isManager: boolean
  isAdmin: boolean
  userDepartment: string | null
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isManager: false,
  isAdmin: false,
  userDepartment: null,
  signOut: async () => {},
  refreshSession: async () => {},
})

interface AuthProviderProps {
  children: ReactNode
}

// Вспомогательная функция: получить сохранённые данные пользователя из sessionStorage
function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  try {
    const data = sessionStorage.getItem(USER_DATA_KEY)
    if (data) return JSON.parse(data)
  } catch {
    // ignore
  }
  return null
}

// Вспомогательная функция: очистить sessionStorage
function clearStoredAuth() {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(USER_DATA_KEY)
  } catch {
    // ignore
  }
}

// Вспомогательная функция: сохранить данные пользователя в sessionStorage
// (только данные пользователя, НЕ session token — token хранится только в httpOnly cookie)
function storeUserData(user: AuthUser) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(USER_DATA_KEY, JSON.stringify(user))
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Проверка сессии через /api/auth/me
  // Cookie отправляются автоматически браузером (httpOnly cookie)
  const refreshSession = useCallback(async () => {
    try {
      // Cookie отправляются автоматически — не нужен X-Session-Token заголовок
      const res = await fetch('/api/auth/me', { credentials: 'same-origin' })

      if (res.ok) {
        const data = await res.json()
        if (data.authenticated && data.user) {
          setUser(data.user)
          storeUserData(data.user)
        } else {
          setUser(null)
          clearStoredAuth()
        }
      } else {
        setUser(null)
        clearStoredAuth()
      }
    } catch {
      setUser(null)
      // НЕ очищаем sessionStorage при сетевой ошибке —
      // возможно это временная проблема
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Проверка сессии при загрузке
  useEffect(() => {
    // Сначала попробуем восстановить из sessionStorage для мгновенного рендера
    const storedUser = getStoredUser()
    if (storedUser) {
      setUser(storedUser)
      setIsLoading(false)
    }
    // Затем верифицируем сессию на сервере
    refreshSession()
  }, [refreshSession])

  // Периодическая проверка сессии (каждые 5 минут)
  useEffect(() => {
    const interval = setInterval(refreshSession, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [refreshSession])

  // Выход из системы
  const signOut = useCallback(async () => {
    try {
      // Cookie отправляются автоматически
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
    } catch {
      // Игнорируем ошибку
    }
    setUser(null)
    clearStoredAuth()
    window.location.href = '/login'
  }, [])

  const isAuthenticated = !!user
  const isManager = user?.role === 'manager'
  const isAdmin = user?.role === 'admin'
  const userDepartment = user?.department ?? null

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoading,
      isManager,
      isAdmin,
      userDepartment,
      signOut,
      refreshSession,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

// Экспортируем функции для использования в login page
export { clearStoredAuth, storeUserData, USER_DATA_KEY }
