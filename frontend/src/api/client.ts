import type { ApiError } from '../types'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

type RequestOptions = RequestInit & { headers?: Record<string, string> }

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, options)
  const data = (await res.json()) as T & ApiError
  if (!res.ok) throw new Error(data.error || 'API error')
  return data as T
}

export const get = <T>(path: string, token?: string) =>
  request<T>(path, { headers: token ? { Authorization: `Bearer ${token}` } : {} })

export const post = <T>(path: string, body: unknown, token?: string) =>
  request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
