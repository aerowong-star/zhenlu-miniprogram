const TARGET_IMAGE_BYTES = Math.floor(1.8 * 1024 * 1024)
const MAX_LONG_EDGE = 3000

// Start with a high-quality, full-report image. Only reduce dimensions when
// quality-only compression is not enough, so small laboratory values stay legible.
const COMPRESSION_PROFILES = [
  { maxLongEdge: 3000, quality: 85 },
  { maxLongEdge: 3000, quality: 70 },
  { maxLongEdge: 2600, quality: 65 },
  { maxLongEdge: 2200, quality: 60 },
  { maxLongEdge: 1800, quality: 55 },
  { maxLongEdge: 1600, quality: 50 },
]

function calculateDimensions(width, height, maxLongEdge = MAX_LONG_EDGE) {
  const sourceWidth = Number(width)
  const sourceHeight = Number(height)
  if (!(sourceWidth > 0) || !(sourceHeight > 0)) throw new Error('无法读取图片尺寸')
  const longest = Math.max(sourceWidth, sourceHeight)
  if (longest <= maxLongEdge) return { width: Math.round(sourceWidth), height: Math.round(sourceHeight) }
  const ratio = maxLongEdge / longest
  return { width: Math.round(sourceWidth * ratio), height: Math.round(sourceHeight * ratio) }
}

function getImageInfo(api, src) {
  return new Promise((resolve, reject) => api.getImageInfo({
    src,
    success: resolve,
    fail: () => reject(new Error('无法读取该图片，请重新选择 JPG 或 PNG 图片')),
  }))
}

function getFileSize(api, filePath) {
  return new Promise((resolve, reject) => api.getFileInfo({
    filePath,
    success: result => resolve(Number(result.size) || 0),
    fail: () => reject(new Error('无法读取图片文件大小')),
  }))
}

function compress(api, src, quality, dimensions) {
  return new Promise((resolve, reject) => api.compressImage({
    src,
    quality,
    compressedWidth: dimensions.width,
    compressedHeight: dimensions.height,
    success: result => resolve(result.tempFilePath),
    fail: () => reject(new Error('图片自动优化失败，请重新选择图片')),
  }))
}

async function prepareImageForOcr(sourcePath, api) {
  if (!sourcePath) throw new Error('请先选择报告图片')
  const runtime = api || wx
  if (!runtime.getImageInfo || !runtime.getFileInfo || !runtime.compressImage) {
    throw new Error('当前微信版本不支持图片自动优化，请升级微信后重试')
  }

  const [imageInfo, originalBytes] = await Promise.all([
    getImageInfo(runtime, sourcePath),
    getFileSize(runtime, sourcePath),
  ])
  const originalLongest = Math.max(Number(imageInfo.width), Number(imageInfo.height))
  if (originalBytes <= TARGET_IMAGE_BYTES && originalLongest <= MAX_LONG_EDGE) {
    return { path: sourcePath, originalBytes, finalBytes: originalBytes, optimized: false }
  }

  for (const profile of COMPRESSION_PROFILES) {
    const dimensions = calculateDimensions(imageInfo.width, imageInfo.height, profile.maxLongEdge)
    const path = await compress(runtime, sourcePath, profile.quality, dimensions)
    const finalBytes = await getFileSize(runtime, path)
    if (finalBytes > 0 && finalBytes <= TARGET_IMAGE_BYTES) {
      return { path, originalBytes, finalBytes, optimized: true }
    }
  }

  throw new Error('图片自动优化后仍超过上传限制，请换用清晰度稍低的照片')
}

module.exports = {
  TARGET_IMAGE_BYTES,
  MAX_LONG_EDGE,
  COMPRESSION_PROFILES,
  calculateDimensions,
  prepareImageForOcr,
}
