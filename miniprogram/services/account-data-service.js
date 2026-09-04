const { normalizeCloudError, businessError } = require('./cloud-error')
const FUNCTION_NAME = 'manageMyCloudData'

async function call(action) {
  try {
    if (!wx.cloud || typeof wx.cloud.callFunction !== 'function') throw businessError('当前微信版本不支持云开发，请更新微信后重试')
    const response = await wx.cloud.callFunction({ name: FUNCTION_NAME, data: { action } })
    const result = response && response.result
    if (!result || result.ok !== true) throw businessError((result && result.message) || '云端数据操作未完成')
    return result.data || {}
  } catch (error) {
    throw normalizeCloudError(error, '云端数据管理服务暂时不可用，请稍后重试')
  }
}

function inspect() { return call('inspect') }
function deleteAll() { return call('deleteAll') }
module.exports = { inspect, deleteAll }
