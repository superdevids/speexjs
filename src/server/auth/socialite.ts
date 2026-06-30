import { randomBytes } from 'node:crypto'
import { OAuth2Client } from './oauth.js'

export class Socialite {
  private oauth: OAuth2Client
  private stateStore = new Map<string, { state: string; expiresAt: number }>()

  constructor() {
    this.oauth = new OAuth2Client()
  }

  generateState(): string {
    const state = randomBytes(32).toString('hex')
    this.stateStore.set(state, { state, expiresAt: Date.now() + 600000 })
    this.cleanupExpiredStates()
    return state
  }

  validateState(state: string): boolean {
    const entry = this.stateStore.get(state)
    if (!entry || entry.expiresAt < Date.now()) {
      this.stateStore.delete(state)
      return false
    }
    this.stateStore.delete(state)
    return true
  }

  private cleanupExpiredStates(): void {
    const now = Date.now()
    for (const [key, entry] of this.stateStore) {
      if (entry.expiresAt < now) this.stateStore.delete(key)
    }
  }

  registerGitHub(clientId: string, clientSecret: string, redirectUri: string): void {
    this.oauth.register('github', {
      authorizeUrl: (state: string) =>
        `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`,
      exchangeCode: async (code: string, state?: string) => {
        if (state !== undefined && !this.validateState(state)) {
          throw new Error('OAuth state mismatch: potential CSRF attack')
        }
        const res = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }),
          headers: { accept: 'application/json', 'content-type': 'application/json' },
        })
        const data: any = await res.json()
        return { accessToken: data.access_token, refreshToken: data.refresh_token }
      },
      getUser: async (token: string) => {
        const res = await fetch('https://api.github.com/user', { headers: { authorization: `Bearer ${token}` } })
        const user: any = await res.json()
        return { id: String(user.id), name: user.name ?? user.login, email: user.email ?? '', avatar: user.avatar_url ?? '' }
      },
    })
  }

  registerGoogle(clientId: string, clientSecret: string, redirectUri: string): void {
    this.oauth.register('google', {
      authorizeUrl: (state: string) =>
        `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email%20profile&state=${state}`,
      exchangeCode: async (code: string, state?: string) => {
        if (state !== undefined && !this.validateState(state)) {
          throw new Error('OAuth state mismatch: potential CSRF attack')
        }
        const res = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
          }),
          headers: { 'content-type': 'application/json' },
        })
        const data: any = await res.json()
        return { accessToken: data.access_token, refreshToken: data.refresh_token }
      },
      getUser: async (token: string) => {
        const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { authorization: `Bearer ${token}` } })
        const user: any = await res.json()
        return { id: user.id, name: user.name, email: user.email, avatar: user.picture }
      },
    })
  }

  provider(name: string) {
    return this.oauth.get(name)
  }
}
