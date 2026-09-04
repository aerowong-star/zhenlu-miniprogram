const test = require('node:test')
const assert = require('node:assert/strict')
const { normalizeCloudError, businessError } = require('../miniprogram/services/cloud-error')

test('maps cloud platform errors without exposing trace details', () => {
  const error = normalizeCloudError(new Error('FUNCTION_NOT_FOUND callId: sensitive-trace'))
  assert.match(error.message, /尚未部署/)
  assert.equal(error.message.includes('callId'), false)
})

test('maps timeouts and network failures to actionable messages', () => {
  assert.match(normalizeCloudError(new Error('TIME_LIMIT_EXCEEDED')).message, /超时/)
  assert.match(normalizeCloudError(new Error('request:fail network')).message, /网络/)
})

test('preserves validated business messages', () => {
  const source = businessError('邀请码已经过期')
  assert.equal(normalizeCloudError(source), source)
})
