const STORAGE_KEY = 'zhenlu_privacy_consent_v1'
const CURRENT_VERSION = '2026-09-02'

function getConsent() {
  try { return wx.getStorageSync(STORAGE_KEY) || null } catch (_) { return null }
}
function hasValidConsent() {
  const consent = getConsent()
  return Boolean(consent && consent.accepted === true && consent.version === CURRENT_VERSION)
}
function accept() {
  const consent = { accepted: true, version: CURRENT_VERSION, acceptedAt: new Date().toISOString() }
  wx.setStorageSync(STORAGE_KEY, consent)
  return consent
}
function revoke() {
  try { wx.removeStorageSync(STORAGE_KEY) } catch (_) { wx.setStorageSync(STORAGE_KEY, null) }
}

module.exports = { STORAGE_KEY, CURRENT_VERSION, getConsent, hasValidConsent, accept, revoke }
