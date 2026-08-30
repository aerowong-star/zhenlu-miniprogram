const dataService = require('./data-service')

const DEFAULT_SCOPES = {
  showNickname: false,
  includeTimeline: true,
  includeReports: false,
  includeVisits: true,
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

function cleanPatient(patient, scopes) {
  return {
    id: patient.id,
    nickname: scopes.showNickname ? patient.nickname : '',
    diseaseName: patient.diseaseName || '',
    diagnosisDate: patient.diagnosisDate || '',
    stage: patient.stage || '',
    department: patient.department || '',
  }
}

function cleanEvent(event, scopes) {
  return {
    id: event.id,
    date: event.date || '',
    type: event.type || 'other',
    title: event.title || '',
    description: event.description || '',
    hospital: event.hospital || '',
    department: event.department || '',
    report: scopes.includeReports && event.report ? {
      reviewed: Boolean(event.report.reviewed),
      items: Array.isArray(event.report.items) ? event.report.items.slice(0, 200).map(item => ({
        name: String(item.name || ''), result: String(item.result || ''), unit: String(item.unit || ''),
        reference: String(item.reference || ''),
      })) : [],
    } : null,
  }
}

function cleanVisitPlan(plan) {
  return {
    id: plan.id,
    visitDate: plan.visitDate || '',
    hospital: plan.hospital || '',
    department: plan.department || '',
    doctor: plan.doctor || '',
    purpose: plan.purpose || '',
    questions: Array.isArray(plan.questions) ? plan.questions.slice(0, 50).map(question => ({
      content: String(question.content || ''), answered: Boolean(question.answered), note: String(question.note || ''),
    })) : [],
  }
}

function buildShareSnapshot(patientId, requestedScopes = DEFAULT_SCOPES) {
  const patient = dataService.getPatient(patientId)
  if (!patient) throw new Error('请选择有效的患者档案')
  const scopes = normalizeScopes(requestedScopes)
  const events = scopes.includeTimeline
    ? dataService.listEvents(patientId).slice(0, 500).map(event => cleanEvent(event, scopes))
    : []
  const visitPlans = scopes.includeVisits
    ? dataService.listVisitPlans(patientId).slice(0, 100).map(cleanVisitPlan)
    : []
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    patient: cleanPatient(patient, scopes),
    events,
    visitPlans,
  }
}

module.exports = { DEFAULT_SCOPES, normalizeScopes, buildShareSnapshot }
