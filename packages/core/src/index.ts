export {
  deepClone,
  deepMerge,
  debounce,
  throttle,
  memoize,
  retry,
  noop,
  identity,
  once,
} from './core/index.js'

export type {
  DebounceOptions,
  DebouncedFunction,
  MemoizedFunction,
  RetryOptions,
} from './core/index.js'

export {
  add,
  sub,
  mul,
  div,
  round,
  floor,
  ceil,
  approxEqual,
  clamp,
  sum,
  average,
  randomInt,
  inRange,
  DivisionByZeroError,
} from './math/index.js'

export {
  formatDate,
  parseDate,
  dateDiff,
  addDays,
  addMonths,
  addYears,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isWeekend,
  isLeapYear,
  isBefore,
  isAfter,
  isBetween,
  isBusinessDay,
  addBusinessDays,
  calculateAge,
  InvalidDateError,
} from './date/index.js'

export type { DateDiff } from './date/index.js'

export {
  hash,
  simpleHash,
  randomHex,
  base64Encode,
  base64Decode,
  generateToken,
  generateOTP,
  xorCipher,
  checksum,
  constantTimeEqual,
} from './crypto/index.js'

export {
  join,
  resolve,
  basename,
  dirname,
  extname,
  normalize,
  isAbsolute,
  relative,
  parse,
  format,
} from './path/index.js'

export type { ParsedPath } from './path/index.js'

export {
  groupBy,
  keyBy,
  omit,
  pick,
  pluck,
  shuffle,
  sample,
  sampleSize,
  chunk,
  sortBy,
  orderBy,
  uniqueBy,
  flatten,
  uniq,
  first,
  last,
  isEmpty,
} from './collection/index.js'

export {
  capitalize,
  camelCase,
  kebabCase,
  snakeCase,
  pascalCase,
  truncate,
  template,
  uuid,
  nanoid,
  escapeHtml,
  unescapeHtml,
  trim,
  trimStart,
  trimEnd,
  pad,
  padStart,
  padEnd,
  reverse,
  words,
  slugify,
  countOccurrences,
} from './string/index.js'

export {
  sleep,
  timeout,
  raceWithTimeout,
  allSettledMap,
  parallelMap,
  retryAsync,
  pipeline,
  deferred,
} from './async/index.js'

export type { Deferred } from './async/index.js'

export {
  parseCsv,
  stringifyCsv,
  safeJsonParse,
  env,
  envInt,
  envBool,
} from './io/index.js'

export type { CsvOptions } from './io/index.js'

export {
  isString,
  isNumber,
  isBoolean,
  isObject,
  isArray,
  isFunction,
  isDate,
  isRegExp,
  isMap,
  isSet,
  isPromise,
  isNull,
  isUndefined,
  isNil,
  assertDefined,
  assertType,
  ensureArray,
  castArray,
  getType,
} from './type/index.js'

// ─── dep-exray (dependency scanner) ───────────────────────────
export {
  scanProject,
  generateReport,
  analyzeUsage,
  KNOWN_MAPPINGS,
  KNOWN_CVES,
} from './dep-exray/index.js'

export type {
  ScanResult,
  ReplacementSuggestion,
  SecurityIssue,
  DependencyInfo,
  ScannerConfig,
} from './dep-exray/index.js'

// ─── validation (Indonesia-specific) ────────────────────
export {
  isNIK,
  isNPWP,
  isPhone,
  isEmail,
  isURL,
} from './validation/index.js'

// ─── error (typed errors) ───────────────────────────────
export {
  createError,
  isTypedError,
  TypedError,
  MultiError,
  collectErrors,
} from './error/index.js'

export type { ErrorCode } from './error/index.js'

// ─── logger (structured logging) ────────────────────────
export {
  Logger,
  logger,
  consoleTransport,
} from './logger/index.js'

export type {
  LogLevel,
  Transport,
} from './logger/index.js'

export {
  createConsoleTransport,
  createJsonTransport,
  createFileTransport,
  createBufferedTransport,
} from './logger/transports.js'
