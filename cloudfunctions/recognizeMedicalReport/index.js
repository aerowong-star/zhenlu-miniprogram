const cloud = require('wx-server-sdk')
const crypto = require('crypto')
const https = require('https')
const querystring = require('querystring')
const { isTemporaryOcrFile } = require('./validation')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const OCR_URL = 'https://aip.baidubce.com/rest/2.0/ocr/v1/medical_report_detection'
const TOKEN_URL = 'https://aip.baidubce.com/oauth/2.0/token'
const MAX_ENCODED_BYTES = 4 * 1024 * 1024
const MAX_RAW_BYTES = 3 * 1024 * 1024
const DAILY_LIMIT = 10
let tokenCache = null

function request(url, options = {}, body = '') {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, response => {
      const chunks = []
      response.on('data', chunk => chunks.push(chunk))
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        let data
        try { data = JSON.parse(text) } catch (_) { return reject(new Error('上游服务返回了无法解析的数据')) }
        if (response.statusCode < 200 || response.statusCode >= 300) return reject(new Error(data.error_description || data.error_msg || `上游服务状态码 ${response.statusCode}`))
        resolve(data)
      })
    })
    req.setTimeout(15000, () => req.destroy(new Error('OCR 服务响应超时')))
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

async function getAccessToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60000) return tokenCache.value
  const apiKey = process.env.BAIDU_OCR_API_KEY
  const secretKey = process.env.BAIDU_OCR_SECRET_KEY
  if (!apiKey || !secretKey) throw new Error('服务端尚未配置百度 OCR 凭证')
  const url = `${TOKEN_URL}?grant_type=client_credentials&client_id=${encodeURIComponent(apiKey)}&client_secret=${encodeURIComponent(secretKey)}`
  const data = await request(url, { method: 'POST' })
  if (!data.access_token) throw new Error(data.error_description || '获取百度 OCR 访问令牌失败')
  tokenCache = { value: data.access_token, expiresAt: Date.now() + Math.max(300, Number(data.expires_in) || 2592000) * 1000 }
  return tokenCache.value
}

async function recognize(buffer) {
  const body = querystring.stringify({ image: buffer.toString('base64'), probability: 'true' })
  if (Buffer.byteLength(body) > MAX_ENCODED_BYTES) throw new Error('图片编码后超过百度 OCR 的 4 MB 限制，请裁剪后重试')
  const token = await getAccessToken()
  const data = await request(`${OCR_URL}?access_token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
  }, body)
  if (data.error_code) throw new Error(data.error_msg || `百度 OCR 错误 ${data.error_code}`)
  return data
}

async function consumeDailyQuota(openid) {
  if (!openid) throw new Error('无法确认当前微信用户身份')
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const userHash = crypto.createHash('sha256').update(openid).digest('hex').slice(0, 32)
  const id = `${userHash}_${day}`
  const doc = cloud.database().collection('ocr_rate_limits').doc(id)
  let current = null
  try { current = (await doc.get()).data } catch (_) {}
  if (current && Number(current.count) >= DAILY_LIMIT) throw new Error(`今日识别次数已达到 ${DAILY_LIMIT} 次，请明天再试`)
  const expiresAt = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString()
  await doc.set({ data: { userHash, day, count: Number(current && current.count || 0) + 1, expiresAt, updatedAt: cloud.database().serverDate() } })
}

exports.main = async event => {
  const fileID = event && event.fileID
  if (!isTemporaryOcrFile(fileID)) return { ok: false, message: '缺少有效的 OCR 临时图片' }
  try {
    const context = cloud.getWXContext()
    await consumeDailyQuota(context.OPENID)
    const downloaded = await cloud.downloadFile({ fileID })
    if (!downloaded.fileContent || downloaded.fileContent.length > MAX_RAW_BYTES) throw new Error('图片自动优化后仍超过服务限制，请重新拍摄后重试')
    return { ok: true, data: await recognize(downloaded.fileContent) }
  } catch (error) {
    console.error('medical report OCR failed', { message: error.message })
    return { ok: false, message: error.message || 'OCR 服务调用失败' }
  } finally {
    try { await cloud.deleteFile({ fileList: [fileID] }) } catch (error) { console.warn('temporary OCR file cleanup failed', { message: error.message }) }
  }
}
