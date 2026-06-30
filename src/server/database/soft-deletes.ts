export interface SoftDeletable {
  deletedAt?: Date | null
}

export function withSoftDeletes(query: any): any {
  return {
    ...query,
    whereNotDeleted() {
      return query.whereNull('deleted_at')
    },
    onlyDeleted() {
      return query.whereNotNull('deleted_at')
    },
    withTrashed() {
      return query
    },
  }
}
