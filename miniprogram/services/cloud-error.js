function rawMessage(error) {
  return String((error && (error.errMsg || error.message)) || error || '')
}

function normalizeCloudError(error, fallback = '云服务暂时不可用，请稍后重试') {
  if (error && error.isBusinessError) return error
  const message = rawMessage(error)
  let friendly = fallback
  if (/FUNCTION_NOT_FOUND|FunctionName parameter could not be found/i.test(message)) friendly = '云函数尚未部署到当前环境，请联系管理员完成部署'
  else if (/TIME_LIMIT_EXCEEDED|timed out|timeout|超时/i.test(message)) friendly = '云服务响应超时，请检查网络后重试'
  else if (/collection.*not exist|DATABASE_COLLECTION_NOT_EXIST|集合不存在/i.test(message)) friendly = '云端数据库尚未配置完整，请联系管理员'
  else if (/network|request:fail|ERR_NETWORK|连接失败|断网/i.test(message)) friendly = '网络连接不可用，请恢复网络后重试'
  else if (/quota|RESOURCE_EXHAUSTED|资源.*耗尽|免费额度/i.test(message)) friendly = '云服务额度暂时不足，请稍后再试或联系管理员'
  else if (/permission|PERMISSION_DENIED|auth|无权限/i.test(message)) friendly = '当前微信身份无权执行此操作'
  const normalized = new Error(friendly)
  normalized.code = 'CLOUD_SERVICE_ERROR'
  return normalized
}

function businessError(message) {
  const error = new Error(message || '操作未完成')
  error.isBusinessError = true
  return error
}

module.exports = { normalizeCloudError, businessError }
