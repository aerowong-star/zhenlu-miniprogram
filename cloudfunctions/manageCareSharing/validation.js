const MAX_SNAPSHOT_BYTES = 500 * 1024

function byteLength(value) { return Buffer.byteLength(value, 'utf8') }
function safeText(value, max, field) {
  if (typeof value !== 'string' || value.length > max) throw new Error(`${field}格式无效`)
}

function normalizeScopes(input = {}) {
  const includeTimeline = input.includeTimeline !== false
  return {
    showNickname: Boolean(input.showNickname),
    includeTimeline,
    includeReports: includeTimeline && Boolean(input.includeReports),
    includeVisits: input.includeVisits !== false,
  }
}

function validateSnapshot(snapshot, requestedScopes) {
  if (!snapshot || snapshot.version !== 1 || !snapshot.patient) throw new Error('共享快照格式不受支持')
  const scopes = normalizeScopes(requestedScopes)
  const patient = snapshot.patient
  safeText(patient.id, 100, '患者标识')
  safeText(patient.nickname || '', 50, '患者称呼')
  safeText(patient.diseaseName || '', 100, '病种名称')
  if (!scopes.showNickname && patient.nickname) throw new Error('共享范围与患者称呼不一致')
  if (!Array.isArray(snapshot.events) || !Array.isArray(snapshot.visitPlans)) throw new Error('共享快照数据不完整')
  if (!scopes.includeTimeline && snapshot.events.length) throw new Error('共享范围与病程数据不一致')
  if (!scopes.includeVisits && snapshot.visitPlans.length) throw new Error('共享范围与复诊计划不一致')
  if (snapshot.events.length > 500 || snapshot.visitPlans.length > 100) throw new Error('共享记录数量超过限制')
  for (const event of snapshot.events) {
    if (!event || !event.id) throw new Error('共享病程数据无效')
    if (!scopes.includeReports && event.report) throw new Error('共享范围与检验明细不一致')
    if (event.report && (!Array.isArray(event.report.items) || event.report.items.length > 200 || event.report.items.some(item => !item || typeof item !== 'object'))) throw new Error('共享检验明细无效')
  }
  for (const plan of snapshot.visitPlans) {
    if (!plan || !plan.id || !Array.isArray(plan.questions) || plan.questions.length > 50 || plan.questions.some(item => !item || typeof item !== 'object')) throw new Error('共享复诊计划无效')
  }
  if (byteLength(JSON.stringify(snapshot)) > MAX_SNAPSHOT_BYTES) throw new Error('共享内容超过大小限制')
  return scopes
}

function sanitizeSnapshot(snapshot, requestedScopes) {
  const scopes = validateSnapshot(snapshot, requestedScopes)
  const text = value => String(value || '')
  const sanitized = {
    version: 1,
    generatedAt: new Date().toISOString(),
    patient: {
      id: text(snapshot.patient.id), nickname: scopes.showNickname ? text(snapshot.patient.nickname) : '',
      diseaseName: text(snapshot.patient.diseaseName), diagnosisDate: text(snapshot.patient.diagnosisDate),
      stage: text(snapshot.patient.stage), department: text(snapshot.patient.department),
    },
    events: snapshot.events.map(event => ({
      id: text(event.id), date: text(event.date), type: text(event.type), title: text(event.title),
      description: text(event.description), hospital: text(event.hospital), department: text(event.department),
      report: scopes.includeReports && event.report ? {
        reviewed: Boolean(event.report.reviewed),
        items: event.report.items.map(item => ({
          name: text(item.name), result: text(item.result), unit: text(item.unit), reference: text(item.reference),
        })),
      } : null,
    })),
    visitPlans: snapshot.visitPlans.map(plan => ({
      id: text(plan.id), visitDate: text(plan.visitDate), hospital: text(plan.hospital),
      department: text(plan.department), doctor: text(plan.doctor), purpose: text(plan.purpose),
      questions: plan.questions.map(question => ({
        content: text(question.content), answered: Boolean(question.answered), note: text(question.note),
      })),
    })),
  }
  if (byteLength(JSON.stringify(sanitized)) > MAX_SNAPSHOT_BYTES) throw new Error('共享内容超过大小限制')
  return { scopes, snapshot: sanitized }
}

function normalizeInviteCode(value) {
  const code = String(value || '').toUpperCase().replace(/[^A-Z2-9]/g, '')
  if (!/^[A-HJ-NP-Z2-9]{12}$/.test(code)) throw new Error('请输入有效的 12 位邀请码')
  return code
}

module.exports = { MAX_SNAPSHOT_BYTES, normalizeScopes, validateSnapshot, sanitizeSnapshot, normalizeInviteCode }
