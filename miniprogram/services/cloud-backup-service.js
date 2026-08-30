const FUNCTION_NAME = 'manageUserBackup'

function ensureCloudAvailable() {
  if (!wx.cloud || typeof wx.cloud.callFunction !== 'function') {
    throw new Error('当前微信版本不支持云开发，请更新微信后重试')
  }
}

async function call(action, data = {}) {
  ensureCloudAvailable()
  const response = await wx.cloud.callFunction({
    name: FUNCTION_NAME,
    data: { action, ...data },
  })
  const result = response && response.result
  if (!result || result.ok !== true) {
    throw new Error((result && result.message) || '云备份服务暂时不可用，请稍后重试')
  }
  return result.data || {}
}

function getStatus() { return call('status') }
function uploadBackup(payload) { return call('upload', { payload }) }
function downloadBackup() { return call('download') }
function deleteBackup() { return call('delete') }

module.exports = { getStatus, uploadBackup, downloadBackup, deleteBackup }
