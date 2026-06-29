# SpeexKit - Module Reference

v0.8.4 | 400+ exports | 19 modules | 0 deps | 1,477 tests

npm install speexkit

## Modules

### core

deepClone, deepMerge, deepEqual, pipe, compose, debounce, throttle, memoize, retry, noop, identity, once

### math

add, sub, mul, div, round, floor, ceil, approxEqual, clamp, sum, average, median, mode, stddev, sampleStddev, percentile, correlation, formatCurrency, isEven, isOdd, gcd, lcm, factorial, isPrime, toRadians, toDegrees, lerp, percentageOf, mapRange, range, weightedAverage, geometricMean, combinations, permutations, DivisionByZeroError

### date

formatDate, parseDate, dateDiff, addDays, addMonths, addYears, addHours, addMinutes, addSeconds, subDays, subMonths, subYears, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfWeek, endOfWeek, isWeekend, isLeapYear, isBefore, isAfter, isBetween, isBusinessDay, addBusinessDays, calculateAge, timeAgo, timeRemaining, formatDuration, toTimezone, formatInTimezone, isToday, isYesterday, isTomorrow, isPast, isFuture, isSameDay, isEqual, unix, fromUnix, daysInMonth, dayOfYear, weekOfYear, quarter, maxDate, minDate, nextMonday-nextSunday, lastMonday-lastSunday, parseDuration, InvalidDateError

### string

capitalize, camelCase, kebabCase, snakeCase, pascalCase, upperFirst, lowerFirst, startCase, lowerCase, upperCase, truncate, template, uuid, nanoid, escapeHtml, unescapeHtml, trim, trimStart, trimEnd, pad, padStart, padEnd, reverse, words, slugify, countOccurrences, levenshtein, fuzzyMatch, maskString, formatBytes, randomString, randomBoolean, pluralize, stripHtml, truncateWords, isPalindrome, isAnagram, similarity, dedent, wordCount, swapCase, toCobolCase, charCount, escapeRegExp, lines, chars

### async

sleep, timeout, raceWithTimeout, allSettledMap, parallelMap, retryAsync, pipeline, deferred, Queue, Semaphore, memoizeAsync, RateLimiter, Mutex, batch, waterfall, mapSeries, eachSeries, detect, debounceAsync

### validation

isPhone, isEmail, isURL, isIP, isIPv4, isIPv6, isUUID, isAlpha, isAlphanumeric, isNumeric, isInt, isFloat, isLength, isJSON, isStrongPassword, isBase64, matches, isCreditCard, isHexadecimal, isSlug, isPort

### collection

groupBy, keyBy, omit, pick, pluck, shuffle, sample, sampleSize, chunk, sortBy, orderBy, uniqueBy, flatten, uniq, first, last, isEmpty, topoSort, slidingWindows, tumblingWindows, deepGet, deepSet, partition, compact, difference, differenceBy, differenceWith, intersection, intersectionBy, intersectionWith, union, unionBy, unionWith, zip, zipWith, unzip, countBy, maxBy, minBy, sumBy, findIndex, findLast, findLastIndex, drop, dropRight, take, takeRight, without, nth, pickBy, omitBy, mapKeys, mapValues, invert, invertBy, toPairs, fromPairs, hasPath, unset, mergeWith, defaults, defaultsDeep, deepFreeze, at, renameKeys, diff, fromKeys, findKey, forOwn, times, flattenDeep, flatMap

### crypto

hash, simpleHash, randomHex, base64Encode, base64Decode, generateToken, generateOTP, xorCipher, checksum, constantTimeEqual

### path

join, resolve, basename, dirname, extname, normalize, isAbsolute, relative, parse, format

### color

hexToRgb, rgbToHex, hexToHsl, hslToHex, lighten, darken, mix, contrastRatio, meetsWCAG, isValidHex, randomColor, isLight, isDark, complementary, alpha, rgbToHsl, hslToRgb, saturate, desaturate, adjustHue, rgba

### error

createError, isTypedError, TypedError, MultiError, collectErrors

### logger

Logger, logger, consoleTransport, createConsoleTransport, createJsonTransport, createFileTransport, createBufferedTransport

### io

parseCsv, stringifyCsv, safeJsonParse, safeJsonStringify, env, envInt, envBool, envArray

### type

isString, isNumber, isBoolean, isObject, isArray, isFunction, isDate, isRegExp, isMap, isSet, isPromise, isNull, isUndefined, isNil, isEmpty, assertDefined, assertType, ensureArray, castArray, isPlainObject, isError, isSymbol, isWeakMap, isWeakSet, isTypedArray, isDataView, isArguments, getType

### nlarray

NDArray class: zeros, ones, full, eye, identity, arange, linspace, logspace, random, randn, from, reshape, flatten, ravel, transpose, slice, squeeze, repeat, add, sub, mul, div, pow, mod, abs, neg, clip, round, floor, ceil, sum, mean, var, std, min, max, argmin, argmax, cumsum, cumprod, all, any, nonzero, dot, matmul, norm, diagonal, trace, pad, where, map, apply, copy, equals, toArray, toList, toString, get, set, fill. Ufuncs: sin, cos, tan, exp, log, log2, log10, sqrt, abs, round, floor, ceil, clip, concatenate, stack, hstack, vstack

### nlfunction

curry, curryRight, partial, partialRight, tap, trace, memoizeSync, memoizeLast, negate, before, after, id, constant, over, apply, comparing, wrapArray, flow, tryCatch, attempt, property, converge, flip, ifElse, when, unless, debounce, throttle, once

### ml

StandardScaler, MinMaxScaler, LinearRegression, KMeans, KNN, PCA, trainTestSplit, confusionMatrix, accuracyScore, r2Score, meanSquaredError, meanAbsoluteError, euclideanDistance, manhattanDistance, cosineSimilarity

### stats

gammaLn, erf, normalPDF, normalCDF, binomialPMF, poissonPMF, skewness, kurtosis, quantile, iqr, covariance, entropy, ttestInd, pearsonCorrelation, spearmanCorrelation

### viz-data

sturgesBins, freedmanDiaconisBins, histogram, kde, boxPlotData, ecdf, colorMap

### dep-exray

scanProject, generateReport, analyzeUsage, KNOWN_MAPPINGS, KNOWN_CVES. CLI: npx dep-exray .
