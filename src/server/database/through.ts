// HasOneThrough / HasManyThrough
// Example: Mechanic -> Car -> Owner  =>  Mechanic.owner (through Car)
// SQL: SELECT * FROM owners INNER JOIN cars ON cars.owner_id = owners.id WHERE cars.mechanic_id = ?
export class ThroughResolver {
  // Placeholder for future implementation
}
