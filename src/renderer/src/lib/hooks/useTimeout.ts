import { useEffect, useRef } from 'react'

export function useTimeout(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (delay !== null) {
      timer = setTimeout(() => savedCallback.current(), delay)
    }
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [delay])
}
