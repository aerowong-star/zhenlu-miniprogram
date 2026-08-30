const MAX_BACKUP_BYTES = 750 * 1024

function byteLength(value) { return Buffer.byteLength(value, 'utf8') }

function validateBackupPayload(payload) {
  if (!payload || ![3, 4].includes(payload.schemaVersion) || !payload.data) throw new Error('备份格式不受支持')
  const data = payload.data
  if (!Array.isArray(data.patients) || !Array.isArray(data.events) || !Array.isArray(data.visitPlans)) throw new Error('备份数据不完整')
  if (data.patients.length > 20 || data.events.length > 5000 || data.visitPlans.length > 500) throw new Error('备份记录数量异常')
  if (byteLength(JSON.stringify(payload)) > MAX_BACKUP_BYTES) throw new Error('备份文件超过大小限制')

  const patientIds = new Set(data.patients.map(item => item && item.id).filter(Boolean))
  if (patientIds.size !== data.patients.length) throw new Error('患者档案标识无效')

  const eventOwners = new Map()
  for (const event of data.events) {
    if (!event || !event.id || eventOwners.has(event.id) || !patientIds.has(event.patientId)) throw new Error('病程数据关联无效')
    eventOwners.set(event.id, event.patientId)
  }

  const planIds = new Set()
  for (const plan of data.visitPlans) {
    if (!plan || !plan.id || planIds.has(plan.id) || !patientIds.has(plan.patientId)) throw new Error('复诊计划关联无效')
    if (!Array.isArray(plan.selectedEventIds) || plan.selectedEventIds.some(id => eventOwners.get(id) !== plan.patientId)) throw new Error('复诊材料关联无效')
    planIds.add(plan.id)
  }
  if (data.activePatientId && !patientIds.has(data.activePatientId)) throw new Error('当前患者档案无效')
  return true
}

module.exports = { MAX_BACKUP_BYTES, validateBackupPayload }
