const test = require('node:test')
const assert = require('node:assert/strict')

global.Page = () => {}
const { TEMPLATE_TEXTS, withTemplateState } = require('../miniprogram/pages/visit-questions/visit-questions')

test('question templates are suggestions instead of prefilled input values', () => {
  const templates = withTemplateState([{ id: 'blank', content: '' }])
  assert.equal(templates.length, TEMPLATE_TEXTS.length)
  assert.ok(templates.every(item => item.selected === false))
})

test('a template is marked selected only after its text is added', () => {
  const templates = withTemplateState([{ id: 'q1', content: TEMPLATE_TEXTS[0] }])
  assert.equal(templates[0].selected, true)
  assert.ok(templates.slice(1).every(item => item.selected === false))
})
