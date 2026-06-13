import { useCallback, useSyncExternalStore, useRef } from 'react'

export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T),
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener('storage', callback)
    window.addEventListener('local-storage-sync', callback)
    return () => {
      window.removeEventListener('storage', callback)
      window.removeEventListener('local-storage-sync', callback)
    }
  }, [])

  const getSnapshot = useCallback(() => {
    return localStorage.getItem(key)
  }, [key])

  const rawValue = useSyncExternalStore(subscribe, getSnapshot)

  const initialValueRef = useRef(initialValue)
  initialValueRef.current = initialValue

  const fallback = initialValueRef.current
  const parsedValue: T =
    rawValue !== null
      ? (() => {
          try {
            return JSON.parse(rawValue) as T
          } catch (e) {
            console.error(
              `[useLocalSyncStorage] Error parsing key "${key}":`,
              e,
            )
            return typeof fallback === 'function'
              ? (fallback as () => T)()
              : fallback
          }
        })()
      : typeof fallback === 'function'
        ? (fallback as () => T)()
        : fallback

  const setValue: React.Dispatch<React.SetStateAction<T>> = useCallback(
    value => {
      try {
        const currentString = localStorage.getItem(key)
        const currentValue =
          currentString !== null
            ? (JSON.parse(currentString) as T)
            : typeof initialValueRef.current === 'function'
              ? (initialValueRef.current as () => T)()
              : initialValueRef.current

        const newValue = value instanceof Function ? value(currentValue) : value
        localStorage.setItem(key, JSON.stringify(newValue))

        window.dispatchEvent(
          new CustomEvent('local-storage-sync', {
            detail: { key, value: newValue },
          }),
        )
      } catch (e) {
        console.error(`[useLocalSyncStorage] Failed to set key "${key}":`, e)
      }
    },
    [key],
  )

  return [parsedValue, setValue]
}
