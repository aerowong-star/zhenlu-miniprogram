const TYPE_LABELS = { symptom:'症状', visit:'门诊', hospital:'住院', test:'检查', diagnosis:'确诊', medication:'用药', checkup:'复查', adverse:'不良反应', other:'其他' }

const DEFAULT_PRIVACY = { showNickname: false, showBirthYear: false, showHospital: true }

function normalizedPrivacy(options = {}) {
  return { ...DEFAULT_PRIVACY, ...options }
}

function buildVisitSummary(patient, plan, events, privacyOptions) {
  if (!patient || !plan) throw new Error('患者档案或复诊计划不存在')
  const privacy = normalizedPrivacy(privacyOptions)
  const selected = (events || []).filter(event => plan.selectedEventIds.includes(event.id))
  return {
    title: '复诊准备摘要',
    patient: {
      nickname: privacy.showNickname ? patient.nickname : '患者称呼已隐藏',
      birthYear: privacy.showBirthYear ? patient.birthYear : '出生年份已隐藏',
      diseaseName: patient.diseaseName || '待补充', stage: patient.stage || '待补充',
      department: patient.department || '待补充',
    },
    visit: {
      date: plan.visitDate, hospital: privacy.showHospital ? (plan.hospital || '待补充') : '就诊医院已隐藏',
      department: plan.department || '待补充', doctor: plan.doctor || '', purpose: plan.purpose,
    },
    events: selected.map(event => ({
      id: event.id, date: event.date, typeLabel: TYPE_LABELS[event.type] || '其他', title: event.title,
      description: event.description || '',
      place: privacy.showHospital ? [event.hospital, event.department].filter(Boolean).join(' · ') : '',
    })),
    questions: (plan.questions || []).map(question => ({ id: question.id, content: question.content, note: question.note || '' })),
    privacy,
    disclaimer: '本摘要仅整理用户确认的信息，不提供诊断、指标解释、治疗或用药建议。',
  }
}

function summarySourceSignature(patient, plan, events, privacyOptions) {
  const summary = buildVisitSummary(patient, plan, events, privacyOptions)
  const source = JSON.stringify(summary)
  let hash = 2166136261
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `v1-${(hash >>> 0).toString(16)}`
}

function summaryToText(summary) {
  const lines = [
    summary.title,
    '',
    `患者：${summary.patient.nickname}`,
    `出生年份：${summary.patient.birthYear}`,
    `相关疾病：${summary.patient.diseaseName}`,
    `当前阶段：${summary.patient.stage}`,
    `主要科室：${summary.patient.department}`,
    '',
    `复诊日期：${summary.visit.date}`,
    `医院：${summary.visit.hospital}`,
    `科室：${summary.visit.department}`,
  ]
  if (summary.visit.doctor) lines.push(`医生：${summary.visit.doctor}`)
  lines.push(`本次目的：${summary.visit.purpose}`, '', '相关病程：')
  if (summary.events.length) summary.events.forEach(item => lines.push(`- ${item.date}｜${item.typeLabel}｜${item.title}${item.description ? `：${item.description}` : ''}${item.place ? `（${item.place}）` : ''}`))
  else lines.push('- 暂未选择病程材料')
  lines.push('', '准备咨询的问题：')
  if (summary.questions.length) summary.questions.forEach((item, index) => lines.push(`${index + 1}. ${item.content}${item.note ? `（记录：${item.note}）` : ''}`))
  else lines.push('- 暂未添加问题')
  lines.push('', summary.disclaimer)
  return lines.join('\n')
}

module.exports = { DEFAULT_PRIVACY, buildVisitSummary, summarySourceSignature, summaryToText }
