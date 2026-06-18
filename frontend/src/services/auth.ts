import axios from 'axios'
import type { LoginResponse, User } from '@/types/nva'

const TOKEN_KEY = 'nva_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const { data } = await axios.post<LoginResponse>('/api/auth/login', { username, password })
  setToken(data.token)
  return data
}

export async function getMe(): Promise<User> {
  const { data } = await axios.get<User>('/api/auth/me', {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  return data
}

export function logout(): void {
  clearToken()
  window.location.href = '/login'
}

// Shared axios instance with base URL and auth interceptor
export const apiClient = axios.create({ baseURL: '/api' })

apiClient.interceptors.request.use((config) => {
  const token = getToken()
  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) { clearToken(); window.location.href = '/login' }
    return Promise.reject(err)
  }
)

axios.interceptors.request.use((config) => {
  const token = getToken()
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

axios.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      clearToken()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)
