let currentLocale: 'id' | 'en' = 'id'

const ID: Record<string, string> = {
  required: 'Nilai wajib diisi',
  type_string: 'Nilai harus berupa teks',
  type_number: 'Nilai harus berupa angka',
  type_boolean: 'Nilai harus berupa boolean',
  type_bigint: 'Nilai harus berupa BigInt',
  type_symbol: 'Nilai harus berupa Symbol',
  type_undefined: 'Nilai harus berupa undefined',
  type_null: 'Nilai harus berupa null',
  type_nan: 'Nilai harus berupa NaN',
  type_object: 'Nilai harus berupa objek',
  type_array: 'Nilai harus berupa array',
  type_date: 'Nilai harus berupa tanggal yang valid',
  type_function: 'Nilai harus berupa fungsi',
  type_string_or_number: 'Nilai harus berupa teks atau angka',
  string_min: 'Panjang minimal {min} karakter',
  string_max: 'Panjang maksimal {max} karakter',
  string_length: 'Panjang harus tepat {length} karakter',
  string_email: 'Format email tidak valid',
  string_url: 'Format URL tidak valid',
  string_regex: 'Format tidak sesuai dengan pola yang diharapkan',
  string_includes: 'Teks harus mengandung "{substring}"',
  string_starts_with: 'Teks harus diawali dengan "{prefix}"',
  string_ends_with: 'Teks harus diakhiri dengan "{suffix}"',
  number_min: 'Nilai minimal {min}',
  number_max: 'Nilai maksimal {max}',
  number_int: 'Nilai harus bilangan bulat',
  number_positive: 'Nilai harus positif',
  number_negative: 'Nilai harus negatif',
  number_finite: 'Nilai harus terbatas (finite)',
  number_safe: 'Nilai harus dalam batas safe integer',
  array_min: 'Panjang array minimal {min}',
  array_max: 'Panjang array maksimal {max}',
  array_length: 'Panjang array harus tepat {length}',
  array_nonempty: 'Array tidak boleh kosong',
  array_unique: 'Semua elemen array harus unik',
  object_strict: 'Key "{key}" tidak dikenal',
  enum_invalid: 'Nilai harus salah satu dari: {values}',
  tuple_length: 'Tuple harus memiliki tepat {length} elemen',
  union_fail: 'Nilai tidak cocok dengan skema apapun',
  intersection_fail: 'Nilai tidak cocok dengan interseksi skema',
  literal_fail: 'Nilai harus tepat {expected}',
  refine_fail: '{message}',
  date_invalid: 'Tanggal tidak valid',
  date_not_date: 'Nilai harus berupa tanggal yang valid',
  indonesia_nik: 'NIK harus 16 digit dan memenuhi format yang valid',
  indonesia_npwp: 'NPWP tidak valid',
  indonesia_phone: 'Nomor telepon Indonesia tidak valid',
  indonesia_alamat: 'Alamat tidak valid (minimal 10 karakter, harus mengandung unsur jalan/RT/RW)',
  indonesia_kodepos: 'Kode pos harus 5 digit angka',
  indonesia_rekening: 'Nomor rekening harus 10-16 digit angka',
  coerce_number_fail: 'Nilai tidak dapat dikonversi menjadi angka',
  coerce_date_fail: 'Nilai tidak dapat dikonversi menjadi tanggal',
  map_not_map: 'Nilai harus berupa Map',
  set_not_set: 'Nilai harus berupa Set',
}

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
  indonesia_nik: 'NIK must be 16 digits with valid format',
  indonesia_npwp: 'Invalid NPWP format',
  indonesia_phone: 'Invalid Indonesian phone number',
  indonesia_alamat: 'Invalid address (min 10 characters, must contain street/RT/RW elements)',
  indonesia_kodepos: 'Postal code must be 5 digits',
  indonesia_rekening: 'Bank account number must be 10-16 digits',
  coerce_number_fail: 'Value cannot be coerced to a number',
  coerce_date_fail: 'Value cannot be coerced to a date',
  map_not_map: 'Expected a Map',
  set_not_set: 'Expected a Set',
}

const store: Record<string, string> = { ...ID }

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

export function setLocale(locale: 'id' | 'en'): void {
  currentLocale = locale
  const source = locale === 'id' ? ID : EN
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      store[key] = source[key]!
    }
  }
}

export function getLocale(): 'id' | 'en' {
  return currentLocale
}
