const test = require('node:test')
const assert = require('node:assert/strict')

const calls = []
global.wx = {
  cloud: {
    async callFunction(input) {
      calls.push(input)
      return { result: { ok: true, data: { exists: false } } }
    },
  },
}

const service = require('../miniprogram/services/cloud-backup-service')
test.beforeEach(() => { calls.length = 0 })

test('client requests backup status without sending an identity', async () => {
  const result = await service.getStatus()
  assert.equal(result.exists, false)
  assert.deepEqual(calls[0], { name: 'manageUserBackup', data: { action: 'status' } })
})

test('client uploads only the backup payload', async () => {
  const payload = { schemaVersion: 4, data: { patients: [], events: [], visitPlans: [] } }
  await service.uploadBackup(payload)
  assert.deepEqual(calls[0].data, { action: 'upload', payload })
  assert.equal('openid' in calls[0].data, false)
})
