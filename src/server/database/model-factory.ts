import { Factory, Faker } from './factory.js'
import type { Model } from './model.js'

export function defineFactory<T extends typeof Model>(
  _model: T,
  callback: (faker: Faker, index: number) => Partial<InstanceType<T>>,
): Factory<Partial<InstanceType<T>>> {
  return new Factory(callback as unknown as (faker: Faker, index: number) => Partial<Record<string, unknown>>) as unknown as Factory<Partial<InstanceType<T>>>
}
