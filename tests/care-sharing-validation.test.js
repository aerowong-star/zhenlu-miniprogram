const test = require('node:test')
const assert = require('node:assert/strict')
const { normalizeInviteCode, sanitizeSnapshot, validateSnapshot } = require('../cloudfunctions/manageCareSharing/validation')

function snapshot() {
  return {
    version: 1,
    generatedAt: '2026-08-30T10:00:00.000Z',
    patient: { id: 'p1', nickname: '', diseaseName: '测试病种' },
    events: [{ id: 'e1', title: '检查', report: null }],
    visitPlans: [{ id: 'v1', questions: [] }],
  }
}

test('normalizes grouped invitation codes', () => {
  assert.equal(normalizeInviteCode('abcd-efgh-jk23'), 'ABCDEFGHJK23')
})

test('rejects invitation codes with ambiguous or incomplete characters', () => {
  assert.throws(() => normalizeInviteCode('ABCD-EFGH-IJ23'), /有效的 12 位邀请码/)
  assert.throws(() => normalizeInviteCode('ABCD-EFGH-JK2'), /有效的 12 位邀请码/)
})

test('validates a minimal read-only share snapshot', () => {
  assert.deepEqual(validateSnapshot(snapshot(), { includeTimeline: true, includeVisits: true }), {
    showNickname: false, includeTimeline: true, includeReports: false, includeVisits: true,
  })
})

test('rejects nickname or report data outside the declared scope', () => {
  const withName = snapshot(); withName.patient.nickname = '不应出现'
  assert.throws(() => validateSnapshot(withName, { showNickname: false }), /患者称呼不一致/)
  const withReport = snapshot(); withReport.events[0].report = { items: [] }
  assert.throws(() => validateSnapshot(withReport, { includeReports: false }), /检验明细不一致/)
})

test('server sanitizer strips undeclared fields and image references', () => {
  const input = snapshot()
  input.patient.birthYear = '2000'
  input.events[0].imagePath = 'cloud://private/report.jpg'
  const result = sanitizeSnapshot(input, { includeTimeline: true, includeVisits: true })
  assert.equal('birthYear' in result.snapshot.patient, false)
  assert.equal('imagePath' in result.snapshot.events[0], false)
  assert.equal(JSON.stringify(result.snapshot).includes('cloud://'), false)
})
