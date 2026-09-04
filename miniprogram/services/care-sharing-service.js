const FUNCTION_NAME = 'manageCareSharing'
const { normalizeCloudError, businessError } = require('./cloud-error')

async function call(action, data = {}) {
  try {
    if (!wx.cloud || typeof wx.cloud.callFunction !== 'function') throw businessError('当前微信版本不支持云开发，请更新微信后重试')
    const response = await wx.cloud.callFunction({ name: FUNCTION_NAME, data: { action, ...data } })
    const result = response && response.result
    if (!result || result.ok !== true) throw businessError((result && result.message) || '照护者协作服务暂时不可用')
    return result.data || {}
  } catch (error) {
    throw normalizeCloudError(error, '照护者协作服务暂时不可用，请稍后重试')
  }
}

function createInvite(snapshot, scopes, caregiverLabel, expiresHours) {
  return call('createInvite', { snapshot, scopes, caregiverLabel, expiresHours })
}
function previewInvite(code) { return call('previewInvite', { code }) }
function acceptInvite(code) { return call('acceptInvite', { code }) }
function listShares() { return call('listShares') }
function getGrant(grantId) { return call('getGrant', { grantId }) }
function revokeGrant(grantId) { return call('revokeGrant', { grantId }) }
function leaveGrant(grantId) { return call('leaveGrant', { grantId }) }
function cancelInvite(inviteId) { return call('cancelInvite', { inviteId }) }
function refreshGrant(grantId, snapshot, scopes) { return call('refreshGrant', { grantId, snapshot, scopes }) }

module.exports = { createInvite, previewInvite, acceptInvite, listShares, getGrant, revokeGrant, leaveGrant, cancelInvite, refreshGrant }
