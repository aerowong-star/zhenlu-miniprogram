const crypto = require('crypto')
const cloud = require('wx-server-sdk')
const { validateBackupPayload } = require('./validation')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const COLLECTION = 'user_backups'
const RATE_LIMITS = 'service_rate_limits'

function success(data = {}) { return { ok: true, data } }
function failure(message) { return { ok: false, message } }
function publicErrorMessage(error) {
  const message = String(error && error.message || '')
  const allowed = [
    '云备份操作过于频繁，请稍后再试', '备份格式不受支持', '备份数据不完整',
    '备份记录数量异常', '备份文件超过大小限制', '患者档案标识无效',
    '病程数据关联无效', '复诊计划关联无效', '复诊材料关联无效', '当前患者档案无效',
  ]
  return allowed.includes(message) ? message : '云备份服务暂时不可用'
}
function backupId(openid) { return crypto.createHash('sha256').update(openid).digest('hex').slice(0, 32) }
async function consumeRateLimit(openid) {
  const userHash = backupId(openid)
  const windowMs = 60 * 60 * 1000
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs
  const id = crypto.createHash('sha256').update(`rate:backup:${userHash}:${windowStart}`).digest('hex').slice(0, 32)
  const document = db.collection(RATE_LIMITS).doc(id)
  let current = null
  try { current = (await document.get()).data } catch (_) {}
  const count = Number(current && current.count || 0)
  if (count >= 120) throw new Error('云备份操作过于频繁，请稍后再试')
  await document.set({ data: {
    userHash, service: 'backup', operation: 'backup', count: count + 1,
    expiresAt: new Date(windowStart + windowMs + 24 * 60 * 60 * 1000).toISOString(),
  } })
}

async function readBackup(document) {
  try {
    const result = await document.get()
    return result.data || null
  } catch (error) {
    const code = error && error.errCode
    const message = (error && (error.errMsg || error.message)) || ''
    if (code === -1 || code === -502001 || code === 'DATABASE_DOCUMENT_NOT_EXIST' || /not exist|not found/i.test(message)) return null
    throw error
  }
}

exports.main = async event => {
  try {
    const { OPENID } = cloud.getWXContext()
    if (!OPENID) return failure('无法确认当前微信身份')
    await consumeRateLimit(OPENID)
    const action = event && event.action
    const document = db.collection(COLLECTION).doc(backupId(OPENID))

    if (action === 'status') {
      const record = await readBackup(document)
      return success(record ? { exists: true, updatedAt: record.updatedAt, schemaVersion: record.schemaVersion } : { exists: false })
    }

    if (action === 'upload') {
      validateBackupPayload(event.payload)
      const updatedAt = new Date().toISOString()
      await document.set({ data: { schemaVersion: event.payload.schemaVersion, payload: event.payload, updatedAt } })
      return success({ updatedAt, schemaVersion: event.payload.schemaVersion })
    }

    if (action === 'download') {
      const record = await readBackup(document)
      if (!record) return failure('尚未找到可恢复的云端备份')
      validateBackupPayload(record.payload)
      return success({ payload: record.payload, updatedAt: record.updatedAt, schemaVersion: record.schemaVersion })
    }

    if (action === 'delete') {
      const record = await readBackup(document)
      if (record) await document.remove()
      return success({ deleted: Boolean(record) })
    }

    return failure('不支持的云备份操作')
  } catch (error) {
    console.error('云备份操作失败', { action: event && event.action, message: error.message })
    return failure(publicErrorMessage(error))
  }
}
