/**
 * Process an array of items in sequential batches.
 *
 * @example
 * const items = [1, 2, 3, 4, 5]
 * const results = await batch(items, 2, async (batch) => {
 *   return batch.map(n => n * 2)
 * })
 * // results = [2, 4, 6, 8, 10]
 */
export async function batch<T, R>(
  items: T[],
  batchSize: number,
  fn: (batch: T[]) => Promise<R[]>,
): Promise<R[]> {
  if (batchSize < 1) throw new RangeError('batchSize must be >= 1')

  const results: R[] = []
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize)
    const batchResults = await fn(chunk)
    results.push(...batchResults)
  }
  return results
}

export default batch
