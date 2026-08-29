const test = require('node:test')
const assert = require('node:assert/strict')
const { normalizeMedicalReport } = require('../miniprogram/services/ocr-normalizer')
const { recognizeDemo } = require('../miniprogram/services/ocr-service')

test('normalizes Baidu medical report fields and rows', () => {
  const result = normalizeMedicalReport({
    log_id: 123,
    words_result: {
      CommonData: [
        { word_name: '医院', word: ' 测试医院 ' },
        { word_name: '报告单名称', word: '血常规' },
        { word_name: '时间', word: '2026-08-18' },
      ],
      Item: [[
        { word_name: '项目名称', word: '白细胞' },
        { word_name: '结果', word: '8.2' },
        { word_name: '单位', word: '10^9/L' },
        { word_name: '参考区间', word: '3.5-9.5' },
        { word_name: '结果提示', word: '' },
      ]],
    },
  })
  assert.equal(result.hospital, '测试医院')
  assert.equal(result.reportTitle, '血常规')
  assert.equal(result.items[0].name, '白细胞')
  assert.equal(result.items[0].reference, '3.5-9.5')
  assert.equal(result.providerLogId, '123')
})

test('rejects OCR error responses', () => {
  assert.throws(() => normalizeMedicalReport({ error_code: 17, error_msg: 'Open api daily request limit reached' }))
})

test('demo OCR uses fictional structured data without cloud access', async () => {
  const result = await recognizeDemo()
  assert.equal(result.provider, 'demo')
  assert.equal(result.isDemo, true)
  assert.equal(result.items.length, 2)
  assert.match(result.hospital, /虚构/)
})
