const test = require('node:test')
const assert = require('node:assert/strict')

global.wx = {
  _store: {},
  getStorageSync(key) { return this._store[key] },
  setStorageSync(key, value) { this._store[key] = structuredClone(value) },
  removeStorageSync(key) { delete this._store[key] },
}
const service = require('../miniprogram/services/privacy-service')

test.beforeEach(() => { global.wx._store = {} })

test('privacy consent is invalid until the current policy is accepted', () => {
  assert.equal(service.hasValidConsent(), false)
  const consent = service.accept()
  assert.equal(consent.version, service.CURRENT_VERSION)
  assert.equal(service.hasValidConsent(), true)
})

test('old policy versions require renewed consent', () => {
  global.wx._store[service.STORAGE_KEY] = { accepted: true, version: 'old-version' }
  assert.equal(service.hasValidConsent(), false)
})

test('revoking consent removes the local consent record', () => {
  service.accept(); service.revoke()
  assert.equal(service.getConsent(), null)
  assert.equal(service.hasValidConsent(), false)
})
