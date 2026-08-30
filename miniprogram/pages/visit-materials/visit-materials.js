const dataService = require('../../services/data-service')
const { formatDate } = require('../../utils/date')

const TYPE_LABELS = { symptom:'症状', visit:'门诊', hospital:'住院', test:'检查', diagnosis:'确诊', medication:'用药', checkup:'复查', adverse:'不良反应', other:'其他' }

Page({
  data: { plan: null, patient: null, events: [], selectedIds: [] },
  onLoad(options) {
    const plan = dataService.getVisitPlan(options.id)
    if (!plan) return wx.showToast({ title: '复诊计划不存在', icon: 'none' })
    const patient = dataService.getPatient(plan.patientId)
    const selectedIds = plan.selectedEventIds.slice()
    const events = dataService.listEvents(plan.patientId).map(event => ({ ...event, displayDate: formatDate(event.date), typeLabel: TYPE_LABELS[event.type] || '其他', selected: selectedIds.includes(event.id) }))
    this.setData({ plan, patient, events, selectedIds })
  },
  selectionChange(e) {
    const selectedIds = e.detail.value
    this.setData({ selectedIds, events: this.data.events.map(item => ({ ...item, selected: selectedIds.includes(item.id) })) })
  },
  save() {
    const plan = dataService.saveVisitPlan({ ...this.data.plan, selectedEventIds: this.data.selectedIds })
    wx.redirectTo({ url: `/pages/visit-questions/visit-questions?id=${plan.id}` })
  },
})
