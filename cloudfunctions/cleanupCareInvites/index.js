const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const command = db.command

exports.main = async () => {
  const now = new Date().toISOString()
  let deleted = 0
  for (let batch = 0; batch < 10; batch += 1) {
    const result = await db.collection('care_invites').where({ expiresAt: command.lt(now) }).limit(100).get()
    const records = result.data || []
    if (!records.length) break
    await Promise.all(records.map(item => db.collection('care_invites').doc(item._id).remove()))
    deleted += records.length
    if (records.length < 100) break
  }
  console.log('过期照护邀请码清理完成', { deleted })
  let rateLimitsDeleted = 0
  try {
    for (let batch = 0; batch < 10; batch += 1) {
      const result = await db.collection('ocr_rate_limits').where({ expiresAt: command.lt(now) }).limit(100).get()
      const records = result.data || []
      if (!records.length) break
      await Promise.all(records.map(item => db.collection('ocr_rate_limits').doc(item._id).remove()))
      rateLimitsDeleted += records.length
      if (records.length < 100) break
    }
  } catch (error) {
    console.warn('OCR 限流记录清理跳过', { message: error.message })
  }
  let serviceRateLimitsDeleted = 0
  try {
    for (let batch = 0; batch < 10; batch += 1) {
      const result = await db.collection('service_rate_limits').where({ expiresAt: command.lt(now) }).limit(100).get()
      const records = result.data || []
      if (!records.length) break
      await Promise.all(records.map(item => db.collection('service_rate_limits').doc(item._id).remove()))
      serviceRateLimitsDeleted += records.length
      if (records.length < 100) break
    }
  } catch (error) {
    console.warn('服务限流记录清理跳过', { message: error.message })
  }
  return { ok: true, deleted, rateLimitsDeleted, serviceRateLimitsDeleted }
}
