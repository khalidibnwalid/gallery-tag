import sharp from 'sharp'

/**
 * Extracts the top k dominant colors of an image.
 * Resizes the image to 64x64 raw pixels for high-speed color analysis.
 * Uses K-Means clustering (K=5) to cluster colors and returns hex strings sorted by prevalence.
 */
export async function extractDominantColors(
  imagePath: string,
  k: number = 5,
): Promise<string[]> {
  try {
    // 1. Load and resize image to 64x64 raw pixels for fast processing
    const { data, info } = await sharp(imagePath, { failOn: 'none' })
      .resize(64, 64, { fit: 'inside' })
      .raw()
      .toBuffer({ resolveWithObject: true })

    const pixelCount = info.width * info.height
    const channels = info.channels // usually 3 (RGB) or 4 (RGBA)

    // 2. Extract rgb arrays
    const pixels: [number, number, number][] = []
    for (let i = 0; i < pixelCount; i++) {
      const offset = i * channels
      pixels.push([data[offset], data[offset + 1], data[offset + 2]])
    }

    if (pixels.length === 0) return []

    // 3. Simple K-Means Clustering
    // Initialize K centroids from evenly spaced pixels
    let centroids: [number, number, number][] = []
    const step = Math.floor(pixels.length / k) || 1
    for (let i = 0; i < k; i++) {
      const idx = Math.min(i * step + Math.floor(step / 2), pixels.length - 1)
      centroids.push([...pixels[idx]])
    }

    const maxIterations = 8
    let assignments = new Array(pixels.length).fill(0)

    for (let iter = 0; iter < maxIterations; iter++) {
      let changed = false

      // Assign pixels to closest centroid
      for (let p = 0; p < pixels.length; p++) {
        const pixel = pixels[p]
        let minDist = Infinity
        let bestCentroid = 0

        for (let c = 0; c < k; c++) {
          const centroid = centroids[c]
          const dist =
            (pixel[0] - centroid[0]) ** 2 +
            (pixel[1] - centroid[1]) ** 2 +
            (pixel[2] - centroid[2]) ** 2

          if (dist < minDist) {
            minDist = dist
            bestCentroid = c
          }
        }

        if (assignments[p] !== bestCentroid) {
          assignments[p] = bestCentroid
          changed = true
        }
      }

      if (!changed) break

      // Recalculate centroids
      const newCentroidsSum = Array.from({ length: k }, () => [0, 0, 0])
      const counts = new Array(k).fill(0)

      for (let p = 0; p < pixels.length; p++) {
        const c = assignments[p]
        newCentroidsSum[c][0] += pixels[p][0]
        newCentroidsSum[c][1] += pixels[p][1]
        newCentroidsSum[c][2] += pixels[p][2]
        counts[c]++
      }

      for (let c = 0; c < k; c++) {
        if (counts[c] > 0) {
          centroids[c] = [
            Math.round(newCentroidsSum[c][0] / counts[c]),
            Math.round(newCentroidsSum[c][1] / counts[c]),
            Math.round(newCentroidsSum[c][2] / counts[c]),
          ]
        }
      }
    }

    // Sort centroids by the number of pixels assigned to them
    const centroidCounts = new Array(k).fill(0)
    for (let p = 0; p < pixels.length; p++) {
      centroidCounts[assignments[p]]++
    }

    const sortedCentroids = centroids
      .map((c, i) => ({ color: c, count: centroidCounts[i] }))
      .sort((a, b) => b.count - a.count)
      .map(item => item.color)

    // Convert to Hex strings
    return sortedCentroids.map(([r, g, b]) => {
      const toHex = (val: number) => val.toString(16).padStart(2, '0')
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`
    })
  } catch (error) {
    console.error('Error extracting dominant colors:', error)
    return []
  }
}
