import { chunkify } from '@main/utils/array'
import { join } from 'path'
import { Worker } from 'worker_threads'
import os from 'os'
import type {
  ThumbnailWorkerImageResult,
  ThumbnailWorkerProps,
  ThumbnailWorkerResult,
  ThumbnailWorkerTask,
} from './thumbnail.worker'

interface Options {
  onComplete?: (result: ThumbnailWorkerResult) => void
  onProgress?: (
    currentResult: ThumbnailWorkerImageResult,
    completed: number,
    total: number,
  ) => void
  onError?: (error: Error) => void

  thumbnailOptions: Pick<ThumbnailWorkerProps, 'width' | 'height' | 'quality'>
}

const MIN_BATCH_SIZE = 10

const coreCount = os.availableParallelism()

export function createThumbnailsInWorkers(
  tasks: ThumbnailWorkerTask[],
  options: Options = {
    thumbnailOptions: { width: 512 },
  },
) {
  // number of workers based on tasks length, then we take it if it is less than core count
  const taskBasedCount = Math.ceil(tasks.length / MIN_BATCH_SIZE)
  const workersNumber = Math.max(1, Math.min(coreCount, taskBasedCount))
  const chunks = chunkify(tasks, workersNumber)
  chunks.forEach(chunk => {
    processThumbnailsWorker(chunk, options)
  })
}

function createThumbnailWorker(): Worker {
  const workerPath = join(__dirname, 'thumbnail.worker.js')
  return new Worker(workerPath)
}

function processThumbnailsWorker(
  tasks: ThumbnailWorkerTask[],
  options: Options,
) {
  const worker = createThumbnailWorker()

  worker.on('message', message => {
    if (message.type === 'progress') {
      options?.onProgress?.(
        message.currentResult,
        message.completed,
        message.total,
      )
    } else if (message.type === 'complete') {
      options?.onComplete?.(message.result)
      worker.terminate()
    }
  })

  worker.on('error', error => {
    console.error('Worker error:', error)
    options?.onError?.(error)
    worker.terminate()
  })

  worker.postMessage({
    tasks,
    ...options.thumbnailOptions,
  } satisfies ThumbnailWorkerProps)
}
