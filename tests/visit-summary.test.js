const test = require('node:test')
const assert = require('node:assert/strict')
const { buildVisitSummary, summarySourceSignature, summaryToText } = require('../miniprogram/services/visit-summary')

const patient = { id: 'p1', nickname: '小雨', birthYear: '2016', diseaseName: '示例病种', stage: '长期随访', department: '遗传科' }
const plan = {
  id: 'v1', patientId: 'p1', visitDate: '2026-09-20', hospital: '示例医院', department: '遗传科', doctor: '示例医生',
  purpose: '整理近期记录', selectedEventIds: ['e1'], questions: [{ id: 'q1', content: '下次复查什么？', note: '' }],
}
const events = [{ id: 'e1', patientId: 'p1', date: '2026-08-20', type: 'test', title: '血液检查', description: '已核对报告', hospital: '示例医院', department: '检验科' }]

test('visit summary hides direct patient identifiers by default', () => {
  const summary = buildVisitSummary(patient, plan, events)
  assert.equal(summary.patient.nickname, '患者称呼已隐藏')
  assert.equal(summary.patient.birthYear, '出生年份已隐藏')
  assert.equal(summary.events.length, 1)
})

test('privacy selections control exported fields', () => {
  const summary = buildVisitSummary(patient, plan, events, { showNickname: true, showBirthYear: true, showHospital: false })
  assert.equal(summary.patient.nickname, '小雨')
  assert.equal(summary.visit.hospital, '就诊医院已隐藏')
  assert.equal(summary.events[0].place, '')
})

test('source signature changes when selected content changes', () => {
  const first = summarySourceSignature(patient, plan, events)
  const second = summarySourceSignature(patient, { ...plan, purpose: '修改后的目的' }, events)
  assert.notEqual(first, second)
})

test('text export contains questions and safety boundary', () => {
  const text = summaryToText(buildVisitSummary(patient, plan, events))
  assert.match(text, /下次复查什么/)
  assert.match(text, /不提供诊断/)
})
