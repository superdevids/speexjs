type Factory<T> = () => T

interface Binding<T> {
  factory: Factory<T>
  singleton: boolean
  instance?: T
}

export class Container {
  private bindings = new Map<string, Binding<unknown>>()
  private resolving = new Set<string>()

  bind<T>(name: string, factory: Factory<T>): this {
    this.bindings.set(name, { factory, singleton: false } satisfies Binding<T>)
    return this
  }

  singleton<T>(name: string, factory: Factory<T>): this {
    this.bindings.set(name, { factory, singleton: true } satisfies Binding<T>)
    return this
  }

  instance<T>(name: string, instance: T): this {
    this.bindings.set(name, {
      factory: () => instance,
      singleton: true,
      instance,
    } satisfies Binding<T>)
    return this
  }

  resolve<T>(name: string): T {
    const binding = this.bindings.get(name)
    if (binding === undefined) {
      throw new Error(`Binding not found: ${name}`)
    }

    if (binding.singleton && binding.instance !== undefined) {
      return binding.instance as T
    }

    if (this.resolving.has(name)) {
      throw new Error(
        `Circular dependency detected: ${name} is already being resolved`,
      )
    }

    this.resolving.add(name)

    try {
      const instance = binding.factory()
      if (binding.singleton) {
        binding.instance = instance
      }
      return instance as T
    } finally {
      this.resolving.delete(name)
    }
  }

  has(name: string): boolean {
    return this.bindings.has(name)
  }

  remove(name: string): void {
    this.bindings.delete(name)
  }

  clear(): void {
    this.bindings.clear()
    this.resolving.clear()
  }

  getBindings(): Map<string, Binding<unknown>> {
    return new Map(this.bindings)
  }
}
