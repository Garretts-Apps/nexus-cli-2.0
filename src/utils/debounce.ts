export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  waitMs: number
): T & { cancel(): void; flush(): void } {
  let timeoutId: NodeJS.Timeout | undefined
  let lastArgs: unknown[] | undefined

  const debounced = ((...args: unknown[]) => {
    lastArgs = args
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      fn(...(lastArgs || []))
      timeoutId = undefined
    }, waitMs)
  }) as T & { cancel(): void; flush(): void }

  debounced.cancel = () => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = undefined
  }

  debounced.flush = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      if (lastArgs) fn(...lastArgs)
      timeoutId = undefined
    }
  }

  return debounced
}
