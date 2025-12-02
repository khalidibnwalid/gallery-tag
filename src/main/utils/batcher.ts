interface BatcherOptions<T> {
  /**
   * Maximum number of items before forcing a flush
   */
  batchSize?: number
  /**
   * in milliseconds
   */
  debounceTime?: number
  callbackFn: (items: T[]) => void
}

export default class Batcher<T> {
  private batchSize: number
  private debounceTime: number
  private callbackFn: (items: T[]) => void

  private queue: T[]
  private timeout: NodeJS.Timeout | null

  constructor(options: BatcherOptions<T>) {
    this.batchSize = options.batchSize || 100
    this.debounceTime = options.debounceTime || 1000
    this.callbackFn = options.callbackFn

    this.queue = []
    this.timeout = null
  }

  add(item: T) {
    this.queue.push(item)

    if (this.queue.length >= this.batchSize) {
      this.flush()
    } else {
      if (this.timeout) clearTimeout(this.timeout)
      this.timeout = setTimeout(() => this.flush(), this.debounceTime)
    }
  }

  clear(): T[] {
    if (this.timeout) {
      clearTimeout(this.timeout)
      this.timeout = null
    }
    const [...clearedItems] = this.queue
    this.queue = []

    return clearedItems
  }

  flush() {
    if (this.timeout) {
      clearTimeout(this.timeout)
      this.timeout = null
    }

    if (this.queue.length === 0) return

    // new ref array
    const itemsToProcess = [...this.queue]
    this.queue = []

    this.callbackFn(itemsToProcess)
  }

  get size(): number {
    return this.queue.length
  }
}
