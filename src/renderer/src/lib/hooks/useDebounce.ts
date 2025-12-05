import { useCallback, useEffect, useRef, useState } from 'react'

export default function useDebounce<T>(
  valueOrCallback: T,
  delay: number,
): T extends (...args: any[]) => any ? T : T {
  const isFunction = typeof valueOrCallback === 'function'
  if (isFunction) {
    return useDebouncedCallback(
      valueOrCallback as T extends (...args: any[]) => any ? T : never,
      delay,
    ) as T extends (...args: any[]) => any ? T : T
  }
  return useDebounceValue(valueOrCallback, delay) as T extends (
    ...args: any[]
  ) => any
    ? T
    : T
}

function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    },
    [callback, delay],
  ) as T

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return debouncedCallback
}
