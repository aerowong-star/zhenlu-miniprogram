const dataService = require('../../services/data-service')

const TEMPLATE_TEXTS = ['下一次需要复查哪些项目？', '现有记录中还需要重点关注哪些变化？', '日常照护中有哪些需要继续记录？', '出现哪些情况时需要及时就医？']

function withTemplateState(questions) {
  const contents = new Set(questions.map(item => String(item.content || '').trim()))
  return TEMPLATE_TEXTS.map((content, index) => ({ id: `template_${index}`, content, selected: contents.has(content) }))
}

function blankQuestion() { return { id: `question_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, content: '', answered: false, note: '' } }

Page({
  data: { plan: null, questions: [], templates: [] },
  onLoad(options) {
    const plan = dataService.getVisitPlan(options.id)
    if (!plan) return wx.showToast({ title: '复诊计划不存在', icon: 'none' })
    const questions = plan.questions.length ? plan.questions.map(item => ({ ...item })) : [blankQuestion()]
    this.setData({ plan, questions, templates: withTemplateState(questions) })
  },
  input(e) {
    const index = Number(e.currentTarget.dataset.index)
    const questions = this.data.questions.map((item, itemIndex) => itemIndex === index ? { ...item, content: e.detail.value } : item)
    this.setData({ questions, templates: withTemplateState(questions) })
  },
  addTemplate(e) {
    const content = TEMPLATE_TEXTS[Number(e.currentTarget.dataset.index)]
    if (!content || this.data.questions.some(item => String(item.content || '').trim() === content)) return wx.showToast({ title: '这个问题已经添加', icon: 'none' })
    const blankIndex = this.data.questions.findIndex(item => !String(item.content || '').trim())
    const questions = blankIndex >= 0
      ? this.data.questions.map((item, index) => index === blankIndex ? { ...item, content } : item)
      : [...this.data.questions, { ...blankQuestion(), content }]
    this.setData({ questions, templates: withTemplateState(questions) })
  },
  add() {
    if (this.data.questions.some(item => !String(item.content || '').trim())) return wx.showToast({ title: '请先填写空白问题', icon: 'none' })
    const questions = [...this.data.questions, blankQuestion()]
    this.setData({ questions, templates: withTemplateState(questions) })
  },
  remove(e) {
    const questions = this.data.questions.filter((_, index) => index !== Number(e.currentTarget.dataset.index))
    this.setData({ questions, templates: withTemplateState(questions) })
  },
  save() {
    const questions = this.data.questions.filter(item => String(item.content || '').trim())
    const plan = dataService.saveVisitPlan({ ...this.data.plan, questions })
    wx.redirectTo({ url: `/pages/visit-summary/visit-summary?id=${plan.id}` })
  },
})

module.exports = { TEMPLATE_TEXTS, withTemplateState }
