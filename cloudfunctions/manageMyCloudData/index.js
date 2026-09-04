const crypto = require('crypto')
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function digest(value) { return crypto.createHash('sha256').update(value).digest('hex').slice(0, 32) }
function backupId(openid) { return digest(openid) }
function careUserHash(openid) { return digest(`user:${openid}`) }
function ocrUserHash(openid) { return digest(openid) }
function success(data = {}) { return { ok: true, data } }
function failure(message) { return { ok: false, message } }
function isMissingRecord(error) {
  const code = error && error.errCode
  const message = (error && (error.errMsg || error.message)) || ''
  return code === -1 || code === -502001 || code === 'DATABASE_DOCUMENT_NOT_EXIST' || /document.*not exist|document.*not found/i.test(message)
}
function isMissingCollection(error) {
  const message = (error && (error.errMsg || error.message)) || ''
  return error && error.errCode === 'DATABASE_COLLECTION_NOT_EXIST' || /collection.*not exist|DATABASE_COLLECTION_NOT_EXIST/i.test(message)
}
async function consumeRateLimit(openid, action) {
  const userHash = digest(openid)
  const windowMs = action === 'deleteAll' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000
  const maximum = action === 'deleteAll' ? 5 : 30
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs
  const id = digest(`rate:account:${userHash}:${action}:${windowStart}`)
  const document = db.collection('service_rate_limits').doc(id)
  let current = null
  try { current = (await document.get()).data } catch (_) {}
  const count = Number(current && current.count || 0)
  if (count >= maximum) throw new Error('数据管理操作过于频繁，请稍后再试')
  await document.set({ data: {
    userHash, service: 'account', operation: action, count: count + 1,
    expiresAt: new Date(windowStart + windowMs + 24 * 60 * 60 * 1000).toISOString(),
  } })
}

async function documentExists(collection, id) {
  try { return Boolean((await db.collection(collection).doc(id).get()).data) } catch (error) {
    if (isMissingRecord(error) || isMissingCollection(error)) return false
    throw error
  }
}
async function countWhere(collection, where) {
  try { return Number((await db.collection(collection).where(where).count()).total || 0) } catch (error) {
    if (isMissingCollection(error)) return 0
    throw error
  }
}
async function removeWhere(collection, where) {
  let deleted = 0
  try {
    for (let batch = 0; batch < 100; batch += 1) {
      const result = await db.collection(collection).where(where).limit(100).get()
      const records = result.data || []
      if (!records.length) break
      await Promise.all(records.map(record => db.collection(collection).doc(record._id).remove()))
      deleted += records.length
      if (records.length < 100) break
    }
  } catch (error) {
    if (!isMissingCollection(error)) throw error
  }
  return deleted
}
async function inspect(openid) {
  const careHash = careUserHash(openid)
  const [backup, pendingInviteCount, managedShareCount, receivedShareCount] = await Promise.all([
    documentExists('user_backups', backupId(openid)),
    countWhere('care_invites', { ownerHash: careHash }),
    countWhere('care_grants', { ownerHash: careHash }),
    countWhere('care_grants', { caregiverHash: careHash }),
  ])
  return { backupCount: backup ? 1 : 0, pendingInviteCount, managedShareCount, receivedShareCount }
}

exports.main = async event => {
  try {
    const { OPENID } = cloud.getWXContext()
    if (!OPENID) return failure('无法确认当前微信身份')
    const action = event && event.action
    if (!['inspect', 'deleteAll'].includes(action)) return failure('不支持的云端数据操作')
    await consumeRateLimit(OPENID, action)
    const summary = await inspect(OPENID)
    if (action === 'inspect') return success({ summary })

    const deleted = {
      backupCount: 0, pendingInviteCount: 0, shareCount: 0, rateLimitCount: 0,
    }
    if (summary.backupCount) {
      await db.collection('user_backups').doc(backupId(OPENID)).remove()
      deleted.backupCount = 1
    }
    const careHash = careUserHash(OPENID)
    deleted.pendingInviteCount = await removeWhere('care_invites', { ownerHash: careHash })
    deleted.shareCount += await removeWhere('care_grants', { ownerHash: careHash })
    deleted.shareCount += await removeWhere('care_grants', { caregiverHash: careHash })
    deleted.rateLimitCount = await removeWhere('ocr_rate_limits', { userHash: ocrUserHash(OPENID) })
    deleted.rateLimitCount += await removeWhere('service_rate_limits', { userHash: digest(OPENID) })
    return success({ deleted })
  } catch (error) {
    console.error('用户云端数据管理失败', { action: event && event.action, message: error.message })
    return failure('云端数据操作未完成，请稍后重试')
  }
}
