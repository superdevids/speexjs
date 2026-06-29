// ─── NumPy-style NDArray for JavaScript/TypeScript ────────────────────
// Zero-dependency vectorized array operations with broadcasting support.
// Inspired by NumPy (numpy.org). All operations are pure unless noted.

// ═══════════════════════════════════════════════════════════════════════
//  Internal Helper Functions
// ═══════════════════════════════════════════════════════════════════════

/**
 * Compute the total number of elements from a shape array.
 * @internal
 */
function shapeSize(shape: number[]): number {
  let size = 1
  for (let i = 0; i < shape.length; i++) {
    size *= shape[i]!
  }
  return size
}

/**
 * Compute row-major (C-order) strides from a shape array.
 * stride[i] = product of shape[i+1..n-1]
 * @internal
 */
function computeStrides(shape: readonly number[]): number[] {
  const strides = new Array<number>(shape.length)
  if (shape.length === 0) return strides
  strides[shape.length - 1] = 1
  for (let i = shape.length - 2; i >= 0; i--) {
    strides[i] = strides[i + 1]! * shape[i + 1]!
  }
  return strides
}

/**
 * Convert multi-dimensional indices to a flat index using strides.
 * @internal
 */
function ravelIndex(indices: number[], strides: number[]): number {
  let idx = 0
  for (let i = 0; i < indices.length; i++) {
    idx += indices[i]! * strides[i]!
  }
  return idx
}

/**
 * Convert a flat index to multi-dimensional indices.
 * @internal
 */
function unravelIndex(index: number, shape: number[]): number[] {
  const strides = computeStrides(shape)
  const indices = new Array<number>(shape.length)
  let remaining = index
  for (let i = 0; i < shape.length; i++) {
    indices[i] = Math.floor(remaining / strides[i]!)
    remaining %= strides[i]!
  }
  return indices
}

/**
 * Compute the broadcast shape for multiple shapes (NumPy broadcasting rules).
 * 1. Align shapes from the right.
 * 2. Dimensions of size 1 broadcast to any size.
 * 3. Dimensions must be equal or one must be 1.
 * @throws If shapes cannot be broadcast together.
 * @internal
 */
function broadcastShapes(...shapes: number[][]): number[] {
  if (shapes.length === 0) return []
  if (shapes.length === 1) return [...shapes[0]!]

  const maxDims = Math.max(...shapes.map((s) => s.length))
  const result = new Array<number>(maxDims).fill(1)

  for (const shape of shapes) {
    const pad = maxDims - shape.length
    for (let i = 0; i < shape.length; i++) {
      const dim = shape[i]!
      const idx = pad + i
      if (dim === 1) continue
      if (result[idx] === 1) {
        result[idx] = dim
      } else if (result[idx] !== dim) {
        throw new Error(
          `Shapes cannot be broadcast together: [${shapes.map((s) => `[${s}]`).join(', ')}]`,
        )
      }
    }
  }

  return result
}

/**
 * Pad a shape to `targetDims` dimensions by prepending 1s.
 * @internal
 */
function padShape(shape: number[], targetDims: number): number[] {
  if (shape.length >= targetDims) return [...shape]
  const pad = new Array<number>(targetDims - shape.length).fill(1)
  return [...pad, ...shape]
}

/**
 * Apply a binary operation with broadcasting between two NDArrays.
 * @internal
 */
function broadcastBinaryOp<T>(
  a: T[],
  aShape: number[],
  b: T[],
  bShape: number[],
  op: (x: number, y: number) => number,
): { data: number[]; shape: number[] } {
  const resultShape = broadcastShapes(aShape, bShape)
  const resultSize = shapeSize(resultShape)
  const result = new Array<number>(resultSize)

  const aPad = padShape(aShape, resultShape.length)
  const bPad = padShape(bShape, resultShape.length)
  const aStrides = computeStrides(aPad)
  const bStrides = computeStrides(bPad)

  const counters = new Array<number>(resultShape.length).fill(0)

  for (let ri = 0; ri < resultSize; ri++) {
    let aIdx = 0
    let bIdx = 0
    for (let d = 0; d < resultShape.length; d++) {
      if (aPad[d]! > 1) aIdx += counters[d]! * aStrides[d]!
      if (bPad[d]! > 1) bIdx += counters[d]! * bStrides[d]!
    }

    result[ri] = op(a[aIdx] as unknown as number, b[bIdx] as unknown as number)

    // Increment multi-dimensional counters
    for (let d = resultShape.length - 1; d >= 0; d--) {
      const cd = counters[d]!
      counters[d] = cd + 1
      if (cd + 1 < resultShape[d]!) break
      counters[d] = 0
    }
  }

  return { data: result, shape: resultShape }
}

// ═══════════════════════════════════════════════════════════════════════
//  NDArray Class
// ═══════════════════════════════════════════════════════════════════════

/**
 * N-dimensional array class inspired by NumPy.
 *
 * Provides vectorized operations, broadcasting, reshaping, aggregation,
 * linear algebra, and statistical functions — all in pure JavaScript/TypeScript
 * with zero external dependencies.
 *
 * @typeParam T - The element type (defaults to `number`).
 *
 * @example
 * ```typescript
 * const a = NDArray.ones([2, 3])
 * const b = NDArray.arange(6).reshape([2, 3])
 * const c = a.add(b)       // element-wise addition
 * const d = c.sum(axis: 1) // sum along rows
 * ```
 */
export class NDArray<T = number> {
  /** Flat data storage (row-major / C-order). */
  private _data: T[]

  /** Shape of the array, e.g. [3, 4] for 3×4 matrix. */
  private _shape: number[]

  /** Row-major strides for index computation. */
  private _strides: number[]

  // ─── Constructor ─────────────────────────────────────────────────────

  /**
   * Create a new NDArray.
   *
   * @param data - Flat array `T[]` **or** 2D array of rows `T[][]`.
   * @param shape - Explicit shape when `data` is flat. Omit when `data` is `T[][]`.
   *
   * @throws If `shape` is provided and `data.length` does not match `product(shape)`.
   * @throws If `data` is `T[][]` with inconsistent row lengths.
   *
   * @example
   * ```typescript
   * const a = new NDArray([1, 2, 3, 4, 5, 6])         // 1D: shape [6]
   * const b = new NDArray([1, 2, 3, 4, 5, 6], [2, 3]) // 2D: shape [2, 3]
   * const c = new NDArray([[1, 2], [3, 4]])             // 2D: shape [2, 2]
   * ```
   */
  constructor(data: T[] | T[][], shape?: number[]) {
    if (data.length === 0) {
      this._data = []
      this._shape = shape ? [...shape] : [0]
      this._strides = computeStrides(this._shape)
      this._validateShape()
      return
    }

    if (Array.isArray(data[0])) {
      // ── T[][] — array of rows ──
      const rows = data as T[][]
      const numRows = rows.length
      const numCols = numRows > 0 ? rows[0]!.length : 0

      for (let i = 1; i < numRows; i++) {
        if (rows[i]!.length !== numCols) {
          throw new Error(
            `Inconsistent row lengths: row 0 has ${numCols}, row ${i} has ${rows[i]!.length}`,
          )
        }
      }

      this._data = new Array<T>(numRows * numCols)
      for (let i = 0; i < numRows; i++) {
        const row = rows[i]!
        const offset = i * numCols
        for (let j = 0; j < numCols; j++) {
          this._data[offset + j] = row[j] as T
        }
      }

      this._shape = shape || [numRows, numCols]
      this._strides = computeStrides(this._shape)
      this._validateShape()
    } else {
      // ── T[] — flat data ──
      this._data = [...(data as T[])]
      this._shape = shape ? [...shape] : [this._data.length]
      this._strides = computeStrides(this._shape)
      this._validateShape()
    }
  }

  /** @internal Validate that shape matches data length. */
  private _validateShape(): void {
    const expected = shapeSize(this._shape)
    if (expected !== this._data.length) {
      throw new Error(
        `Shape [${this._shape}] has ${expected} elements but data has ${this._data.length} elements`,
      )
    }
  }

  /** @internal Normalize a negative axis to a positive one. */
  private _normalizeAxis(axis: number): number {
    if (axis < 0) axis = this._shape.length + axis
    if (axis < 0 || axis >= this._shape.length) {
      throw new Error(
        `Axis ${axis} is out of bounds for array of dimension ${this._shape.length}`,
      )
    }
    return axis
  }

  // ─── Properties ─────────────────────────────────────────────────────

  /**
   * Flat data storage. **Do not mutate directly** — treat as read-only.
   */
  get data(): readonly T[] {
    return this._data
  }

  /**
   * Shape of the array, e.g. `[3, 4]` for a 3×4 matrix.
   */
  get shape(): readonly number[] {
    return this._shape
  }

  /**
   * Number of dimensions (axes).
   */
  get ndim(): number {
    return this._shape.length
  }

  /**
   * Total number of elements across all dimensions.
   */
  get size(): number {
    return this._data.length
  }

  /**
   * Transpose of the array (reverse all axes).
   * For 2D this is standard matrix transpose; for 1D it is a no-op.
   */
  get T(): NDArray<T> {
    return this.transpose()
  }

  // ═════════════════════════════════════════════════════════════════════
  //  Static Factories
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Create an array filled with zeros.
   *
   * @param shape - Shape of the output array.
   * @returns New NDArray filled with zeros.
   *
   * @example
   * ```typescript
   * NDArray.zeros([2, 3]) // [[0, 0, 0], [0, 0, 0]]
   * ```
   */
  static zeros(shape: number[]): NDArray<number> {
    const size = shapeSize(shape)
    const data = new Array<number>(size).fill(0)
    return new NDArray<number>(data, shape)
  }

  /**
   * Create an array filled with ones.
   *
   * @param shape - Shape of the output array.
   * @returns New NDArray filled with ones.
   *
   * @example
   * ```typescript
   * NDArray.ones([3]) // [1, 1, 1]
   * ```
   */
  static ones(shape: number[]): NDArray<number> {
    const size = shapeSize(shape)
    const data = new Array<number>(size).fill(1)
    return new NDArray<number>(data, shape)
  }

  /**
   * Create an array filled with a single scalar value.
   *
   * @param shape - Shape of the output array.
   * @param value - Fill value.
   * @returns New NDArray filled with `value`.
   *
   * @example
   * ```typescript
   * NDArray.full([2, 2], 7) // [[7, 7], [7, 7]]
   * ```
   */
  static full(shape: number[], value: number): NDArray<number> {
    const size = shapeSize(shape)
    const data = new Array<number>(size).fill(value)
    return new NDArray<number>(data, shape)
  }

  /**
   * Create an identity matrix (2-D array with ones on the diagonal, zeros elsewhere).
   *
   * @param n - Number of rows.
   * @param m - Number of columns (defaults to `n`).
   * @returns 2-D NDArray with shape `[n, m]`.
   *
   * @example
   * ```typescript
   * NDArray.eye(3) // [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
   * ```
   */
  static eye(n: number, m?: number): NDArray<number> {
    const cols = m ?? n
    const data = new Array<number>(n * cols).fill(0)
    for (let i = 0; i < Math.min(n, cols); i++) {
      data[i * cols + i] = 1
    }
    return new NDArray<number>(data, [n, cols])
  }

  /**
   * Return the square identity matrix.
   *
   * @param n - Size of the matrix (n × n).
   * @returns 2-D NDArray with ones on the diagonal.
   *
   * @example
   * ```typescript
   * NDArray.identity(3) // [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
   * ```
   */
  static identity(n: number): NDArray<number> {
    return NDArray.eye(n, n)
  }

  /**
   * Return evenly spaced values within a half-open interval `[start, stop)`.
   *
   * @param start - Start of interval (inclusive) **or** stop when `stop` is omitted.
   * @param stop - End of interval (exclusive). Omit to use `start` as stop with `start` = 0.
   * @param step - Spacing between values (default: 1).
   * @returns 1-D NDArray.
   *
   * @example
   * ```typescript
   * NDArray.arange(5)     // [0, 1, 2, 3, 4]
   * NDArray.arange(1, 5)  // [1, 2, 3, 4]
   * NDArray.arange(0, 1, 0.2) // [0, 0.2, 0.4, 0.6, 0.8]
   * ```
   */
  static arange(start: number, stop?: number, step: number = 1): NDArray<number> {
    let actualStart: number
    let actualStop: number

    if (stop === undefined) {
      actualStart = 0
      actualStop = start
    } else {
      actualStart = start
      actualStop = stop
    }

    if (step === 0) {
      throw new Error('Step must not be zero')
    }

    const result: number[] = []
    // Use integer-based count to avoid floating-point drift
    if (step > 0) {
      const n = Math.max(0, Math.ceil((actualStop - actualStart) / step))
      for (let i = 0; i < n; i++) {
        result.push(parseFloat((actualStart + i * step).toFixed(10)))
      }
    } else {
      const n = Math.max(0, Math.ceil((actualStart - actualStop) / (-step)))
      for (let i = 0; i < n; i++) {
        result.push(parseFloat((actualStart + i * step).toFixed(10)))
      }
    }

    return new NDArray<number>(result, [result.length])
  }

  /**
   * Return evenly spaced numbers over a specified interval (inclusive).
   *
   * @param start - Starting value.
   * @param stop - Ending value (inclusive).
   * @param num - Number of samples (default: 50). Must be ≥ 1.
   * @returns 1-D NDArray of length `num`.
   *
   * @example
   * ```typescript
   * NDArray.linspace(0, 1, 5) // [0, 0.25, 0.5, 0.75, 1]
   * ```
   */
  static linspace(start: number, stop: number, num: number = 50): NDArray<number> {
    if (num < 1) throw new Error('Number of samples must be at least 1')
    const result = new Array<number>(num)
    if (num === 1) {
      result[0] = start
    } else {
      const step = (stop - start) / (num - 1)
      for (let i = 0; i < num; i++) {
        result[i] = start + i * step
      }
    }
    return new NDArray<number>(result, [num])
  }

  /**
   * Return numbers evenly spaced on a log scale (base 10 by default).
   *
   * @param start - Starting exponent (base^start).
   * @param stop - Ending exponent (base^stop), inclusive.
   * @param num - Number of samples (default: 50). Must be ≥ 1.
   * @param base - Base of the log space (default: 10).
   * @returns 1-D NDArray.
   *
   * @example
   * ```typescript
   * NDArray.logspace(0, 2, 3) // [1, 10, 100]
   * ```
   */
  static logspace(start: number, stop: number, num: number = 50, base: number = 10): NDArray<number> {
    if (num < 1) throw new Error('Number of samples must be at least 1')
    const result = new Array<number>(num)
    if (num === 1) {
      result[0] = base ** start
    } else {
      const step = (stop - start) / (num - 1)
      for (let i = 0; i < num; i++) {
        result[i] = base ** (start + i * step)
      }
    }
    return new NDArray<number>(result, [num])
  }

  /**
   * Return random values in [0, 1) from a uniform distribution.
   *
   * @param shape - Shape of the output array.
   * @returns New NDArray with uniform random values.
   *
   * @example
   * ```typescript
   * NDArray.random([2, 3]) // e.g. [[0.12, 0.54, 0.88], [0.33, 0.91, 0.07]]
   * ```
   */
  static random(shape: number[]): NDArray<number> {
    const size = shapeSize(shape)
    const data = new Array<number>(size)
    for (let i = 0; i < size; i++) {
      data[i] = Math.random()
    }
    return new NDArray<number>(data, shape)
  }

  /**
   * Return random values from a standard normal distribution (Box-Muller transform).
   *
   * @param shape - Shape of the output array.
   * @returns New NDArray with normally distributed values.
   *
   * @example
   * ```typescript
   * NDArray.randn([1000]) // 1000 normally distributed samples
   * ```
   */
  static randn(shape: number[]): NDArray<number> {
    const size = shapeSize(shape)
    const data = new Array<number>(size)
    for (let i = 0; i < size; i += 2) {
      let u1 = Math.random()
      // Avoid log(0)
      while (u1 === 0) u1 = Math.random()
      const u2 = Math.random()
      const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
      const z2 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2)
      data[i] = z1
      if (i + 1 < size) data[i + 1] = z2
    }
    return new NDArray<number>(data, shape)
  }

  /**
   * Create an NDArray from raw data (same as the constructor but static).
   *
   * @param data - Flat array or 2D array of rows.
   * @returns New NDArray.
   *
   * @example
   * ```typescript
   * NDArray.from([1, 2, 3])          // 1D
   * NDArray.from([[1, 2], [3, 4]])   // 2D
   * ```
   */
  static from<T>(data: T[] | T[][]): NDArray<T> {
    return new NDArray<T>(data)
  }

  // ═════════════════════════════════════════════════════════════════════
  //  Reshape Operations
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Return a new NDArray with the same data but a different shape.
   *
   * @param newShape - Desired shape; product must equal current size.
   * @returns New NDArray with the same data reinterpreted.
   *
   * @example
   * ```typescript
   * NDArray.arange(6).reshape([2, 3]) // [[0, 1, 2], [3, 4, 5]]
   * ```
   */
  reshape(newShape: number[]): NDArray<T> {
    return new NDArray<T>([...this._data], newShape)
  }

  /**
   * Return a flat (1-D) copy of the array.
   *
   * @returns 1-D NDArray with all elements in row-major order.
   */
  flatten(): NDArray<T> {
    return new NDArray<T>([...this._data], [this._data.length])
  }

  /**
   * Return a flat (1-D) copy of the array (alias for `flatten`).
   *
   * @returns 1-D NDArray with all elements in row-major order.
   */
  ravel(): NDArray<T> {
    return this.flatten()
  }

  // ═════════════════════════════════════════════════════════════════════
  //  Element-wise Math (Returns New NDArray)
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Add a scalar or array element-wise (with broadcasting).
   *
   * @param other - Number or NDArray to add.
   * @returns New NDArray.
   */
  add(other: number | NDArray): NDArray<number> {
    return this._binaryNumOp((a, b) => a + b, other)
  }

  /**
   * Subtract a scalar or array element-wise (with broadcasting).
   *
   * @param other - Number or NDArray to subtract.
   * @returns New NDArray.
   */
  sub(other: number | NDArray): NDArray<number> {
    return this._binaryNumOp((a, b) => a - b, other)
  }

  /**
   * Multiply by a scalar or array element-wise (with broadcasting).
   *
   * @param other - Number or NDArray to multiply by.
   * @returns New NDArray.
   */
  mul(other: number | NDArray): NDArray<number> {
    return this._binaryNumOp((a, b) => a * b, other)
  }

  /**
   * Divide by a scalar or array element-wise (with broadcasting).
   *
   * @param other - Number or NDArray divisor.
   * @returns New NDArray.
   */
  div(other: number | NDArray): NDArray<number> {
    return this._binaryNumOp((a, b) => a / b, other)
  }

  /**
   * Raise elements to a power element-wise.
   *
   * @param exp - Exponent (scalar).
   * @returns New NDArray with elements raised to `exp`.
   */
  pow(exp: number): NDArray<number> {
    return this._unaryNumOp((a) => Math.pow(a, exp))
  }

  /**
   * Element-wise square root.
   *
   * @returns New NDArray with sqrt of each element.
   */
  sqrt(): NDArray<number> {
    return this._unaryNumOp((a) => Math.sqrt(a))
  }

  /**
   * Element-wise absolute value.
   *
   * @returns New NDArray with absolute values.
   */
  abs(): NDArray<number> {
    return this._unaryNumOp((a) => Math.abs(a))
  }

  /**
   * Element-wise negation.
   *
   * @returns New NDArray with negated values.
   */
  neg(): NDArray<number> {
    return this._unaryNumOp((a) => -a)
  }

  /**
   * Clip (limit) values to a `[min, max]` interval.
   *
   * @param min - Lower bound (optional).
   * @param max - Upper bound (optional).
   * @returns New NDArray with clipped values.
   */
  clip(min?: number, max?: number): NDArray<number> {
    return this._unaryNumOp((a) => {
      let v = a
      if (min !== undefined && v < min) v = min
      if (max !== undefined && v > max) v = max
      return v
    })
  }

  /**
   * Round elements to the given number of decimals.
   *
   * @param decimals - Number of decimal places (default: 0).
   * @returns New NDArray with rounded values.
   */
  round(decimals: number = 0): NDArray<number> {
    const factor = Math.pow(10, decimals)
    return this._unaryNumOp((a) => {
      const shifted = Number((a * factor).toPrecision(15))
      return Math.round(shifted) / factor
    })
  }

  /**
   * Element-wise floor.
   *
   * @returns New NDArray with floored values.
   */
  floor(): NDArray<number> {
    return this._unaryNumOp((a) => Math.floor(a))
  }

  /**
   * Element-wise ceiling.
   *
   * @returns New NDArray with ceiled values.
   */
  ceil(): NDArray<number> {
    return this._unaryNumOp((a) => Math.ceil(a))
  }

  /** @internal Apply a unary numeric operation element-wise. */
  private _unaryNumOp(op: (a: number) => number): NDArray<number> {
    const result = new Array<number>(this._data.length)
    for (let i = 0; i < this._data.length; i++) {
      result[i] = op(this._data[i] as unknown as number)
    }
    return new NDArray<number>(result, [...this._shape])
  }

  /** @internal Apply a binary numeric operation (scalar or NDArray with broadcasting). */
  private _binaryNumOp(
    op: (a: number, b: number) => number,
    other: number | NDArray,
  ): NDArray<number> {
    if (typeof other === 'number') {
      // Scalar case
      const result = new Array<number>(this._data.length)
      for (let i = 0; i < this._data.length; i++) {
        result[i] = op(this._data[i] as unknown as number, other)
      }
      return new NDArray<number>(result, [...this._shape])
    }

    // NDArray case — handle broadcasting
    const { data, shape } = broadcastBinaryOp(
      this._data as unknown as number[],
      this._shape,
      other._data as unknown as number[],
      other._shape,
      op,
    )
    return new NDArray<number>(data, shape)
  }

  // ═════════════════════════════════════════════════════════════════════
  //  Aggregation
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Sum of array elements over a given axis.
   *
   * @param axis - Axis to reduce along (optional). If omitted, reduces all elements.
   * @returns Scalar sum (no axis) or lower-dimensional NDArray.
   *
   * @example
   * ```typescript
   * const a = NDArray.from([[1, 2], [3, 4]])
   * a.sum()       // 10
   * a.sum(0)      // [4, 6]
   * a.sum(1)      // [3, 7]
   * ```
   */
  sum(axis?: number): number | NDArray<number> {
    if (axis === undefined) {
      let total = 0
      for (let i = 0; i < this._data.length; i++) {
        total += this._data[i] as unknown as number
      }
      return total
    }

    return this._reduceAxis(axis, (vals) => {
      let s = 0
      for (const v of vals) s += v
      return s
    })
  }

  /**
   * Arithmetic mean (average) over a given axis.
   *
   * @param axis - Axis to reduce along (optional).
   * @returns Scalar mean or lower-dimensional NDArray.
   *
   * @example
   * ```typescript
   * const a = NDArray.from([[1, 2], [3, 4]])
   * a.mean()       // 2.5
   * a.mean(0)      // [2, 3]
   * a.mean(1)      // [1.5, 3.5]
   * ```
   */
  mean(axis?: number): number | NDArray<number> {
    if (axis === undefined) {
      if (this._data.length === 0) return NaN
      let total = 0
      for (let i = 0; i < this._data.length; i++) {
        total += this._data[i] as unknown as number
      }
      return total / this._data.length
    }

    return this._reduceAxis(axis, (vals) => {
      if (vals.length === 0) return NaN
      let s = 0
      for (const v of vals) s += v
      return s / vals.length
    })
  }

  /**
   * Variance (population) over a given axis.
   *
   * @param axis - Axis to reduce along (optional).
   * @returns Scalar variance or lower-dimensional NDArray.
   */
  var(axis?: number): number | NDArray<number> {
    if (axis === undefined) {
      const vals = this._data as unknown as number[]
      if (vals.length === 0) return NaN
      let sum = 0
      for (const v of vals) sum += v
      const mean = sum / vals.length
      let sqSum = 0
      for (const v of vals) sqSum += (v - mean) ** 2
      return sqSum / vals.length
    }

    return this._reduceAxis(axis, (vals) => {
      if (vals.length === 0) return NaN
      let sum = 0
      for (const v of vals) sum += v
      const mean = sum / vals.length
      let sqSum = 0
      for (const v of vals) sqSum += (v - mean) ** 2
      return sqSum / vals.length
    })
  }

  /**
   * Standard deviation (population) over a given axis.
   *
   * @param axis - Axis to reduce along (optional).
   * @returns Scalar std or lower-dimensional NDArray.
   */
  std(axis?: number): number | NDArray<number> {
    const result = this.var(axis)
    if (typeof result === 'number') {
      return Math.sqrt(result)
    }
    return result.sqrt()
  }

  /**
   * Minimum value over a given axis.
   *
   * @param axis - Axis to reduce along (optional).
   * @returns Scalar min or lower-dimensional NDArray.
   */
  min(axis?: number): number | NDArray<number> {
    if (axis === undefined) {
      if (this._data.length === 0) return NaN
      let m = this._data[0] as unknown as number
      for (let i = 1; i < this._data.length; i++) {
        const v = this._data[i] as unknown as number
        if (v < m) m = v
      }
      return m
    }

    return this._reduceAxis(axis, (vals) => {
      if (vals.length === 0) return NaN
      let m = vals[0]!
      for (let i = 1; i < vals.length; i++) {
        if (vals[i]! < m) m = vals[i]!
      }
      return m
    })
  }

  /**
   * Maximum value over a given axis.
   *
   * @param axis - Axis to reduce along (optional).
   * @returns Scalar max or lower-dimensional NDArray.
   */
  max(axis?: number): number | NDArray<number> {
    if (axis === undefined) {
      if (this._data.length === 0) return NaN
      let m = this._data[0] as unknown as number
      for (let i = 1; i < this._data.length; i++) {
        const v = this._data[i] as unknown as number
        if (v > m) m = v
      }
      return m
    }

    return this._reduceAxis(axis, (vals) => {
      if (vals.length === 0) return NaN
      let m = vals[0]!
      for (let i = 1; i < vals.length; i++) {
        if (vals[i]! > m) m = vals[i]!
      }
      return m
    })
  }

  /**
   * Index of the minimum value (flat index).
   *
   * @returns Flat index of the smallest element.
   */
  argmin(): number {
    if (this._data.length === 0) throw new Error('Cannot compute argmin of empty array')
    let minIdx = 0
    let minVal = this._data[0] as unknown as number
    for (let i = 1; i < this._data.length; i++) {
      const v = this._data[i] as unknown as number
      if (v < minVal) {
        minVal = v
        minIdx = i
      }
    }
    return minIdx
  }

  /**
   * Index of the maximum value (flat index).
   *
   * @returns Flat index of the largest element.
   */
  argmax(): number {
    if (this._data.length === 0) throw new Error('Cannot compute argmax of empty array')
    let maxIdx = 0
    let maxVal = this._data[0] as unknown as number
    for (let i = 1; i < this._data.length; i++) {
      const v = this._data[i] as unknown as number
      if (v > maxVal) {
        maxVal = v
        maxIdx = i
      }
    }
    return maxIdx
  }

  /**
   * Test whether all elements (or along an axis) evaluate to true.
   *
   * @param axis - Axis to reduce along (optional).
   * @returns Boolean scalar or NDArray of booleans.
   */
  all(axis?: number): boolean | NDArray<boolean> {
    if (axis === undefined) {
      for (let i = 0; i < this._data.length; i++) {
        if (!this._data[i]) return false
      }
      return true
    }

    return this._reduceAxis(axis, (vals) => {
      for (const v of vals) if (!v) return 0
      return 1
    }).map((v) => v === 1) as NDArray<boolean>
  }

  /**
   * Test whether any element (or along an axis) is true.
   *
   * @param axis - Axis to reduce along (optional).
   * @returns Boolean scalar or NDArray of booleans.
   */
  any(axis?: number): boolean | NDArray<boolean> {
    if (axis === undefined) {
      for (let i = 0; i < this._data.length; i++) {
        if (this._data[i]) return true
      }
      return false
    }

    return this._reduceAxis(axis, (vals) => {
      for (const v of vals) if (v) return 1
      return 0
    }).map((v) => v === 1) as NDArray<boolean>
  }

  /**
   * @internal Reduce along an axis using a reducer function.
   * Returns a lower-dimensional NDArray (never a scalar — callers check for scalar case).
   */
  private _reduceAxis(
    axis: number,
    reducer: (values: number[]) => number,
  ): NDArray<number> {
    axis = this._normalizeAxis(axis)

    const resultShape = [...this._shape]
    resultShape.splice(axis, 1)

    // If reducing to a scalar (1D array, axis=0), return 1-element 1D array
    if (resultShape.length === 0) {
      const vals = this._data as unknown as number[]
      return new NDArray<number>([reducer(vals)], [1])
    }

    const resultSize = shapeSize(resultShape)
    const result = new Array<number>(resultSize)
    const axisStride = this._strides[axis]!
    const axisSize = this._shape[axis]!

    // Map original dimension index -> result dimension index
    const dimMap: number[] = []
    for (let i = 0; i < this._shape.length; i++) {
      if (i < axis) dimMap.push(i)
      else if (i > axis) dimMap.push(i)
    }

    const counters = new Array<number>(resultShape.length).fill(0)

    for (let ri = 0; ri < resultSize; ri++) {
      // Compute base offset in the original flat array
      let base = 0
      for (let d = 0; d < resultShape.length; d++) {
        base += counters[d]! * this._strides[dimMap[d]!]!
      }

      // Collect values along the reduction axis
      const vals: number[] = []
      for (let k = 0; k < axisSize; k++) {
        vals.push(this._data[base + k * axisStride] as unknown as number)
      }

      result[ri] = reducer(vals)

      // Advance counters
      for (let d = resultShape.length - 1; d >= 0; d--) {
        const cd = counters[d]!
        counters[d] = cd + 1
        if (cd + 1 < resultShape[d]!) break
        counters[d] = 0
      }
    }

    return new NDArray<number>(result, resultShape)
  }

  // ═════════════════════════════════════════════════════════════════════
  //  Matrix Operations
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Matrix multiplication (dot product) between two arrays.
   *
   * - 1-D @ 1-D → inner product (scalar)
   * - 2-D @ 2-D → matrix multiply
   * - 2-D @ 1-D → matrix-vector
   * - 1-D @ 2-D → vector-matrix
   *
   * @param other - Right-hand side NDArray.
   * @returns New NDArray (or scalar for 1-D @ 1-D).
   *
   * @example
   * ```typescript
   * const a = NDArray.from([[1, 2], [3, 4]])
   * const b = NDArray.from([[5, 6], [7, 8]])
   * a.dot(b) // [[19, 22], [43, 50]]
   * ```
   */
  dot(other: NDArray<number>): number | NDArray<number> {
    if (this.ndim === 1 && other.ndim === 1) {
      // Inner product
      if (this._data.length !== other._data.length) {
        throw new Error(
          `Incompatible shapes for dot product: [${this._shape}] and [${other._shape}]`,
        )
      }
      let total = 0
      for (let i = 0; i < this._data.length; i++) {
        total +=
          (this._data[i] as unknown as number) * (other._data[i] as unknown as number)
      }
      return total
    }

    if (this.ndim === 2 && other.ndim === 2) {
      return this._matMul2d(other)
    }

    if (this.ndim === 2 && other.ndim === 1) {
      // Matrix-vector: [m, n] @ [n] → [m]
      if (this._shape[1] !== other._data.length) {
        throw new Error(
          `Incompatible shapes for matrix-vector product: [${this._shape}] and [${other._shape}]`,
        )
      }
      const [m, n] = this._shape as [number, number]
      const result = new Array<number>(m)
      for (let i = 0; i < m; i++) {
        let sum = 0
        for (let k = 0; k < n; k++) {
          sum +=
            (this._data[i * n + k] as unknown as number) *
            (other._data[k] as unknown as number)
        }
        result[i] = sum
      }
      return new NDArray<number>(result, [m])
    }

    if (this.ndim === 1 && other.ndim === 2) {
      // Vector-matrix: [n] @ [n, p] → [p]
      if (this._data.length !== other._shape[0]) {
        throw new Error(
          `Incompatible shapes for vector-matrix product: [${this._shape}] and [${other._shape}]`,
        )
      }
      const n = this._data.length
      const p = other._shape[1]!
      const result = new Array<number>(p)
      for (let j = 0; j < p; j++) {
        let sum = 0
        for (let k = 0; k < n; k++) {
          sum +=
            (this._data[k] as unknown as number) *
            (other._data[k * p + j] as unknown as number)
        }
        result[j] = sum
      }
      return new NDArray<number>(result, [p])
    }

    throw new Error(
      `dot product not implemented for ${this.ndim}-D and ${other.ndim}-D arrays`,
    )
  }

  /**
   * Matrix multiplication. For 2-D arrays, equivalent to dot product.
   * For n-D arrays, performs batched matrix multiplication (broadcasts over batch dims).
   *
   * @param other - Right-hand side NDArray.
   * @returns New NDArray.
   */
  matmul(other: NDArray<number>): NDArray<number> {
    if (this.ndim === 2 && other.ndim === 2) {
      return this._matMul2d(other)
    }

    // For n-D, support broadcast matmul
    if (this.ndim >= 2 && other.ndim >= 2) {
      const aShape = this._shape
      const bShape = other._shape

      // Last two dims are the matrix dims
      const aRows = aShape[aShape.length - 2]!
      const aCols = aShape[aShape.length - 1]!
      const bRows = bShape[bShape.length - 2]!
      const bCols = bShape[bShape.length - 1]!

      if (aCols !== bRows) {
        throw new Error(
          `Incompatible shapes for matmul: [${aShape}] and [${bShape}]`,
        )
      }

      // Batch dims only (last two are matrix dims)
      const aBatchShape = aShape.slice(0, -2)
      const bBatchShape = bShape.slice(0, -2)
      const batchShape = broadcastShapes(aBatchShape, bBatchShape)

      const resultShape = [...batchShape, aRows, bCols]
      const batchDims = batchShape.length
      const resultSize = shapeSize(resultShape)
      const result = new Array<number>(resultSize)

      const aPad = padShape(aShape, resultShape.length)
      const bPad = padShape(bShape, resultShape.length)
      const aStrides = computeStrides(aPad)
      const bStrides = computeStrides(bPad)

      // Only iterate over batch dimensions (not matrix dims)
      const batchCounters = new Array<number>(batchDims).fill(0)
      const batchSize = shapeSize(batchShape)

      for (let bi = 0; bi < (batchSize || 1); bi++) {
        // Compute batch base indices for a and b
        let aBase = 0
        let bBase = 0
        for (let d = 0; d < batchDims; d++) {
          const cd = batchCounters[d]!
          if (aPad[d]! > 1) aBase += cd * aStrides[d]!
          if (bPad[d]! > 1) bBase += cd * bStrides[d]!
        }

        // Compute the matrix multiply for this batch element
        for (let i = 0; i < aRows; i++) {
          for (let j = 0; j < bCols; j++) {
            let sum = 0
            for (let k = 0; k < aCols; k++) {
              const av = this._data[aBase + i * aCols + k] as unknown as number
              const bv = other._data[bBase + k * bCols + j] as unknown as number
              sum += av * bv
            }
            const flatIdx = (bi * aRows * bCols) + (i * bCols) + j
            result[flatIdx] = sum
          }
        }

        // Advance batch counters
        for (let d = batchDims - 1; d >= 0; d--) {
          const cd = batchCounters[d]!
          batchCounters[d] = cd + 1
          if (cd + 1 < batchShape[d]!) break
          batchCounters[d] = 0
        }
      }

      return new NDArray<number>(result, resultShape)
    }

    // Lower dim cases: treat as dot product
    const dotResult = this.dot(other)
    if (typeof dotResult === 'number') {
      return new NDArray<number>([dotResult], [1])
    }
    return dotResult
  }

  /** @internal 2-D × 2-D matrix multiplication. */
  private _matMul2d(other: NDArray<number>): NDArray<number> {
    const [m, n] = this._shape as [number, number]
    const [n2, p] = other._shape as [number, number]

    if (n !== n2) {
      throw new Error(
        `Incompatible shapes for matrix multiplication: [${this._shape}] × [${other._shape}]`,
      )
    }

    const result = new Array<number>(m * p)
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < p; j++) {
        let sum = 0
        for (let k = 0; k < n; k++) {
          sum +=
            (this._data[i * n + k] as unknown as number) *
            (other._data[k * p + j] as unknown as number)
        }
        result[i * p + j] = sum
      }
    }
    return new NDArray<number>(result, [m, p])
  }

  // ═════════════════════════════════════════════════════════════════════
  //  Array Manipulation
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Transpose the array (reverse all axes).
   * For 2-D arrays this is standard matrix transpose.
   *
   * @returns New NDArray with axes reversed.
   */
  transpose(): NDArray<T> {
    if (this._shape.length <= 1) {
      return new NDArray<T>([...this._data], [...this._shape])
    }

    const newShape = [...this._shape].reverse()
    const newStrides = computeStrides(newShape)
    const newData = new Array<T>(this._data.length)

    for (let i = 0; i < this._data.length; i++) {
      const indices = unravelIndex(i, this._shape)
      indices.reverse()
      const newIdx = ravelIndex(indices, newStrides)
      newData[newIdx] = this._data[i]!
    }

    return new NDArray<T>(newData, newShape)
  }

  /**
   * Remove single-dimensional entries from the shape.
   *
   * @returns New NDArray with all dimensions of size 1 removed.
   *
   * @example
   * ```typescript
   * new NDArray([1, 2, 3], [1, 3, 1]).squeeze() // shape [3]
   * ```
   */
  squeeze(): NDArray<T> {
    const newShape = this._shape.filter((d) => d !== 1)
    if (newShape.length === 0) {
      // All dimensions were 1 — return 1-D with 1 element
      return new NDArray<T>([...this._data], [1])
    }
    return new NDArray<T>([...this._data], newShape)
  }

  /**
   * Repeat elements of the array.
   *
   * @param n - Number of repetitions.
   * @param axis - Axis along which to repeat. If omitted, flattens and repeats each element.
   * @returns New NDArray with repeated elements.
   *
   * @example
   * ```typescript
   * NDArray.from([1, 2, 3]).repeat(2) // [1, 1, 2, 2, 3, 3]
   * NDArray.from([[1, 2], [3, 4]]).repeat(2, 1)
   * // [[1, 1, 2, 2], [3, 3, 4, 4]]
   * ```
   */
  repeat(n: number, axis?: number): NDArray<T> {
    if (n < 1) throw new Error('Repeat count must be at least 1')
    if (n === 1) return this.copy()

    if (axis === undefined) {
      // Flatten and repeat each element
      const result = new Array<T>(this._data.length * n)
      for (let i = 0; i < this._data.length; i++) {
        const val = this._data[i]!
        const offset = i * n
        for (let j = 0; j < n; j++) {
          result[offset + j] = val
        }
      }
      return new NDArray<T>(result, [this._data.length * n])
    }

    axis = this._normalizeAxis(axis)
    const newShape = [...this._shape]
    newShape[axis] = newShape[axis]! * n
    const newSize = shapeSize(newShape)
    const newData = new Array<T>(newSize)

    for (let i = 0; i < newSize; i++) {
      const indices = unravelIndex(i, newShape)
      indices[axis] = indices[axis]! % this._shape[axis]!
      const srcIdx = ravelIndex(indices, this._strides)
      newData[i] = this._data[srcIdx]!
    }

    return new NDArray<T>(newData, newShape)
  }

  /**
   * Return a slice of the array (similar to Python slicing).
   *
   * @param start - Start indices per dimension (defaults to 0). Negative wraps.
   * @param end - End indices per dimension (exclusive, defaults to shape). Negative wraps.
   * @returns New NDArray with the sliced data.
   *
   * @example
   * ```typescript
   * const a = NDArray.from([[1, 2, 3], [4, 5, 6], [7, 8, 9]])
   * a.slice([0, 0], [2, 2]) // [[1, 2], [4, 5]]
   * ```
   */
  slice(start?: number[], end?: number[]): NDArray<T> {
    const actualStart = new Array<number>(this._shape.length)
    const actualEnd = new Array<number>(this._shape.length)

    for (let i = 0; i < this._shape.length; i++) {
      const s = start && i < start.length ? start[i]! : 0
      const e = end && i < end.length ? end[i]! : this._shape[i]!

      // Normalize negative indices (only wrap negative values)
      actualStart[i] = s >= 0 ? s : ((s % this._shape[i]!) + this._shape[i]!) % this._shape[i]!
      actualEnd[i] = e >= 0 ? e : ((e % this._shape[i]!) + this._shape[i]!) % this._shape[i]!

      if (actualEnd[i]! <= actualStart[i]!) {
        throw new Error(
          `Invalid slice for dimension ${i}: start ${actualStart[i]} > end ${actualEnd[i]}`,
        )
      }
    }

    const newShape = this._shape.map((_, i) => actualEnd[i]! - actualStart[i]!)
    const newSize = shapeSize(newShape)
    const newData = new Array<T>(newSize)

    for (let i = 0; i < newSize; i++) {
      const newIndices = unravelIndex(i, newShape)
      const origIndices = newIndices.map((idx, d) => idx + actualStart[d]!)
      const origFlatIdx = ravelIndex(origIndices, this._strides)
      newData[i] = this._data[origFlatIdx]!
    }

    return new NDArray<T>(newData, newShape)
  }

  // ═════════════════════════════════════════════════════════════════════
  //  Selection
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Return elements selected by a boolean array or predicate function.
   *
   * @param condition - Boolean NDArray of same shape, **or** predicate `(val, flatIdx) => boolean`.
   * @returns 1-D NDArray with elements where condition is true.
   *
   * @example
   * ```typescript
   * const a = NDArray.from([1, 2, 3, 4])
   * a.where(NDArray.from([true, false, true, false])) // [1, 3]
   * a.where(v => v > 2) // [3, 4]
   * ```
   */
  where(condition: NDArray<boolean> | ((val: T, idx: number) => boolean)): NDArray<T> {
    const result: T[] = []

    if (condition instanceof NDArray) {
      if (condition._data.length !== this._data.length) {
        throw new Error('Condition array must have the same total size')
      }
      for (let i = 0; i < this._data.length; i++) {
        if (condition._data[i]) {
          result.push(this._data[i]!)
        }
      }
    } else {
      for (let i = 0; i < this._data.length; i++) {
        if (condition(this._data[i]!, i)) {
          result.push(this._data[i]!)
        }
      }
    }

    return new NDArray<T>(result, [result.length])
  }

  // ═════════════════════════════════════════════════════════════════════
  //  Element-wise Iteration
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Apply a function to every element, passing the multi-dimensional indices.
   *
   * @param fn - Mapping function receiving value and axis indices.
   * @returns New NDArray of the mapped type.
   *
   * @example
   * ```typescript
   * NDArray.from([[1, 2], [3, 4]]).map((v, i, j) => v + i + j)
   * // [[1, 3], [4, 6]]
   * ```
   */
  map<R>(fn: (val: T, ...indices: number[]) => R): NDArray<R> {
    const result = new Array<R>(this._data.length)
    for (let i = 0; i < this._data.length; i++) {
      const indices = unravelIndex(i, this._shape)
      result[i] = fn(this._data[i]!, ...indices)
    }
    return new NDArray<R>(result, [...this._shape])
  }

  /**
   * Apply a unary function to every element (simpler than `map`).
   *
   * @param fn - Transformation function.
   * @returns New NDArray of the same type.
   */
  apply(fn: (val: T) => T): NDArray<T> {
    const result = new Array<T>(this._data.length)
    for (let i = 0; i < this._data.length; i++) {
      result[i] = fn(this._data[i]!)
    }
    return new NDArray<T>(result, [...this._shape])
  }

  // ═════════════════════════════════════════════════════════════════════
  //  Conversion / Utilities
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Convert to a nested JavaScript array.
   *
   * @returns Flat array (1-D), nested arrays (n-D), or scalar (0-D).
   *
   * @example
   * ```typescript
   * NDArray.from([[1, 2], [3, 4]]).toArray() // [[1, 2], [3, 4]]
   * ```
   */
  toArray(): T | T[] | T[][] | T[][] | unknown[] {
    return this._buildNested(this._data, this._shape, this._strides, 0)
  }

  /** @internal Recursively build nested arrays from flat storage. */
  private _buildNested(
    data: T[],
    shape: number[],
    strides: number[],
    offset: number,
  ): T | T[] | unknown[] {
    if (shape.length === 0) {
      return data[offset]!
    }
    if (shape.length === 1) {
      return data.slice(offset, offset + shape[0]!)
    }
    const result: unknown[] = []
    for (let i = 0; i < shape[0]!; i++) {
      result.push(this._buildNested(data, shape.slice(1), strides.slice(1), offset + i * strides[0]!))
    }
    return result
  }

  /**
   * Return a flat array of all elements.
   *
   * @returns Flat JavaScript array.
   */
  toList(): T[] {
    return [...this._data]
  }

  /**
   * Return a string representation of the array (NumPy-style formatting).
   *
   * @returns Formatted string.
   *
   * @example
   * ```typescript
   * NDArray.from([[1, 2], [3, 4]]).toString()
   * // "array([[1, 2],\n       [3, 4]])"
   * ```
   */
  toString(): string {
    return this._formatArray(this._data, this._shape, 0)
  }

  /** @internal Recursively format array data for toString. */
  private _formatArray(data: T[], shape: number[], indent: number): string {
    if (shape.length === 0) return `${data[0]}`
    if (shape.length === 1) {
      return `[${data.slice(0, shape[0]!).join(', ')}]`
    }

    const parts: string[] = []
    const innerSize = shapeSize(shape.slice(1))
    const pad = ' '.repeat(indent + 1)

    for (let i = 0; i < shape[0]!; i++) {
      const inner = this._formatArray(
        data.slice(i * innerSize),
        shape.slice(1),
        indent + 1,
      )
      parts.push(inner)
    }

    if (shape.length === 2) {
      return `[${parts.join(',\n')}]`
    }

    return `[${parts.join(`,\n${pad}`)}]`
  }

  /**
   * Return a deep copy of the array.
   *
   * @returns New NDArray with copied data.
   */
  copy(): NDArray<T> {
    return new NDArray<T>([...this._data], [...this._shape])
  }

  /**
   * Test deep equality between two NDArrays (compares shape and data).
   *
   * @param other - Other NDArray to compare.
   * @returns `true` if shapes and all elements match.
   */
  equals(other: NDArray<T>): boolean {
    if (this._shape.length !== other._shape.length) return false
    for (let i = 0; i < this._shape.length; i++) {
      if (this._shape[i] !== other._shape[i]) return false
    }
    for (let i = 0; i < this._data.length; i++) {
      if (this._data[i] !== other._data[i]) return false
    }
    return true
  }

  /**
   * Get an element at the given multi-dimensional indices.
   *
   * @param indices - One index per dimension.
   * @returns The element at the position. Negative indices wrap.
   *
   * @example
   * ```typescript
   * const a = NDArray.from([[1, 2], [3, 4]])
   * a.get(0, 1) // 2
   * a.get(-1, -1) // 4
   * ```
   */
  get(...indices: number[]): T {
    if (indices.length !== this._shape.length) {
      throw new Error(
        `Expected ${this._shape.length} indices, got ${indices.length}`,
      )
    }
    const normIndices = indices.map((idx, i) =>
      ((idx % this._shape[i]!) + this._shape[i]!) % this._shape[i]!,
    )
    const flatIdx = ravelIndex(normIndices, this._strides)
    return this._data[flatIdx]!
  }

  /**
   * Set an element at the given multi-dimensional indices. **Mutates the array.**
   *
   * @param value - New value.
   * @param indices - One index per dimension. Negative wraps.
   *
   * @example
   * ```typescript
   * const a = NDArray.zeros([2, 2])
   * a.set(5, 0, 1) // a is now [[0, 5], [0, 0]]
   * ```
   */
  set(value: T, ...indices: number[]): void {
    if (indices.length !== this._shape.length) {
      throw new Error(
        `Expected ${this._shape.length} indices, got ${indices.length}`,
      )
    }
    const normIndices = indices.map((idx, i) =>
      ((idx % this._shape[i]!) + this._shape[i]!) % this._shape[i]!,
    )
    const flatIdx = ravelIndex(normIndices, this._strides)
    this._data[flatIdx] = value
  }

  // ═════════════════════════════════════════════════════════════════════
  //  Static Ufuncs (Return New NDArray)
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Element-wise sine.
   * @param arr - Input array.
   * @returns New NDArray.
   */
  static sin(arr: NDArray): NDArray<number> {
    return arr._unaryNumOp((a) => Math.sin(a))
  }

  /**
   * Element-wise cosine.
   * @param arr - Input array.
   * @returns New NDArray.
   */
  static cos(arr: NDArray): NDArray<number> {
    return arr._unaryNumOp((a) => Math.cos(a))
  }

  /**
   * Element-wise tangent.
   * @param arr - Input array.
   * @returns New NDArray.
   */
  static tan(arr: NDArray): NDArray<number> {
    return arr._unaryNumOp((a) => Math.tan(a))
  }

  /**
   * Element-wise exponential (e^x).
   * @param arr - Input array.
   * @returns New NDArray.
   */
  static exp(arr: NDArray): NDArray<number> {
    return arr._unaryNumOp((a) => Math.exp(a))
  }

  /**
   * Element-wise natural logarithm.
   * @param arr - Input array.
   * @returns New NDArray.
   */
  static log(arr: NDArray): NDArray<number> {
    return arr._unaryNumOp((a) => Math.log(a))
  }

  /**
   * Element-wise base-2 logarithm.
   * @param arr - Input array.
   * @returns New NDArray.
   */
  static log2(arr: NDArray): NDArray<number> {
    return arr._unaryNumOp((a) => Math.log2(a))
  }

  /**
   * Element-wise base-10 logarithm.
   * @param arr - Input array.
   * @returns New NDArray.
   */
  static log10(arr: NDArray): NDArray<number> {
    return arr._unaryNumOp((a) => Math.log10(a))
  }

  /**
   * Element-wise square root.
   * @param arr - Input array.
   * @returns New NDArray.
   */
  static sqrt(arr: NDArray): NDArray<number> {
    return arr.sqrt()
  }

  /**
   * Element-wise absolute value.
   * @param arr - Input array.
   * @returns New NDArray.
   */
  static abs(arr: NDArray): NDArray<number> {
    return arr.abs()
  }

  /**
   * Element-wise rounding.
   * @param arr - Input array.
   * @param decimals - Number of decimal places (default: 0).
   * @returns New NDArray.
   */
  static round(arr: NDArray, decimals: number = 0): NDArray<number> {
    return arr.round(decimals)
  }

  /**
   * Element-wise floor.
   * @param arr - Input array.
   * @returns New NDArray.
   */
  static floor(arr: NDArray): NDArray<number> {
    return arr.floor()
  }

  /**
   * Element-wise ceiling.
   * @param arr - Input array.
   * @returns New NDArray.
   */
  static ceil(arr: NDArray): NDArray<number> {
    return arr.ceil()
  }

  /**
   * Clip (limit) values to a [min, max] interval.
   * @param arr - Input array.
   * @param min - Lower bound (optional).
   * @param max - Upper bound (optional).
   * @returns New NDArray.
   */
  static clip(arr: NDArray, min?: number, max?: number): NDArray<number> {
    return arr.clip(min, max)
  }

  // ═════════════════════════════════════════════════════════════════════
  //  Concatenation
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Join arrays along an existing axis.
   *
   * @param arrays - Arrays to concatenate.
   * @param axis - Axis along which to join (default: 0).
   * @returns New NDArray.
   *
   * @example
   * ```typescript
   * NDArray.concatenate([NDArray.ones([2, 3]), NDArray.zeros([2, 3])], 0)
   * // shape [4, 3]
   * ```
   */
  static concatenate(arrays: NDArray[], axis: number = 0): NDArray {
    if (arrays.length === 0) throw new Error('No arrays to concatenate')
    if (arrays.length === 1) return arrays[0]!.copy()

    const firstShape = arrays[0]!.shape
    const ndim = firstShape.length

    // Normalize axis
    axis = ((axis % ndim) + ndim) % ndim

    // Validate compatibility: all dimensions except the concatenation axis must match
    for (let i = 1; i < arrays.length; i++) {
      const shape = arrays[i]!.shape
      if (shape.length !== ndim) {
        throw new Error('All arrays must have the same number of dimensions')
      }
      for (let d = 0; d < ndim; d++) {
        if (shape[d] !== firstShape[d]) {
          throw new Error(
            `Incompatible shapes for concatenation along axis ${axis}: ` +
              `[${firstShape}] and [${shape}]`,
          )
        }
      }
    }

    // Compute result shape and cumulative offsets along axis
    const resultShape = [...firstShape]
    const offsets: number[] = []
    let totalAlongAxis = 0
    for (const arr of arrays) {
      offsets.push(totalAlongAxis)
      totalAlongAxis += arr.shape[axis]!
    }
    resultShape[axis] = totalAlongAxis

    const resultSize = shapeSize(resultShape)
    const result = new Array<number>(resultSize)

    for (let ri = 0; ri < resultSize; ri++) {
      const indices = unravelIndex(ri, resultShape)
      const axisValue = indices[axis]!

      // Find source array
      let srcIdx = arrays.length - 1
      for (let j = offsets.length - 1; j >= 0; j--) {
        if (axisValue >= offsets[j]!) {
          srcIdx = j
          break
        }
      }

      const srcArr = arrays[srcIdx]!
      const srcOffset = offsets[srcIdx]!
      const srcIndices = [...indices]
      srcIndices[axis] = axisValue - srcOffset
      const srcFlatIdx = ravelIndex(
        srcIndices,
        computeStrides(srcArr.shape),
      )
      result[ri] = srcArr._data[srcFlatIdx] as number
    }

    return new NDArray<number>(result, resultShape)
  }

  /**
   * Join arrays along a new axis.
   *
   * @param arrays - Arrays to stack (must have the same shape).
   * @param axis - Index of the new axis (default: 0).
   * @returns New NDArray with one additional dimension.
   *
   * @example
   * ```typescript
   * NDArray.stack([NDArray.ones([3]), NDArray.zeros([3])])
   * // shape [2, 3]
   * ```
   */
  static stack(arrays: NDArray[], axis: number = 0): NDArray {
    if (arrays.length === 0) throw new Error('No arrays to stack')

    const firstShape = arrays[0]!.shape

    // Validate all have the same shape
    for (let i = 1; i < arrays.length; i++) {
      if (!arrays[i]!.equals(arrays[0]!)) {
        // Fast shape check
        const s1 = arrays[i]!.shape
        const s2 = firstShape
        if (
          s1.length !== s2.length ||
          s1.some((d, j) => d !== s2[j])
        ) {
          throw new Error(
            `All arrays must have the same shape for stack, got [${s1}] and [${s2}]`,
          )
        }
      }
    }

    // Normalize axis: insert new axis at `axis` position
    const ndim = firstShape.length
    axis = ((axis % (ndim + 1)) + (ndim + 1)) % (ndim + 1)

    const newShape = [...firstShape]
    newShape.splice(axis, 0, arrays.length)

    const resultSize = shapeSize(newShape)
    const result = new Array<number>(resultSize)

    for (let ri = 0; ri < resultSize; ri++) {
      const indices = unravelIndex(ri, newShape)
      const stackIdx = indices[axis]!
      const srcArr = arrays[stackIdx]!
      const srcIndices = [...indices]
      srcIndices.splice(axis, 1)
      const srcFlatIdx = ravelIndex(srcIndices, computeStrides(firstShape))
      result[ri] = srcArr._data[srcFlatIdx] as number
    }

    return new NDArray<number>(result, newShape)
  }

  /**
   * Stack arrays horizontally (column-wise).
   * For 2-D arrays, equivalent to `concatenate(arrays, 1)`.
   * For 1-D arrays, first converts to 2-D (shape [1, n]).
   *
   * @param arrays - Arrays to stack.
   * @returns New NDArray.
   */
  static hstack(arrays: NDArray[]): NDArray {
    if (arrays.length === 0) throw new Error('No arrays to hstack')

    // For 1-D arrays, convert to 2-D rows first
    const processed = arrays.map((arr) => {
      if (arr.ndim === 1) {
        return arr.reshape([1, arr.size])
      }
      return arr
    })

    // For 1-D inputs, stack rows (axis 0); for 2-D, column-wise (axis 1)
    const all1d = arrays.every((arr) => arr.ndim === 1)
    return NDArray.concatenate(processed, all1d ? 0 : 1)
  }

  /**
   * Stack arrays vertically (row-wise).
   * For 2-D arrays, equivalent to `concatenate(arrays, 0)`.
   * For 1-D arrays, first converts to 2-D (shape [1, n]).
   *
   * @param arrays - Arrays to stack.
   * @returns New NDArray.
   */
  static vstack(arrays: NDArray[]): NDArray {
    if (arrays.length === 0) throw new Error('No arrays to vstack')

    // For 1-D arrays, convert to 2-D rows first
    const processed = arrays.map((arr) => {
      if (arr.ndim === 1) {
        return arr.reshape([1, arr.size])
      }
      return arr
    })

    return NDArray.concatenate(processed, 0)
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  Standalone Ufunc Exports
// ═══════════════════════════════════════════════════════════════════════

/**
 * Element-wise sine.
 */
export function sin(arr: NDArray): NDArray<number> {
  return NDArray.sin(arr)
}

/**
 * Element-wise cosine.
 */
export function cos(arr: NDArray): NDArray<number> {
  return NDArray.cos(arr)
}

/**
 * Element-wise exponential (e^x).
 */
export function exp(arr: NDArray): NDArray<number> {
  return NDArray.exp(arr)
}

/**
 * Element-wise natural logarithm.
 */
export function log(arr: NDArray): NDArray<number> {
  return NDArray.log(arr)
}

/**
 * Element-wise square root.
 */
export function sqrt(arr: NDArray): NDArray<number> {
  return NDArray.sqrt(arr)
}

// ═══════════════════════════════════════════════════════════════════════
//  Default Export
// ═══════════════════════════════════════════════════════════════════════

export default NDArray
