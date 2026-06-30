let fakeNow: number | null = null

export function travelTo(date: Date): void { fakeNow = date.getTime() }
export function travelBack(): void { fakeNow = null }
export function now(): number { return fakeNow ?? Date.now() }
