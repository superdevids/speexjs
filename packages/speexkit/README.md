# SpeexKit

JavaScript/TypeScript utility toolkit - 400+ functions, 19 modules, zero dependencies.

```bash
npm install speexkit
```

---

## Features

- NDArray - NumPy-style arrays: broadcasting, slicing, matmul, axis reductions
- ML - StandardScaler, LinearRegression, KMeans, KNN, PCA
- Stats - normalPDF, ttestInd, skewness, pearsonCorrelation, kurtosis
- Viz - histogram, kde, boxPlotData, ecdf, colorMap
- Functional - curry, pipe, ifElse, when, unless, converge, memoizeSync
- Validation - isEmail, isIP, isUUID, isCreditCard, isStrongPassword (21 validators)
- Date - formatDate, timeAgo, addBusinessDays, parseDuration, timezone
- Async - Queue, Semaphore, RateLimiter, Mutex, debounceAsync
- Collection - groupBy, topoSort, deepGet, pickBy, mapValues, diff
- Math - safe float, median, stddev, percentile, correlation, factorial
- String - slugify, uuid, nanoid, camelCase, levenshtein, fuzzyMatch
- 28 type guards - isString, isNil, isPlainObject, isTypedArray, getType

---

## Quick Examples

```typescript
import { NDArray } from "speexkit/nlarray";
import { StandardScaler } from "speexkit/ml";
import { normalPDF, ttestInd } from "speexkit/stats";
import { histogram, colorMap } from "speexkit/viz-data";
import { curry, pipe } from "speexkit/nlfunction";
import { formatDate, timeAgo } from "speexkit/date";
import { isEmail, isStrongPassword } from "speexkit/validation";

// NDArray - NumPy-style arrays
const arr = NDArray.arange(12).reshape([3, 4]);
arr.sum(1); // [6, 22, 38]

// ML - StandardScaler
const scaler = new StandardScaler();
scaler.fit([
	[1, 2],
	[3, 4],
	[5, 6],
]);
scaler.transform([[1, 2]]);

// Stats - t-test
ttestInd([1, 2, 3], [4, 5, 6]);

// Functional
const add = curry((a, b) => a + b);
add(1)(2); // 3
pipe(
	(x) => x + 1,
	(x) => x * 2,
)(5); // 12

// Date and validation
timeAgo(new Date(Date.now() - 5000));
isEmail("user@example.com");
isStrongPassword("P@ssw0rd!");
```

---

## Modules

| Subpath             | Description                                                          |
| ------------------- | -------------------------------------------------------------------- |
| speexkit/core       | deepClone, deepMerge, pipe, memoize, debounce, throttle              |
| speexkit/math       | Safe float, median, stddev, percentile, correlation, factorial       |
| speexkit/date       | formatDate, timeAgo, addDays, business days, timezone, parseDuration |
| speexkit/string     | slugify, uuid, nanoid, camelCase, levenshtein, fuzzyMatch            |
| speexkit/async      | Queue, Semaphore, RateLimiter, Mutex, retryAsync, debounceAsync      |
| speexkit/validation | isEmail, isIP, isUUID, isCreditCard, isStrongPassword (21)           |
| speexkit/collection | groupBy, topoSort, deepGet, pickBy, mapValues, diff                  |
| speexkit/ml         | StandardScaler, LinearRegression, KMeans, KNN, PCA                   |
| speexkit/stats      | normalPDF, ttestInd, skewness, pearsonCorrelation                    |
| speexkit/viz-data   | histogram, kde, boxPlotData, ecdf, colorMap                          |
| speexkit/nlarray    | NDArray class + ufuncs (sin, cos, exp, log, sqrt)                    |
| speexkit/nlfunction | curry, pipe, tap, memoizeSync, combinators                           |
| speexkit/crypto     | generateToken, generateOTP, base64, randomHex                        |
| speexkit/color      | hexToRgb, hexToHsl, lighten, darken, contrastRatio, meetsWCAG        |
| speexkit/error      | createError, TypedError, MultiError                                  |
| speexkit/logger     | Structured logger with console/JSON/file transports                  |
| speexkit/io         | parseCsv, safeJsonParse, safeJsonStringify, env helpers              |
| speexkit/path       | join, resolve, basename, dirname, extname                            |
| speexkit/type       | 28 type guards: isString, isNil, isPlainObject, getType              |
| speexkit/dep-exray  | Dependency scanner + CLI                                             |

---

## Comparison

| Feature             | speexkit | lodash | mathjs      | date-fns |
| ------------------- | -------- | ------ | ----------- | -------- |
| Zero dependencies   | YES      | NO     | NO          | YES      |
| NDArray (NumPy)     | YES      | NO     | YES (heavy) | NO       |
| ML (scikit-learn)   | YES      | NO     | NO          | NO       |
| Stats (SciPy)       | YES      | NO     | NO          | NO       |
| Async concurrency   | YES      | NO     | NO          | NO       |
| Validation (21 fns) | YES      | NO     | NO          | NO       |
| Bundle size (gzip)  | ~25 KB   | ~71 KB | ~200 KB     | ~1 KB/fn |

---

## Test and Quality

- 1,477 tests across 24 test files - all passing
- 0 runtime dependencies
- TypeScript strict - full .d.ts declarations
- Tree-shakeable - ESM with sideEffects: false
- MIT license

---

Links: github.com/superdevids/speexjs
