import { QueryBuilder } from './query.js'
import type { QueryRunner } from './types.js'

export type RelationType = 'hasOne' | 'hasMany' | 'belongsTo' | 'belongsToMany' | 'morphOne' | 'morphMany' | 'morphTo' | 'morphToMany'

interface RelationDefinition {
  type: RelationType
  relatedModel: typeof Model
  foreignKey: string
  localKey: string
  pivotTable?: string
  morphName?: string
}

export class Model {
  /** Primary key */
  id?: number | string;
  /** Dynamic properties from database */
  [key: string]: unknown

  static table: string = ''
  static connection: QueryRunner | null = null
  protected static queryRunner: QueryRunner | null = null
  private static classStores = new WeakMap<
    typeof Model,
    { relationDefs: Map<string, RelationDefinition>; eagerLoads: Map<string, boolean> }
  >()

  private static getStore(): { relationDefs: Map<string, RelationDefinition>; eagerLoads: Map<string, boolean> } {
    let store = this.classStores.get(this)
    if (!store) {
      store = { relationDefs: new Map(), eagerLoads: new Map() }
      this.classStores.set(this, store)
    }
    return store
  }
  /** @internal cache for loaded relations on instances */
  _relations: Record<string, unknown> = {}

  static setConnection(conn: QueryRunner): void {
    this.connection = conn
    this.queryRunner = conn
  }

  static query<T extends typeof Model>(this: T): QueryBuilder {
    if (!this.queryRunner) {
      throw new Error('Database connection not set. Call Model.setConnection() first.')
    }
    return new QueryBuilder(this.queryRunner, this.table)
  }

  // ─── Relations Definition ──────────────────────────────────

  static hasOne(relatedModel: typeof Model, foreignKey?: string, localKey?: string): void {
    const key = `hasOne:${relatedModel.table}`
    this.getStore().relationDefs.set(key, {
      type: 'hasOne',
      relatedModel,
      foreignKey: foreignKey ?? `${this.table}_id`,
      localKey: localKey ?? 'id',
    })
  }

  static hasMany(relatedModel: typeof Model, foreignKey?: string, localKey?: string): void {
    const key = `hasMany:${relatedModel.table}`
    this.getStore().relationDefs.set(key, {
      type: 'hasMany',
      relatedModel,
      foreignKey: foreignKey ?? `${this.table}_id`,
      localKey: localKey ?? 'id',
    })
  }

  static belongsTo(relatedModel: typeof Model, foreignKey?: string, ownerKey?: string): void {
    const key = `belongsTo:${relatedModel.table}`
    this.getStore().relationDefs.set(key, {
      type: 'belongsTo',
      relatedModel,
      foreignKey: foreignKey ?? `${relatedModel.table}_id`,
      localKey: ownerKey ?? 'id',
    })
  }

  static belongsToMany(relatedModel: typeof Model, pivotTable?: string, foreignPivotKey?: string, relatedPivotKey?: string): void {
    const tables = [this.table, relatedModel.table].sort()
    const key = `belongsToMany:${relatedModel.table}`
    this.getStore().relationDefs.set(key, {
      type: 'belongsToMany',
      relatedModel,
      foreignKey: foreignPivotKey ?? `${this.table}_id`,
      localKey: relatedPivotKey ?? `${relatedModel.table}_id`,
      pivotTable: pivotTable ?? `${tables[0]}_${tables[1]}`,
    })
  }

  static morphMany(relatedModel: typeof Model, morphName: string): void {
    const key = `morphMany:${morphName}`
    this.getStore().relationDefs.set(key, {
      type: 'morphMany',
      relatedModel,
      foreignKey: `${morphName}_id`,
      localKey: 'id',
      morphName,
    })
  }

  static morphOne(relatedModel: typeof Model, morphName: string, foreignKey?: string): void {
    const key = `morphOne:${morphName}`
    this.getStore().relationDefs.set(key, {
      type: 'morphOne',
      relatedModel,
      foreignKey: foreignKey ?? `${morphName}_id`,
      localKey: 'id',
      morphName,
    })
  }

  static morphToMany(relatedModel: typeof Model, morphName: string, table?: string): void {
    const key = `morphToMany:${morphName}:${relatedModel.table}`
    this.getStore().relationDefs.set(key, {
      type: 'morphToMany',
      relatedModel,
      foreignKey: `${morphName}_id`,
      localKey: `${morphName}_type`,
      morphName,
      pivotTable: table ?? `${morphName}_${relatedModel.table}`,
    })
  }

  // ─── Eager Loading ─────────────────────────────────────────

  static with(...relations: string[]): void {
    for (const rel of relations) {
      this.getStore().eagerLoads.set(rel, true)
    }
  }

  // ─── Query Shortcuts ───────────────────────────────────────

  static async all<T extends typeof Model>(this: T): Promise<InstanceType<T>[]> {
    const rows = await this.query().get()
    const instances = rows.map((row: Record<string, unknown>) => this.hydrate(row))
    await this.loadRelations(instances)
    return instances as InstanceType<T>[]
  }

  static async find<T extends typeof Model>(this: T, id: number | string): Promise<InstanceType<T> | null> {
    const row = await this.query().find(id)
    if (!row) return null
    const instance = this.hydrate(row as Record<string, unknown>)
    await this.loadRelations([instance])
    return instance as InstanceType<T>
  }

  static async findOrFail<T extends typeof Model>(this: T, id: number | string): Promise<InstanceType<T>> {
    const instance = await this.find(id)
    if (!instance) throw new Error(`No record found for id ${id} in table ${this.table}`)
    return instance as InstanceType<T>
  }

  static async where<T extends typeof Model>(this: T, column: string, value: any): Promise<QueryBuilder> {
    return this.query().where(column, value)
  }

  static async create<T extends typeof Model>(this: T, data: Record<string, any>): Promise<InstanceType<T>> {
    const id = await this.query().insert(data)
    return (await this.find(id)) as InstanceType<T>
  }

  static async updateOrCreate<T extends typeof Model>(
    this: T,
    attributes: Record<string, any>,
    values?: Record<string, any>,
  ): Promise<InstanceType<T>> {
    const qb = this.query()
    for (const [key, value] of Object.entries(attributes)) {
      qb.where(key, value)
    }
    const existing = await qb.first()
    if (existing) {
      const mergeValues = values ?? attributes
      const updateQb = new QueryBuilder(this.queryRunner!, this.table)
      for (const [key, value] of Object.entries(attributes)) {
        updateQb.where(key, value)
      }
      await updateQb.update(mergeValues)
      return this.hydrate({ ...existing, ...mergeValues })
    }
    return (await this.create({ ...attributes, ...values })) as InstanceType<T>
  }

  static async firstOrCreate<T extends typeof Model>(
    this: T,
    attributes: Record<string, any>,
    values?: Record<string, any>,
  ): Promise<InstanceType<T>> {
    const qb = this.query()
    for (const [key, val] of Object.entries(attributes)) {
      qb.where(key, val)
    }
    const existing = await qb.first()
    if (existing) return this.hydrate(existing) as InstanceType<T>
    return this.create({ ...attributes, ...values }) as Promise<InstanceType<T>>
  }

  static async firstOrNew<T extends typeof Model>(
    this: T,
    attributes: Record<string, any>,
    values?: Record<string, any>,
  ): Promise<InstanceType<T>> {
    const qb = this.query()
    for (const [key, val] of Object.entries(attributes)) {
      qb.where(key, val)
    }
    const existing = await qb.first()
    if (existing) return this.hydrate(existing) as InstanceType<T>
    const instance = new this() as InstanceType<T>
    const merged = { ...attributes, ...values }
    for (const [key, val] of Object.entries(merged)) {
      ;(instance as any)[key] = val
    }
    return instance
  }

  // ─── Instance Methods ──────────────────────────────────────

  async save(): Promise<void> {
    const ModelClass = this.constructor as typeof Model
    const id = this.id
    if (id !== undefined && id !== null) {
      await ModelClass.query().where('id', id).update(this.getData())
    } else {
      const newId = await ModelClass.query().insert(this.getData())
      this.id = newId
    }
  }

  async delete(): Promise<void> {
    const ModelClass = this.constructor as typeof Model
    const id = this.id
    if (id !== undefined && id !== null) {
      await ModelClass.query().where('id', id).delete()
    }
  }

  async fresh(): Promise<this | null> {
    const ModelClass = this.constructor as typeof Model
    if (this.id === undefined || this.id === null) return null
    const row = await ModelClass.query().find(this.id)
    if (!row) return null
    const instance = new (ModelClass as any)() as this
    for (const [key, value] of Object.entries(row)) {
      instance[key as keyof this] = value as this[keyof this]
    }
    return instance
  }

  async refresh(): Promise<void> {
    const ModelClass = this.constructor as typeof Model
    if (this.id === undefined || this.id === null) return
    const row = await ModelClass.query().find(this.id)
    if (row) {
      const self = this as Record<string, unknown>
      for (const [key, value] of Object.entries(row)) {
        if (!key.startsWith('_')) self[key] = value
      }
    }
  }

  async load(...relations: string[]): Promise<void> {
    const ModelClass = this.constructor as typeof Model
    const id = this.id
    if (id === undefined) return
    const fresh = await ModelClass.find(id)
    if (fresh) {
      const self = this as Record<string, unknown>
      const freshRecord = fresh as Record<string, unknown>
      for (const key of Object.keys(freshRecord)) {
        if (!key.startsWith('_')) self[key] = freshRecord[key]
      }
    }
    // Load only relations not already loaded
    for (const rel of relations) {
      if (!this._relations[rel] && fresh) {
        this._relations[rel] = (fresh as Record<string, Record<string, unknown>>)._relations?.[rel]
      }
    }
  }

  async loadMissing(...relations: string[]): Promise<void> {
    const missing = relations.filter((r) => !this._relations[r])
    if (missing.length > 0) await this.load(...missing)
  }

  // ─── Relation Loader ───────────────────────────────────────

  private static async loadRelations(instances: any[]): Promise<void> {
    if (instances.length === 0) return

    for (const [key, def] of this.getStore().relationDefs) {
      const shouldLoad = this.getStore().eagerLoads.size === 0 || this.getStore().eagerLoads.has(key.split(':')[1] ?? key)
      if (!shouldLoad) continue

      const localIds = instances.map((i: any) => i[def.localKey]).filter(Boolean)

      if (def.type === 'belongsTo') {
        if (!def.relatedModel.queryRunner) def.relatedModel.setConnection(this.queryRunner!)
        const related = await def.relatedModel.query().whereIn(def.localKey, localIds).get()
        for (const inst of instances) {
          inst._relations[key] = related.find((r: any) => r[def.localKey] === inst[def.foreignKey]) ?? null
        }
      }

      if (def.type === 'hasMany') {
        if (!def.relatedModel.queryRunner) def.relatedModel.setConnection(this.queryRunner!)
        const related = await def.relatedModel.query().whereIn(def.foreignKey, localIds).get()
        for (const inst of instances) {
          inst._relations[key] = related.filter((r: any) => r[def.foreignKey] === inst[def.localKey])
        }
      }

      if (def.type === 'hasOne') {
        if (!def.relatedModel.queryRunner) def.relatedModel.setConnection(this.queryRunner!)
        const related = await def.relatedModel.query().whereIn(def.foreignKey, localIds).get()
        for (const inst of instances) {
          inst._relations[key] = related.find((r: any) => r[def.foreignKey] === inst[def.localKey]) ?? null
        }
      }

      // HasManyThrough not implemented - requires multi-table join

      if (def.type === 'belongsToMany' && def.pivotTable) {
        if (!def.relatedModel.queryRunner) def.relatedModel.setConnection(this.queryRunner!)
        const pivotQb = new QueryBuilder(this.queryRunner!, def.pivotTable)
        const pivotRows = await pivotQb.whereIn(def.foreignKey, localIds).get()
        const relatedIds = pivotRows.map((r: any) => r[def.localKey])
        if (relatedIds.length > 0) {
          const related = await def.relatedModel.query().whereIn('id', relatedIds).get()
          for (const inst of instances) {
            const pivots = pivotRows.filter((p: any) => p[def.foreignKey] === inst[def.localKey])
            inst._relations[key] = pivots.map((p: any) => related.find((r: any) => r.id === p[def.localKey])).filter(Boolean)
          }
        } else {
          for (const inst of instances) {
            inst._relations[key] = []
          }
        }
      }

      if (def.type === 'morphMany' && def.morphName) {
        if (!def.relatedModel.queryRunner) def.relatedModel.setConnection(this.queryRunner!)
        const related = await def.relatedModel
          .query()
          .where(`${def.morphName}_type`, this.name)
          .whereIn(`${def.morphName}_id`, localIds)
          .get()
        for (const inst of instances) {
          inst._relations[key] = related.filter((r: any) => r[`${def.morphName}_id`] === inst[def.localKey])
        }
      }

      if (def.type === 'morphOne' && def.morphName) {
        if (!def.relatedModel.queryRunner) def.relatedModel.setConnection(this.queryRunner!)
        const related = await def.relatedModel
          .query()
          .where(`${def.morphName}_type`, this.name)
          .whereIn(`${def.morphName}_id`, localIds)
          .get()
        for (const inst of instances) {
          inst._relations[key] = related.find((r: any) => r[`${def.morphName}_id`] === inst[def.localKey]) ?? null
        }
      }

      if (def.type === 'morphToMany' && def.morphName && def.pivotTable) {
        if (!def.relatedModel.queryRunner) def.relatedModel.setConnection(this.queryRunner!)
        const pivotQb = new QueryBuilder(this.queryRunner!, def.pivotTable)
        const pivotRows = await pivotQb.where(`${def.morphName}_type`, this.name).whereIn(`${def.morphName}_id`, localIds).get()
        const relatedIds = pivotRows.map((r: any) => r[`${def.relatedModel.table}_id`])
        if (relatedIds.length > 0) {
          const related = await def.relatedModel.query().whereIn('id', relatedIds).get()
          for (const inst of instances) {
            const pivots = pivotRows.filter((p: any) => p[`${def.morphName}_id`] === inst[def.localKey])
            inst._relations[key] = pivots
              .map((p: any) => related.find((r: any) => r.id === p[`${def.relatedModel.table}_id`]))
              .filter(Boolean)
          }
        } else {
          for (const inst of instances) {
            inst._relations[key] = []
          }
        }
      }
    }
  }

  // ─── Internal Helpers ──────────────────────────────────────

  private static hydrate(data: Record<string, any>): any {
    const instance = new this()
    for (const [key, value] of Object.entries(data)) {
      instance[key] = value
    }
    return instance
  }

  private getData(): Record<string, any> {
    const data: Record<string, any> = {}
    const instance = this as Record<string, any>
    const prototype = Object.getPrototypeOf(this)
    const ownKeys = [...Object.getOwnPropertyNames(instance), ...Object.keys(instance)]
    const classKeys = new Set([...Object.getOwnPropertyNames(prototype), 'save', 'delete', 'getData'])
    for (const key of ownKeys) {
      if (typeof key === 'string' && !classKeys.has(key) && key !== 'constructor' && !key.startsWith('_')) {
        data[key] = instance[key]
      }
    }
    return data
  }
}
