import { Router } from './index.js'

export function apiVersion(version: string, callback: (router: Router) => void): (router: Router) => void {
  return (router: Router) => {
    router.group(`/api/v${version}`, callback)
  }
}
