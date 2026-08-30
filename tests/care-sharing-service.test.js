const test = require('node:test')
const assert = require('node:assert/strict')

const calls = []
global.wx = {
  cloud: {
    async callFunction(input) {
      calls.push(input)
      return { result: { ok: true, data: {} } }
    },
  },
}
const service = require('../miniprogram/services/care-sharing-service')
test.beforeEach(() => { calls.length = 0 })

test('care sharing calls never send a user identity', async () => {
  await service.acceptInvite('ABCDEFGHJK23')
  assert.deepEqual(calls[0], { name: 'manageCareSharing', data: { action: 'acceptInvite', code: 'ABCDEFGHJK23' } })
  assert.equal('openid' in calls[0].data, false)
})

test('revocation identifies only the grant and requested action', async () => {
  await service.revokeGrant('grant1')
  assert.deepEqual(calls[0].data, { action: 'revokeGrant', grantId: 'grant1' })
})

test('invitation preview sends only the one-time code', async () => {
  await service.previewInvite('ABCDEFGHJK23')
  assert.deepEqual(calls[0].data, { action: 'previewInvite', code: 'ABCDEFGHJK23' })
})
