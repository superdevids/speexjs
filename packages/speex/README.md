# speexkit

**JavaScript/TypeScript utility toolkit** — 400+ functions, 19 modules, **zero dependencies**.

```bash
npm install speexkit
```

---

## Features

- **NDArray** — NumPy-style arrays: broadcasting, slicing, matmul, axis reductions
- **ML** 🆕 — StandardScaler, LinearRegression, KMeans, KNN, PCA
- **Stats** 🆕 — normalPDF, ttestInd, skewness, pearsonCorrelation, kurtosis
- **Viz** 🆕 — histogram, kde, boxPlotData, ecdf, colorMap (viridis, plasma, etc.)
- **Functional** — curry, pipe, ifElse, when, unless, converge, memoizeSync
- **Validation** — isEmail, isIP, isUUID, isCreditCard, isStrongPassword (21 validators)
- **Date** — formatDate, timeAgo, addBusinessDays, parseDuration, timezone
- **Async** — Queue, Semaphore, RateLimiter, Mutex, debounceAsync
- **Collection** — groupBy, topoSort, deepGet, pickBy, mapValues, diff
- **Math** — safe float arithmetic, median, stddev, percentile, correlation, factorial
- **String** — slugify, uuid, nanoid, levenshtein, fuzzyMatch, escapeHtml
- **28 type guards** — isString, isNil, isPlainObject, isTypedArray, getType

---

## Quick Examples

```typescript
import { NDArray } from 'speexkit/nlarray'
import { StandardScaler } from 'speexkit/ml'
import { normalPDF, ttestInd } from 'speexkit/stats'
import { histogram, colorMap } from 'speexkit/viz-data'
import { curry, pipe } from 'speexkit/nlfunction'
import { formatDate, timeAgo } from 'speexkit/date'
import { isEmail, isStrongPassword } from 'speexkit/validation'

// NDArray — NumPy-style arrays
const arr = NDArray.arange(12).reshape([3, 4])
arr.sum(1) // [6, 22, 38]

// Broadcasting
NDArray.arange(3).reshape([1, 3]).add(NDArray.arange(3).reshape([3, 1]))

// Matrix multiplication
NDArray.from([[1,2],[3,4]]).matmul(NDArray.from([[5,6],[7,8]]))

// ML — StandardScaler
const scaler = new StandardScaler()
scaler.fit([[1, 2], [3, 4], [5, 6]])
scaler.transform([[1, 2]]) // scaled values

// Stats — t-test and PDF
ttestInd([1, 2, 3], [4, 5, 6])
normalPDF(0) // ~0.3989

// Functional
const add = curry((a: number, b: number) => a + b)
add(1)(2) // 3
pipe((x: number) => x + 1, (x: number) => x * 2)(5) // 12

// Viz data preparation
histogram([1, 1, 2, 2, 3, 3], { bins: 3 })
colorMap('viridis', 256) // hex color array

// Date & validation
timeAgo(new Date(Date.now() - 5000)) // "5 seconds ago"
isEmail('user@example.com') // true
isStrongPassword('P@ssw0rd!') // true
```

---

## Modules

| Subpath | Key Contents |
|---------|-------------|
| `speexkit` / `speexkit/core` | deepClone, deepMerge, pipe, memoize, debounce, throttle |
| `speexkit/math` | Safe float math, median, stddev, percentile, correlation, factorial |
| `speexkit/date` | formatDate, timeAgo, addDays, business days, timezone, parseDuration |
| `speexkit/string` | slugify, uuid, nanoid, camelCase, levenshtein, fuzzyMatch |
| `speexkit/async` | Queue, Semaphore, RateLimiter, Mutex, retryAsync, debounceAsync |
| `speexkit/validation` | isEmail, isPhone, isURL, isIP, isUUID, isCreditCard, isStrongPassword |
| `speexkit/collection` | groupBy, sortBy, topoSort, deepGet, pickBy, mapValues, diff |
| `speexkit/crypto` | generateToken, generateOTP, base64, randomHex |
| `speexkit/path` | join, resolve, basename, dirname, extname (cross-platform) |
| `speexkit/color` | hexToRgb, hexToHsl, lighten, darken, contrastRatio, meetsWCAG |
| `speexkit/error` | createError, TypedError, MultiError |
| `speexkit/logger` | Structured logger with console/JSON/file transports |
| `speexkit/io` | parseCsv, safeJsonParse, safeJsonStringify, env helpers |
| `speexkit/type` | 28 type guards: isString, isNil, isPlainObject, getType |
| `speexkit/nlarray` | NDArray class + ufuncs (sin, cos, exp, log, sqrt) |
| `speexkit/nlfunction` | curry, pipe, tap, memoizeSync, combinators |
| `speexkit/ml` 🆕 | StandardScaler, LinearRegression, KMeans, KNN, PCA |
| `speexkit/stats` 🆕 | normalPDF, ttestInd, skewness, pearsonCorrelation |
| `speexkit/viz-data` 🆕 | histogram, kde, boxPlotData, ecdf, colorMap |
| `speexkit/dep-exray` | Dependency scanner (CLI: `npx dep-exray .`) |

---

## Why speexkit?

| Feature | speexkit | lodash | mathjs | date-fns |
|---------|----------|--------|--------|----------|
| Zero dependencies | ✅ | ❌ | ❌ | ✅ |
| NDArray (NumPy) | ✅ | ❌ | ✅ (heavy) | ❌ |
| ML (scikit-learn) | ✅ | ❌ | ❌ | ❌ |
| Stats (SciPy) | ✅ | ❌ | ❌ | ❌ |
| Async concurrency | ✅ | ❌ | ❌ | ❌ |
| Validation | ✅ | ❌ | ❌ | ❌ |
| Tree-shakeable | ✅ | 🟡 | ❌ | ✅ |
| Bundle size | ~25 KB gzip | ~71 KB | ~200 KB | ~1 KB/fn |

---

## Test & Quality

- **1,477 tests** across 24 test files — all passing
- **0 runtime dependencies**
- **TypeScript strict** — full `.d.ts` declarations
- **Tree-shakeable** — ESM with `sideEffects: false`
- **MIT license**

---

## Links

- [Full documentation](https://github.com/superdevids/speexjs/blob/master/packages/speex/SUMMARY.md)
- [Changelog](https://github.com/superdevids/speexjs/blob/master/packages/speex/CHANGELOG.md)
- [GitHub](https://github.com/superdevids/speexjs)
