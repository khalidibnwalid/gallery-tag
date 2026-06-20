import fs from 'fs/promises'
import xxhash from 'xxhash-wasm'

let hasherPromise: ReturnType<typeof xxhash> | null = null
let hasher: Awaited<ReturnType<typeof xxhash>> | null = null

async function getHasher() {
  if (hasher) return hasher
  if (!hasherPromise) {
    hasherPromise = xxhash().then((h) => {
      hasher = h
      return h
    })
  }
  return hasherPromise
}

// Eagerly load the WASM module at app startup / module import time
getHasher()

/**
 * Computes a quick hash of the file based on the xxHash32 of chunks across (0, 25%, 50%, 75%, 100%).
 * This is much faster than hashing the entire file or decoding the image,
 * but still very reliable for detecting file moves/renames.
 */
export async function computeFileHash(filePath: string): Promise<string> {
  const h = hasher || (await getHasher())
  const stats = await fs.stat(filePath)
  const fileSize = stats.size
  const CHUNK_SIZE = 16 * 1024 // 16KB

  // If file is small, hash the whole thing
  if (fileSize <= CHUNK_SIZE * 5) {
    const buffer = await fs.readFile(filePath)
    const sizeBuf = Buffer.from(fileSize.toString(), 'utf-8')
    const finalBuf = Buffer.concat([buffer, sizeBuf])
    const hashVal = h.h32Raw(finalBuf, 0)
    return (hashVal >>> 0).toString(16).padStart(8, '0')
  }

  const fd = await fs.open(filePath, 'r')
  try {
    const combinedBuffer = Buffer.alloc(CHUNK_SIZE * 5)

    const offset0 = 0
    const offset25 = Math.floor((fileSize - CHUNK_SIZE) * 0.25)
    const offset50 = Math.floor((fileSize - CHUNK_SIZE) * 0.5)
    const offset75 = Math.floor((fileSize - CHUNK_SIZE) * 0.75)
    const offset100 = fileSize - CHUNK_SIZE

    // Read chunks
    await fd.read(combinedBuffer, 0, CHUNK_SIZE, offset0)
    await fd.read(combinedBuffer, CHUNK_SIZE, CHUNK_SIZE, offset25)
    await fd.read(combinedBuffer, CHUNK_SIZE * 2, CHUNK_SIZE, offset50)
    await fd.read(combinedBuffer, CHUNK_SIZE * 3, CHUNK_SIZE, offset75)
    await fd.read(combinedBuffer, CHUNK_SIZE * 4, CHUNK_SIZE, offset100)

    // Append filesize to the hash to avoid collisions with same content but different sizes
    const sizeBuf = Buffer.from(fileSize.toString(), 'utf-8')
    const finalBuf = Buffer.concat([combinedBuffer, sizeBuf])

    const hashVal = h.h32Raw(finalBuf, 0)
    return (hashVal >>> 0).toString(16).padStart(8, '0')
  } finally {
    await fd.close()
  }
}
