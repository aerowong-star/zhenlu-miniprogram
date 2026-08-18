const test = require('node:test')
const assert = require('node:assert/strict')

global.wx = {
  _store: {},
  getStorageSync(key) { return this._store[key] },
  setStorageSync(key, value) { this._store[key] = structuredClone(value) },
}

const service = require('../miniprogram/services/data-service')

test.beforeEach(() => { global.wx._store = {} })

test('bootstrap creates an empty versioned state', () => {
  const state = service.bootstrap()
  assert.equal(state.version, 2)
  assert.equal(state.patients.length, 0)
})

test('demo creates one patient and three linked events', () => {
  service.bootstrap(); const state = service.loadDemo()
  assert.equal(state.patients.length, 1)
  assert.equal(state.events.length, 3)
  assert.ok(state.events.every(event => event.patientId === state.activePatientId))
})

test('patient and event CRUD keeps relationships intact', () => {
  service.bootstrap()
  const patient = service.savePatient({ nickname:'测试患者', diseaseName:'测试病种', relationship:'本人' })
  const event = service.saveEvent({ patientId:patient.id, date:'2026-08-13', title:'首次记录', type:'visit' })
  assert.equal(service.listEvents(patient.id)[0].id, event.id)
  service.saveEvent({ ...event, title:'修改后的记录' })
  assert.equal(service.getEvent(event.id).title, '修改后的记录')
  service.deletePatient(patient.id)
  assert.equal(service.getPatient(patient.id), null)
  assert.equal(service.getEvent(event.id), null)
})

test('events are sorted newest first', () => {
  service.bootstrap()
  const patient = service.savePatient({ nickname:'测试患者', diseaseName:'测试病种' })
  service.saveEvent({ patientId:patient.id, date:'2025-01-01', title:'旧记录' })
  service.saveEvent({ patientId:patient.id, date:'2026-01-01', title:'新记录' })
  assert.deepEqual(service.listEvents(patient.id).map(item=>item.title), ['新记录','旧记录'])
})

test('required fields are validated', () => {
  service.bootstrap()
  assert.throws(() => service.savePatient({ nickname:'缺少病种' }))
  assert.throws(() => service.saveEvent({ patientId:'missing', date:'2026-01-01', title:'无效事件' }))
})

test('editing demo data preserves its demo marker', () => {
  service.bootstrap(); service.loadDemo()
  const patient = service.getActivePatient()
  service.savePatient({ ...patient, nickname:'修改后的示例' })
  const event = service.listEvents(patient.id)[0]
  service.saveEvent({ ...event, title:'修改后的示例事件' })
  assert.equal(service.getPatient(patient.id).isDemo, true)
  assert.equal(service.getEvent(event.id).isDemo, true)
})

test('phase 1 local data migrates to schema version 2', () => {
  global.wx._store.zhenlu_phase1_state_v1 = {
    version: 1, hasOnboarded: true, activePatientId: 'p1',
    patients: [{ id: 'p1', nickname: '旧档案', diseaseName: '测试病种' }],
    events: [{ id: 'e1', patientId: 'p1', date: '2026-01-01', title: '旧事件' }],
  }
  const state = service.bootstrap()
  assert.equal(state.version, 2)
  assert.equal(state.patients[0].nickname, '旧档案')
  assert.equal(state.events[0].report, null)
})

test('OCR report details are stored with their timeline event', () => {
  service.bootstrap()
  const patient = service.savePatient({ nickname: '测试患者', diseaseName: '测试病种' })
  const event = service.saveEvent({
    patientId: patient.id, date: '2026-08-18', type: 'test', title: '检验报告', source: 'baidu-medical-ocr',
    report: { reviewed: true, items: [{ name: '指标 A', result: '12.3', unit: 'U/L' }] },
  })
  assert.equal(service.getEvent(event.id).source, 'baidu-medical-ocr')
  assert.equal(service.getEvent(event.id).report.items[0].name, '指标 A')
})
