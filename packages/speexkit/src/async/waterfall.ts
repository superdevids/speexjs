/**
 * Execute async tasks in sequence, passing each result to the next task.
 *
 * @example
 * const result = await waterfall([
 *   async (n: number) => n + 1,
 *   async (n: number) => n * 2,
 *   async (n: number) => `Result: ${n}`,
 * ], 1)
 * // result = "Result: 4"
 *
 * @example
 * const result = await waterfall([
 *   async () => fetch('/api/data').then(r => r.json()),
 *   async (data) => process(data),
 * ])
 */
export async function waterfall(
  tasks: Array<(arg: any) => Promise<any>>,
  initial?: any,
): Promise<any> {
  let result = initial
  for (const task of tasks) {
    result = await task(result)
  }
  return result
}

export default waterfall
