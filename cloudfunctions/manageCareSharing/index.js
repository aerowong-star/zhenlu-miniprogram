const crypto = require('crypto')
const cloud = require('wx-server-sdk')
const { normalizeInviteCode, sanitizeSnapshot, validateSnapshot } = require('./validation')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const INVITES = 'care_invites'
const GRANTS = 'care_grants'
const RATE_LIMITS = 'service_rate_limits'
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const ALLOWED_EXPIRY_HOURS = new Set([24, 72, 168])

function success(data = {}) { return { ok: true, data } }
function failure(message) { return { ok: false, message } }
function publicErrorMessage(error) {
  const message = String(error && error.message || '')
  const safePatterns = [
    /^操作过于频繁/, /^邀请码/, /^不能接受自己创建的邀请码$/,
    /^请输入有效的 12 位邀请码$/, /^共享/, /^患者标识格式无效$/,
    /^患者称呼格式无效$/, /^病种名称格式无效$/,
  ]
  return safePatterns.some(pattern => pattern.test(message)) ? message : '照护者协作服务暂时不可用'
}
function hash(value) { return crypto.createHash('sha256').update(value).digest('hex').slice(0, 32) }
function userHash(openid) { return hash(`user:${openid}`) }
function inviteId(code) { return hash(`invite:${code}`) }
function grantId(ownerHash, caregiverHash, patientId) { return hash(`grant:${ownerHash}:${caregiverHash}:${patientId}`) }
function makeCode() {
  let code = ''
  for (let index = 0; index < 12; index += 1) code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]
  return code
}
function displayCode(code) { return code.match(/.{1,4}/g).join('-') }
function publicGrant(record, role, includeSnapshot = true) {
  return {
    id: record._id,
    role,
    caregiverLabel: record.caregiverLabel || '照护者',
    snapshot: includeSnapshot ? record.snapshot : { patient: record.snapshot.patient },
    scopes: record.scopes,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    revokedAt: record.revokedAt || '',
  }
}
function publicInvite(record) {
  return {
    id: record._id,
    caregiverLabel: record.caregiverLabel || '照护者',
    patientLabel: record.snapshot.patient.nickname || '患者称呼已隐藏',
    diseaseName: record.snapshot.patient.diseaseName || '病种待补充',
    scopes: record.scopes,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
  }
}
async function readDocument(collection, id) {
  try {
    const result = await db.collection(collection).doc(id).get()
    return result.data || null
  } catch (error) {
    const code = error && error.errCode
    const message = (error && (error.errMsg || error.message)) || ''
    if (code === -1 || code === -502001 || code === 'DATABASE_DOCUMENT_NOT_EXIST' || /not exist|not found/i.test(message)) return null
    throw error
  }
}
async function consumeRateLimit(rateUserHash, operation, maximum, windowMs) {
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs
  const id = hash(`rate:care:${rateUserHash}:${operation}:${windowStart}`)
  const document = db.collection(RATE_LIMITS).doc(id)
  let current = null
  try { current = (await document.get()).data } catch (_) {}
  const count = Number(current && current.count || 0)
  if (count >= maximum) throw new Error('操作过于频繁，请稍后再试')
  await document.set({ data: {
    userHash: rateUserHash, service: 'care', operation, count: count + 1,
    expiresAt: new Date(windowStart + windowMs + 24 * 60 * 60 * 1000).toISOString(),
  } })
}

exports.main = async event => {
  try {
    const { OPENID } = cloud.getWXContext()
    if (!OPENID) return failure('无法确认当前微信身份')
    const callerHash = userHash(OPENID)
    const action = event && event.action
    const rateUserHash = hash(OPENID)
    if (action === 'createInvite') await consumeRateLimit(rateUserHash, 'createInvite', 20, 24 * 60 * 60 * 1000)
    else if (action === 'previewInvite' || action === 'acceptInvite') await consumeRateLimit(rateUserHash, 'inviteAccess', 60, 60 * 60 * 1000)
    else await consumeRateLimit(rateUserHash, 'careReadWrite', 300, 60 * 60 * 1000)

    if (action === 'createInvite') {
      const sanitized = sanitizeSnapshot(event.snapshot, event.scopes)
      const scopes = sanitized.scopes
      const expiresHours = Number(event.expiresHours)
      if (!ALLOWED_EXPIRY_HOURS.has(expiresHours)) return failure('邀请码有效期无效')
      const caregiverLabel = String(event.caregiverLabel || '照护者').trim().slice(0, 20) || '照护者'
      let code; let id; let available = false
      for (let attempt = 0; attempt < 3; attempt += 1) {
        code = makeCode(); id = inviteId(code)
        if (!(await readDocument(INVITES, id))) { available = true; break }
      }
      if (!available) return failure('邀请码生成失败，请稍后重试')
      const createdAt = new Date().toISOString()
      const expiresAt = new Date(Date.now() + expiresHours * 60 * 60 * 1000).toISOString()
      await db.collection(INVITES).doc(id).set({ data: {
        ownerHash: callerHash, caregiverLabel, scopes, snapshot: sanitized.snapshot,
        status: 'active', createdAt, expiresAt,
      } })
      return success({ code: displayCode(code), expiresAt })
    }

    if (action === 'acceptInvite') {
      const code = normalizeInviteCode(event.code)
      const id = inviteId(code)
      let acceptedGrant; let expired = false
      await db.runTransaction(async transaction => {
        const result = await transaction.collection(INVITES).doc(id).get()
        const invite = result.data
        if (!invite || invite.status !== 'active') throw new Error('邀请码不存在或已被使用')
        if (Date.parse(invite.expiresAt) <= Date.now()) {
          expired = true
          await transaction.collection(INVITES).doc(id).remove()
          return
        }
        if (invite.ownerHash === callerHash) throw new Error('不能接受自己创建的邀请码')
        const scopes = validateSnapshot(invite.snapshot, invite.scopes)
        const idForGrant = grantId(invite.ownerHash, callerHash, invite.snapshot.patient.id)
        const now = new Date().toISOString()
        acceptedGrant = {
          ownerHash: invite.ownerHash, caregiverHash: callerHash,
          caregiverLabel: invite.caregiverLabel, snapshot: invite.snapshot, scopes,
          status: 'active', createdAt: now, updatedAt: now, revokedAt: '',
        }
        await transaction.collection(GRANTS).doc(idForGrant).set({ data: acceptedGrant })
        await transaction.collection(INVITES).doc(id).remove()
        acceptedGrant._id = idForGrant
      })
      if (expired) return failure('邀请码已过期')
      return success({ grant: publicGrant(acceptedGrant, 'caregiver') })
    }

    if (action === 'previewInvite') {
      const code = normalizeInviteCode(event.code)
      const invite = await readDocument(INVITES, inviteId(code))
      if (!invite || invite.status !== 'active') return failure('邀请码不存在或已被使用')
      if (Date.parse(invite.expiresAt) <= Date.now()) return failure('邀请码已过期')
      return success({ preview: {
        caregiverLabel: invite.caregiverLabel,
        patientLabel: invite.snapshot.patient.nickname || '患者称呼已隐藏',
        diseaseName: invite.snapshot.patient.diseaseName || '病种待补充',
        scopes: invite.scopes,
        expiresAt: invite.expiresAt,
      } })
    }

    if (action === 'listShares') {
      const [owned, received, pendingResult] = await Promise.all([
        db.collection(GRANTS).where({ ownerHash: callerHash }).limit(100).get(),
        db.collection(GRANTS).where({ caregiverHash: callerHash }).limit(100).get(),
        db.collection(INVITES).where({ ownerHash: callerHash }).limit(100).get(),
      ])
      const now = Date.now()
      const pending = []
      for (const invite of (pendingResult.data || []).filter(item => item.status === 'active')) {
        if (Date.parse(invite.expiresAt) <= now) await db.collection(INVITES).doc(invite._id).remove()
        else pending.push(publicInvite(invite))
      }
      return success({
        owned: (owned.data || []).filter(item => item.status === 'active').map(item => publicGrant(item, 'owner', false)),
        received: (received.data || []).filter(item => item.status === 'active').map(item => publicGrant(item, 'caregiver', false)),
        pending,
      })
    }

    if (action === 'cancelInvite') {
      const invite = await readDocument(INVITES, String(event.inviteId || ''))
      if (!invite || invite.ownerHash !== callerHash) return failure('无权取消此邀请码')
      await db.collection(INVITES).doc(invite._id).remove()
      return success({ cancelled: true })
    }

    if (action === 'getGrant') {
      const grant = await readDocument(GRANTS, String(event.grantId || ''))
      if (!grant || grant.status !== 'active') return failure('共享授权不存在或已被撤销')
      const role = grant.ownerHash === callerHash ? 'owner' : grant.caregiverHash === callerHash ? 'caregiver' : ''
      if (!role) return failure('无权查看此共享内容')
      return success({ grant: publicGrant(grant, role) })
    }

    if (action === 'revokeGrant') {
      const grant = await readDocument(GRANTS, String(event.grantId || ''))
      if (!grant || grant.ownerHash !== callerHash) return failure('无权撤销此共享授权')
      const revokedAt = new Date().toISOString()
      await db.collection(GRANTS).doc(grant._id).remove()
      return success({ revokedAt })
    }

    if (action === 'leaveGrant') {
      const grant = await readDocument(GRANTS, String(event.grantId || ''))
      if (!grant || grant.caregiverHash !== callerHash) return failure('无权退出此共享授权')
      const revokedAt = new Date().toISOString()
      await db.collection(GRANTS).doc(grant._id).remove()
      return success({ leftAt: revokedAt })
    }

    if (action === 'refreshGrant') {
      const grant = await readDocument(GRANTS, String(event.grantId || ''))
      if (!grant || grant.ownerHash !== callerHash || grant.status !== 'active') return failure('无权更新此共享授权')
      const sanitized = sanitizeSnapshot(event.snapshot, grant.scopes)
      const scopes = sanitized.scopes
      if (sanitized.snapshot.patient.id !== grant.snapshot.patient.id) return failure('不能更换共享授权对应的患者档案')
      const updatedAt = new Date().toISOString()
      await db.collection(GRANTS).doc(grant._id).update({ data: { snapshot: sanitized.snapshot, scopes, updatedAt } })
      return success({ updatedAt })
    }

    return failure('不支持的照护协作操作')
  } catch (error) {
    console.error('照护协作操作失败', { action: event && event.action, message: error.message })
    return failure(publicErrorMessage(error))
  }
}
