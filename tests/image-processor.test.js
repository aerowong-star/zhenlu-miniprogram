const test = require('node:test')
const assert = require('node:assert/strict')
const {
  TARGET_IMAGE_BYTES,
  calculateDimensions,
  prepareImageForOcr,
} = require('../miniprogram/services/image-processor')

function fakeWechat({ width = 2000, height = 1200, sizes = {} } = {}) {
  const compressions = []
  return {
    compressions,
    getImageInfo({ success }) { success({ width, height }) },
    getFileInfo({ filePath, success }) { success({ size: sizes[filePath] || 0 }) },
    compressImage(options) {
      compressions.push(options)
      options.success({ tempFilePath: `compressed-${compressions.length}.jpg` })
    },
  }
}

test('calculates proportional dimensions without cropping the report', () => {
  assert.deepEqual(calculateDimensions(5000, 2500, 3000), { width: 3000, height: 1500 })
  assert.deepEqual(calculateDimensions(1200, 2000, 3000), { width: 1200, height: 2000 })
})

test('keeps an already compliant image unchanged', async () => {
  const api = fakeWechat({ sizes: { 'report.jpg': 900000 } })
  const result = await prepareImageForOcr('report.jpg', api)
  assert.equal(result.path, 'report.jpg')
  assert.equal(result.optimized, false)
  assert.equal(api.compressions.length, 0)
})

test('compresses repeatedly until the image reaches the safe target', async () => {
  const api = fakeWechat({
    width: 5000,
    height: 2500,
    sizes: {
      'report.jpg': 6000000,
      'compressed-1.jpg': TARGET_IMAGE_BYTES + 100,
      'compressed-2.jpg': TARGET_IMAGE_BYTES - 100,
    },
  })
  const result = await prepareImageForOcr('report.jpg', api)
  assert.equal(result.path, 'compressed-2.jpg')
  assert.equal(result.optimized, true)
  assert.equal(api.compressions.length, 2)
  assert.equal(api.compressions[0].compressedWidth, 3000)
  assert.equal(api.compressions[0].compressedHeight, 1500)
})
