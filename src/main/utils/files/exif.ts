import ExifReader from 'exifreader'
import fs from 'fs/promises'

export interface ExifMetadata {
  cameraMake?: string
  cameraModel?: string
  dateTaken?: string
  exposureTime?: string
  aperture?: string
  iso?: number
  focalLength?: string
  lensModel?: string
  software?: string
  gpsLatitude?: number
  gpsLongitude?: number
  raw?: Record<string, string>
}

function parseRational(val: any): number {
  if (val === null || val === undefined) return 0
  if (typeof val === 'number') return val
  if (typeof val === 'string') return parseFloat(val) || 0
  if (typeof val === 'object' && 'numerator' in val && 'denominator' in val) {
    return val.denominator === 0 ? 0 : val.numerator / val.denominator
  }
  return Number(val) || 0
}

export async function extractExif(
  filePath: string,
): Promise<ExifMetadata | null> {
  try {
    const buffer = await fs.readFile(filePath)
    const tags = ExifReader.load(buffer)

    const cameraMake = tags['Make']?.description || undefined
    const cameraModel = tags['Model']?.description || undefined

    // Date taken can be DateTimeOriginal, DateTimeDigitized, or DateTime
    const dateTaken =
      tags['DateTimeOriginal']?.description ||
      tags['DateTimeDigitized']?.description ||
      tags['DateTime']?.description ||
      undefined

    const exposureTime = tags['ExposureTime']?.description || undefined
    const aperture = tags['FNumber']?.description || undefined

    let iso: number | undefined
    if (tags['ISOSpeedRatings']) {
      const val = tags['ISOSpeedRatings'].value
      iso = Array.isArray(val) ? Number(val[0]) : Number(val)
    }

    const focalLength = tags['FocalLength']?.description || undefined
    const lensModel = tags['LensModel']?.description || undefined
    const software = tags['Software']?.description || undefined

    let gpsLatitude: number | undefined
    let gpsLongitude: number | undefined

    if (tags['GPSLatitude'] && tags['GPSLatitudeRef']) {
      const latValue = tags['GPSLatitude'].value
      const latRef = tags['GPSLatitudeRef'].description
      if (Array.isArray(latValue) && latValue.length >= 3) {
        const deg = parseRational(latValue[0])
        const min = parseRational(latValue[1])
        const sec = parseRational(latValue[2])
        let lat = deg + min / 60 + sec / 3600
        if (latRef === 'S' || latRef === 'South' || latRef?.startsWith('S')) {
          lat = -lat
        }
        gpsLatitude = lat
      }
    }

    if (tags['GPSLongitude'] && tags['GPSLongitudeRef']) {
      const lonValue = tags['GPSLongitude'].value
      const lonRef = tags['GPSLongitudeRef'].description
      if (Array.isArray(lonValue) && lonValue.length >= 3) {
        const deg = parseRational(lonValue[0])
        const min = parseRational(lonValue[1])
        const sec = parseRational(lonValue[2])
        let lon = deg + min / 60 + sec / 3600
        if (lonRef === 'W' || lonRef === 'West' || lonRef?.startsWith('W')) {
          lon = -lon
        }
        gpsLongitude = lon
      }
    }

    // Extract raw metadata tags (like Stable Diffusion prompts, custom headers, etc.)
    const raw: Record<string, string> = {}
    for (const key of Object.keys(tags)) {
      const lowerKey = key.toLowerCase()
      // Skip known binary or extremely large blocks
      if (
        lowerKey === 'thumbnail' ||
        lowerKey === 'makernote' ||
        lowerKey === 'xmp' ||
        lowerKey === 'iptc' ||
        lowerKey === 'photoshop' ||
        lowerKey.includes('iccp') ||
        lowerKey.includes('colorprofile')
      ) {
        continue
      }
      const tag = tags[key]
      if (tag && typeof tag === 'object') {
        const desc = tag.description
        if (desc && typeof desc === 'string') {
          const trimmed = desc.trim()
          if (trimmed.length > 0 && trimmed.length < 50000) {
            raw[key] = trimmed
          }
        } else if (tag.value !== undefined && tag.value !== null) {
          const valStr = Array.isArray(tag.value)
            ? tag.value.join(', ')
            : String(tag.value)
          const trimmed = valStr.trim()
          if (trimmed.length > 0 && trimmed.length < 50000) {
            raw[key] = trimmed
          }
        }
      }
    }

    // Return only non-empty objects
    const metadata: ExifMetadata = {
      cameraMake,
      cameraModel,
      dateTaken,
      exposureTime,
      aperture,
      iso: iso && !isNaN(iso) ? iso : undefined,
      focalLength,
      lensModel,
      software,
      gpsLatitude: gpsLatitude && !isNaN(gpsLatitude) ? gpsLatitude : undefined,
      gpsLongitude:
        gpsLongitude && !isNaN(gpsLongitude) ? gpsLongitude : undefined,
    }

    // Clean undefined keys
    Object.keys(metadata).forEach(key => {
      if (metadata[key] === undefined) {
        delete (metadata as any)[key]
      }
    })

    if (Object.keys(raw).length > 0) {
      metadata.raw = raw
    }

    return Object.keys(metadata).length > 0 ? metadata : null
  } catch (error) {
    // If not a supported format or no EXIF, catch and return null
    return null
  }
}
