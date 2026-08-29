const test = require('node:test')
const assert = require('node:assert/strict')
const { isTemporaryOcrFile } = require('../cloudfunctions/recognizeMedicalReport/validation')

test('accepts only files in the OCR temporary cloud directory', () => {
  assert.equal(isTemporaryOcrFile('cloud://cloud1.example/ocr-temp/report.jpg'), true)
  assert.equal(isTemporaryOcrFile('cloud://cloud1.example/patient-files/report.jpg'), false)
  assert.equal(isTemporaryOcrFile('https://example.com/ocr-temp/report.jpg'), false)
  assert.equal(isTemporaryOcrFile('cloud://cloud1.example/ocr-temp/../private.jpg'), false)
})
