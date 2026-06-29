import { OAuth2Client } from './oauth.js'

export class Socialite {
  private oauth: OAuth2Client
  constructor() { this.oauth = new OAuth2Client() }

  registerGitHub(clientId: string, clientSecret: string, redirectUri = 'http://localhost:3000/auth/github/callback'): void {
    this.oauth.register('github', {
      authorizeUrl: (state: string) => `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`,
      exchangeCode: async (code: string, state?: string) => {
        // state verification should happen before this call
        const res = await fetch('https://github.com/login/oauth/access_token', { method: 'POST', body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }), headers: { accept: 'application/json', 'content-type': 'application/json' } })
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

  registerGoogle(clientId: string, clientSecret: string, redirectUri = 'http://localhost:3000/auth/google/callback'): void {
    this.oauth.register('google', {
      authorizeUrl: (state: string) => `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email%20profile&state=${state}`,
      exchangeCode: async (code: string, state?: string) => {
        const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, grant_type: 'authorization_code', redirect_uri: redirectUri }), headers: { 'content-type': 'application/json' } })
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

  provider(name: string) { return this.oauth.get(name) }
}
