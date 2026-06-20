import axios from 'axios'

const TOKEN_KEY = 'nva_token'
const PERSONA_KEY = 'nva_acme_persona'
const USER_KEY = 'acme_user'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

export function getStoredUser(): { username: string; displayName: string; personaKey: string } | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export async function loginAs(username: string, password: string, personaKey: string, displayName: string): Promise<void> {
  const { data } = await axios.post<{ token: string }>('/api/auth/login', { username, password })
  localStorage.setItem(TOKEN_KEY, data.token)
  localStorage.setItem(PERSONA_KEY, personaKey)
  localStorage.setItem(USER_KEY, JSON.stringify({ username, displayName, personaKey }))
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(PERSONA_KEY)
  localStorage.removeItem(USER_KEY)
}
