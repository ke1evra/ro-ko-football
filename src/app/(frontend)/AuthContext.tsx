'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { logoutUser } from '@/lib/auth'
import type { User } from '@/payload-types'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/users/me', {
        credentials: 'include',
      })

      if (!response.ok) {
        setUser(null)
        return
      }

      const data = await response.json()
      setUser(data.user || null)
    } catch (error) {
      console.error('Failed to fetch user', error)
      setUser(null)
    }
  }

  useEffect(() => {
    const loadUser = async () => {
      await fetchUser()
      setIsLoading(false)
    }
    loadUser()
  }, [])

  const logout = async () => {
    await logoutUser()
    setUser(null)
  }

  const refreshUser = async () => {
    await fetchUser()
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
