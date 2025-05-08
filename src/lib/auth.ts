'use server'

import { cookies, headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import type { Payload } from 'payload'
import config from '@payload-config'
import configPromise from '@payload-config'
import { redirect } from 'next/navigation'
import type { User } from '@/payload-types'

// Auth Types

type LoginParams = {
  email: string
  password: string
}

type RegisterParams = {
  email: string
  password: string
  username: string
}

export type LoginResponse = {
  success: boolean
  error?: string
}

export type Result = {
  exp?: number
  token?: string
  user?: User
}

export type RegisterResponse = {
  success: boolean
  error?: string
}

// Auth Actions

export async function getUser(): Promise<User | null> {
  const headers = await getHeaders()
  const payload: Payload = await getPayload({ config: await configPromise })

  const { user } = await payload.auth({ headers })
  return user || null
}

export async function loginUser({ email, password }: LoginParams): Promise<LoginResponse> {
  const payload = await getPayload({ config })

  try {
    const result: Result = await payload.login({
      collection: 'users',
      data: { email, password },
    })

    if (result.token) {
      const cookieStore = await cookies()
      cookieStore.set('payload-token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      })

      return { success: true }
    }

    return { success: false, error: 'Invalid credentials' }
  } catch (error) {
    console.error('Login error: ', error)
    return { success: false, error: 'An error occurred' }
  }
}

export async function logoutUser() {
  const cookieStore = await cookies()
  cookieStore.delete('payload-token')
  redirect('/')
}

export async function registerUser({ email, password }: RegisterParams): Promise<RegisterResponse> {
  const payload = await getPayload({ config })

  try {
    await payload.create({
      collection: 'users',
      data: {
        email,
        password,
        role: 'user',
      },
    })

    const loginResponse = await loginUser({ email, password })

    if (loginResponse.success) {
      return { success: true }
    }
    return { success: false, error: 'Failed to log in after registration' }
  } catch (error) {
    console.error('Registration error:', error)

    if (error instanceof Error && error.message.includes('duplicate key error')) {
      return { success: false, error: 'An account with this email already exists' }
    }

    return { success: false, error: 'An error occurred during registration' }
  }
}
