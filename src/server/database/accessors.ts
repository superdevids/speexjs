export class AccessorMutator {
  private accessors = new Map<string, (val: any) => any>()
  private mutators = new Map<string, (val: any) => any>()

  getAccessor(field: string): ((val: any) => any) | undefined { return this.accessors.get(field) }
  setAccessor(field: string, fn: (val: any) => any): void { this.accessors.set(field, fn) }
  getMutator(field: string): ((val: any) => any) | undefined { return this.mutators.get(field) }
  setMutator(field: string, fn: (val: any) => any): void { this.mutators.set(field, fn) }
}
