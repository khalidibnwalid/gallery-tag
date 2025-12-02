import sharp from 'sharp'
import { parentPort, workerData } from 'worker_threads'

if (!parentPort) {
  throw new Error('This script must be run as a Worker thread')
}

export interface ThumbnailWorkerTask {
  imagePath: string
  outputPath: string
}

export interface ThumbnailWorkerProps {
  tasks: ThumbnailWorkerTask[]
  width: number
  height?: number
  quality?: number
}

export interface ThumbnailWorkerResult {
  results: ThumbnailWorkerImageResult[]
  totalProcessed: number
  totalFailed: number
}

async function processMultipleImages(
  data: ThumbnailWorkerProps,
): Promise<ThumbnailWorkerResult> {
  const { tasks, width, height, quality } = data
  const results: ThumbnailWorkerImageResult[] = []

  for (const task of tasks) {
    const result = await processImage(
      task.imagePath,
      task.outputPath,
      width,
      height,
      quality,
    )
    results.push(result)

    // send update
    parentPort?.postMessage({
      type: 'progress',
      completed: results.length,
      total: tasks.length,
      currentResult: result,
    })
  }

  const totalFailed = results.filter(r => !r.success).length
  const totalProcessed = results.length

  return {
    results,
    totalProcessed,
    totalFailed,
  }
}

parentPort.on('message', async (data: ThumbnailWorkerProps) => {
  const result = await processMultipleImages(data)
  parentPort!.postMessage({ type: 'complete', result })
})

// Process initial data if provided
if (workerData) {
  processMultipleImages(workerData).then(result => {
    parentPort!.postMessage({ type: 'complete', result })
  })
}

export type ThumbnailWorkerImageResult =
  | {
      imagePath: string
      outputPath: string
      success: true
      error?: undefined
    }
  | {
      imagePath: string
      outputPath?: undefined
      success: false
      error: string
    }

async function processImage(
  imagePath: string,
  outputPath: string,
  width: number,
  height?: number,
  quality?: number,
): Promise<ThumbnailWorkerImageResult> {
  try {
    await sharp(imagePath)
      .resize(width, height, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality })
      .toFile(outputPath)

    return {
      imagePath,
      outputPath,
      success: true,
    }
  } catch (error) {
    return {
      imagePath,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}
