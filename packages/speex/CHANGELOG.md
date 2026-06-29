# Changelog — speex-kit

## [0.8.0] - 2026-06-29

### Added
- **nlarray** — NumPy-like NDArray with broadcasting, slicing, matmul, axis reductions, concatenation, ufuncs
- **nlfunction** — curry, partial, tap, memoizeSync, negate, flow, tryCatch, attempt, property, converge, flip, after, ifElse, when, unless, curryRight
- **validation** — 18 new validators: isIP, isUUID, isAlpha, isAlphanumeric, isNumeric, isInt, isFloat, isLength, isJSON, isStrongPassword, isBase64, matches, isCreditCard, isHexadecimal, isSlug, isPort
- **collection** — 18 object/dict operations: pickBy, omitBy, mapKeys, mapValues, invert, invertBy, toPairs, fromPairs, hasPath, unset, mergeWith, defaults, defaultsDeep, deepFreeze, at, renameKeys, diff, fromKeys
- **type** — isError, isSymbol, isWeakMap, isWeakSet, isTypedArray, isDataView, isArguments
- **string** — escapeRegExp, upperFirst, lowerFirst, startCase, lowerCase, upperCase, lines, chars
- **async** — mapSeries, eachSeries, detect, debounceAsync
- **date** — addHours, addMinutes, addSeconds, subDays, subMonths, subYears, isEqual, unix, fromUnix, startOfWeek, endOfWeek
- **color** — rgbToHsl, hslToRgb, saturate, desaturate, adjustHue, rgba
- **io** — safeJsonStringify, envArray
- 1,477 tests across 24 test files

### Changed
- Removed Indonesia-specific validators and localization
- timeAgo/timeRemaining default locale changed to 'en' (English)
- Full English documentation

## [0.7.0] - 2026-06-28

### Added
- color, error, logger modules
- deepEqual, pipe, compose
- Queue, Semaphore, memoizeAsync, RateLimiter, Mutex, batch, waterfall
- Math: median, stddev, percentile, correlation, formatCurrency
- Date: timeAgo, timeRemaining, Duration, formatDuration, timezone helpers
- Validation: isPhone, isEmail, isURL
- Collection: deepGet, deepSet, topoSort, slidingWindows
- dep-exray: dependency scanner + CLI
- 828 tests across 19 test files

### Fixed
- Floating-point rounding, leap year detection
- Prototype pollution, ReDoS edge cases
