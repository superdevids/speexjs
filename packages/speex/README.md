# speexkit

**400+ functions · 0 dependencies · 19 modules · 1,477 tests**

The JavaScript/TypeScript utility toolkit — NDArray, machine learning, statistics, validation, functional programming, date/time, async concurrency, and more.

`ash
npm install speexkit
`

## Quick Start

`	ypescript
import { NDArray } from 'speexkit/nlarray'
import { StandardScaler, LinearRegression } from 'speexkit/ml'
import { normalPDF, ttestInd } from 'speexkit/stats'
import { histogram, kde, colorMap } from 'speexkit/viz-data'
import { curry, pipe } from 'speexkit/nlfunction'
import { formatDate, timeAgo } from 'speexkit/date'
import { isEmail, isStrongPassword, isCreditCard } from 'speexkit/validation'

// NDArray — NumPy-style arrays
NDArray.arange(12).reshape([3, 4]).sum(1) // [6, 22, 38]

// ML — scikit-learn style
const scaler = new StandardScaler()
scaler.fit([[1, 2], [3, 4], [5, 6]])
const X = scaler.transform([[1, 2]])

// Statistics — SciPy style
normalPDF(0) // ~0.3989
ttestInd([1, 2, 3], [4, 5, 6])

// Functional
pipe((x: number) => x + 1, (x: number) => x * 2)(5) // 12

// Date & validation
timeAgo(new Date(Date.now() - 5000)) // "5 seconds ago"
isStrongPassword('P@ssw0rd!') // true
`

## Modules

| Module | Description | Subpath |
|--------|-------------|---------|
| **Core** | deepClone, deepMerge, pipe, memoize, debounce | speexkit |
| **Math** | Safe float, median, stddev, percentile, factorial | speexkit/math |
| **Date** | formatDate, timeAgo, addDays, timezone, parseDuration | speexkit/date |
| **String** | slugify, uuid, camelCase, levenshtein, fuzzyMatch | speexkit/string |
| **Async** | Queue, Semaphore, RateLimiter, Mutex, retryAsync | speexkit/async |
| **Validation** | isEmail, isIP, isUUID, isCreditCard, isStrongPassword | speexkit/validation |
| **Collection** | groupBy, sortBy, deepGet, pickBy, mapValues, invert | speexkit/collection |
| **ML** 🆕 | StandardScaler, LinearRegression, KMeans, KNN, PCA | speexkit/ml |
| **Stats** 🆕 | normalPDF, ttestInd, skewness, pearsonCorrelation | speexkit/stats |
| **Viz** 🆕 | histogram, kde, boxPlotData, colorMap | speexkit/viz-data |
| **Functional** | curry, pipe, ifElse, when, memoizeSync, converge | speexkit/nlfunction |
| **NDArray** | NumPy-like arrays with broadcasting, slicing, matmul | speexkit/nlarray |
| **Color** | hexToRgb, lighten, darken, contrastRatio, meetsWCAG | speexkit/color |
| **Error** | TypedError, MultiError, createError | speexkit/error |
| **Logger** | Structured logger with console/JSON/file transports | speexkit/logger |
| **Crypto** | generateToken, base64, randomHex | speexkit/crypto |
| **Type** | 28 type guards: isString, isNil, isPlainObject, getType | speexkit/type |
| **IO/Path** | CSV, safe JSON, env helpers, cross-platform path | speexkit/io, speexkit/path |
| **dep-exray** | Dependency scanner + CLI | speexkit/dep-exray |

📖 [Full module reference →](./SUMMARY.md)

**License:** MIT