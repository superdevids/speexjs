export interface OAuth2Provider {
  authorizeUrl(state: string): string
  exchangeCode(code: string, state?: string): Promise<{ accessToken: string; refreshToken?: string }>
  getUser(accessToken: string): Promise<{ id: string; email?: string; name?: string; avatar?: string }>
}

export class OAuth2Client {
  private providers: Map<string, OAuth2Provider> = new Map()

  register(name: string, provider: OAuth2Provider): void {
    this.providers.set(name, provider)
  }

  get(name: string): OAuth2Provider | undefined {
    return this.providers.get(name)
  }
}
