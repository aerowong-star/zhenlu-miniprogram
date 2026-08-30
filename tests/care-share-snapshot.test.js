const test = require('node:test')
const assert = require('node:assert/strict')

global.wx = {
  _store: {},
  getStorageSync(key) { return this._store[key] },
  setStorageSync(key, value) { this._store[key] = structuredClone(value) },
}

const dataService = require('../miniprogram/services/data-service')
const { DEFAULT_SCOPES, buildShareSnapshot } = require('../miniprogram/services/care-share-snapshot')

test.beforeEach(() => { global.wx._store = {}; dataService.bootstrap() })

function createRecords() {
  const patient = dataService.savePatient({
    nickname: '真实称呼', birthYear: '2000', relationship: '本人', diseaseName: '测试病种',
    diagnosisDate: '2026-01-01', stage: '随访期', department: '遗传科',
  })
  dataService.saveEvent({
    patientId: patient.id, date: '2026-08-30', title: '检验报告', description: '检查记录',
    report: { reviewed: true, imagePath: 'cloud://must-not-share', items: [{ name: '指标 A', result: '1.2', unit: 'U/L' }] },
  })
  dataService.saveVisitPlan({ patientId: patient.id, visitDate: '2026-09-20', purpose: '复诊', questions: [{ content: '复查什么？' }] })
  return patient
}

test('default share snapshot hides direct identifiers and report details', () => {
  const patient = createRecords()
  const snapshot = buildShareSnapshot(patient.id, DEFAULT_SCOPES)
  assert.equal(snapshot.patient.nickname, '')
  assert.equal('birthYear' in snapshot.patient, false)
  assert.equal('relationship' in snapshot.patient, false)
  assert.equal(snapshot.events[0].report, null)
  assert.equal(JSON.stringify(snapshot).includes('cloud://'), false)
  assert.equal(snapshot.visitPlans.length, 1)
})

test('explicit report scope includes only reviewed text fields', () => {
  const patient = createRecords()
  const snapshot = buildShareSnapshot(patient.id, { ...DEFAULT_SCOPES, showNickname: true, includeReports: true })
  assert.equal(snapshot.patient.nickname, '真实称呼')
  assert.equal(snapshot.events[0].report.items[0].name, '指标 A')
  assert.deepEqual(Object.keys(snapshot.events[0].report.items[0]), ['name', 'result', 'unit', 'reference'])
})

test('disabled timeline and visit scopes export no matching records', () => {
  const patient = createRecords()
  const snapshot = buildShareSnapshot(patient.id, { includeTimeline: false, includeReports: true, includeVisits: false })
  assert.deepEqual(snapshot.events, [])
  assert.deepEqual(snapshot.visitPlans, [])
})
