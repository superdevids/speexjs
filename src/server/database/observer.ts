export interface ModelObserver {
  creating?: (data: Record<string, unknown>) => void | Promise<void>
  created?: (instance: any) => void | Promise<void>
  updating?: (instance: any) => void | Promise<void>
  updated?: (instance: any) => void | Promise<void>
  saving?: (instance: any) => void | Promise<void>
  saved?: (instance: any) => void | Promise<void>
  deleting?: (instance: any) => void | Promise<void>
  deleted?: (instance: any) => void | Promise<void>
  retrieved?: (instance: any) => void | Promise<void>
}

const observers = new Map<string, ModelObserver>()

export function observe(modelName: string, observer: ModelObserver): void {
  observers.set(modelName, observer)
}

export function getObserver(modelName: string): ModelObserver | undefined {
  return observers.get(modelName)
}

export async function runObserverHook(modelName: string, hook: keyof ModelObserver, instance: any): Promise<void> {
  const observer = observers.get(modelName)
  if (observer) {
    const fn = observer[hook]
    if (fn) await fn(instance)
  }
}
