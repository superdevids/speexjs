export function actingAs(app: any, user: { id: string | number; [key: string]: unknown }): void {
  const container = app.container
  container.instance('auth.default', user)
  container.instance('auth.user', user)
}
