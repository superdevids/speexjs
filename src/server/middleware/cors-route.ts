const routeOrigins = new Map<string, string>()

export function corsForRoute(path: string, origin: string): void {
  routeOrigins.set(path, origin)
}

export function getCorsForRoute(path: string): string | undefined {
  return routeOrigins.get(path)
}
