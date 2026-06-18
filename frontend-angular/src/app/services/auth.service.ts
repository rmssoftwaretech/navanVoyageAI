import { Injectable } from '@angular/core'
import { HttpClient, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http'
import { Observable, tap } from 'rxjs'

const TOKEN_KEY = 'nva_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function authInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  const token = getToken()
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
  }
  return next(req)
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<{ token: string }> {
    return this.http.post<{ token: string }>('/api/auth/login', { username, password })
      .pipe(tap(({ token }) => localStorage.setItem(TOKEN_KEY, token)))
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY)
    window.location.href = '/login'
  }

  isAuthenticated(): boolean {
    return !!getToken()
  }

  getMe(): Observable<{ username: string; display_name: string; role: string }> {
    return this.http.get<{ username: string; display_name: string; role: string }>('/api/auth/me')
  }
}
