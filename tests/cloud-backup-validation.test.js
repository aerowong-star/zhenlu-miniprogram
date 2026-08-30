const test = require('node:test')
const assert = require('node:assert/strict')
const { MAX_BACKUP_BYTES, validateBackupPayload } = require('../cloudfunctions/manageUserBackup/validation')

function validPayload() {
  return {
    schemaVersion: 4,
    exportedAt: '2026-08-30T10:00:00.000Z',
    data: {
      hasOnboarded: true, activePatientId: 'p1',
      patients: [{ id: 'p1', nickname: '测试患者' }],
      events: [{ id: 'e1', patientId: 'p1', title: '检查' }],
      visitPlans: [{ id: 'v1', patientId: 'p1', selectedEventIds: ['e1'] }],
    },
  }
}

test('cloud validation accepts a valid version 4 payload', () => {
  assert.equal(validateBackupPayload(validPayload()), true)
})

test('cloud validation rejects unsupported schema versions', () => {
  const payload = validPayload(); payload.schemaVersion = 2
  assert.throws(() => validateBackupPayload(payload), /格式不受支持/)
})

test('cloud validation rejects duplicate identifiers', () => {
  const payload = validPayload(); payload.data.events.push({ id: 'e1', patientId: 'p1' })
  assert.throws(() => validateBackupPayload(payload), /病程数据关联无效/)
})

test('cloud validation rejects cross-patient visit material references', () => {
  const payload = validPayload()
  payload.data.patients.push({ id: 'p2' })
  payload.data.events[0].patientId = 'p2'
  assert.throws(() => validateBackupPayload(payload), /复诊材料关联无效/)
})

test('cloud validation rejects payloads over the size limit', () => {
  const payload = validPayload(); payload.data.patients[0].nickname = '字'.repeat(MAX_BACKUP_BYTES)
  assert.throws(() => validateBackupPayload(payload), /大小限制/)
})
