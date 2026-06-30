const EN: Record<string, string> = {
  required: 'Value is required',
  type_string: 'Expected a string',
  type_number: 'Expected a number',
  type_boolean: 'Expected a boolean',
  type_bigint: 'Expected a BigInt',
  type_symbol: 'Expected a Symbol',
  type_undefined: 'Expected undefined',
  type_null: 'Expected null',
  type_nan: 'Expected NaN',
  type_object: 'Expected an object',
  type_array: 'Expected an array',
  type_date: 'Expected a valid date',
  type_function: 'Expected a function',
  type_string_or_number: 'Expected a string or number',
  string_min: 'Minimum {min} characters',
  string_max: 'Maximum {max} characters',
  string_length: 'Exactly {length} characters required',
  string_email: 'Invalid email format',
  string_url: 'Invalid URL format',
  string_regex: 'Format does not match expected pattern',
  string_includes: 'Must contain "{substring}"',
  string_starts_with: 'Must start with "{prefix}"',
  string_ends_with: 'Must end with "{suffix}"',
  number_min: 'Minimum value is {min}',
  number_max: 'Maximum value is {max}',
  number_int: 'Expected an integer',
  number_positive: 'Expected a positive number',
  number_negative: 'Expected a negative number',
  number_finite: 'Expected a finite number',
  number_safe: 'Expected a safe integer',
  array_min: 'Minimum {min} items',
  array_max: 'Maximum {max} items',
  array_length: 'Exactly {length} items required',
  array_nonempty: 'Array must not be empty',
  array_unique: 'All items must be unique',
  object_strict: 'Unexpected key: "{key}"',
  enum_invalid: 'Value must be one of: {values}',
  tuple_length: 'Tuple must have exactly {length} items',
  union_fail: 'Value does not match any schema',
  intersection_fail: 'Value does not match intersection schema',
  literal_fail: 'Value must be {expected}',
  refine_fail: '{message}',
  date_invalid: 'Invalid date',
  date_not_date: 'Value must be a valid date',
  coerce_number_fail: 'Value cannot be coerced to a number',
  coerce_boolean_fail: 'Value cannot be coerced to a boolean',
  coerce_date_fail: 'Value cannot be coerced to a date',
  map_not_map: 'Expected a Map',
  set_not_set: 'Expected a Set',
  discriminator_missing: 'Missing discriminator key "{key}"',
  discriminator_invalid: 'Invalid discriminator value "{value}" for key "{key}". Expected one of: {expected}',
}

const store: Record<string, string> = { ...EN }

export function msg(key: string, params?: Record<string, string | number | undefined>): string {
  let template = store[key]
  if (!template) return key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      template = template.replace(`{${k}}`, v !== undefined ? String(v) : '')
    }
  }
  return template
}

export function setLocale(_locale: 'en'): void {
  const source = EN
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      store[key] = source[key]!
    }
  }
}

export function getLocale(): 'en' {
  return 'en'
}
