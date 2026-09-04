const test = require('node:test')
const assert = require('node:assert/strict')

const calls = []
global.wx = {
  cloud: {
    async callFunction(input) {
      calls.push(input)
      return { result: { ok: true, data: { summary: {} } } }
    },
  },
}
const service = require('../miniprogram/services/account-data-service')
test.beforeEach(() => { calls.length = 0 })

test('cloud data inspection does not accept or send a user identity', async () => {
  await service.inspect()
  assert.deepEqual(calls[0], { name: 'manageMyCloudData', data: { action: 'inspect' } })
})

test('cloud data deletion sends only the explicit deletion action', async () => {
  await service.deleteAll()
  assert.deepEqual(calls[0].data, { action: 'deleteAll' })
})
