const dataService = require('../../services/data-service')
const { formatDate } = require('../../utils/date')

Page({
  data: { patient: null, recentEvents: [], patientCount: 0 },
  onShow() { this.refresh() },
  refresh() {
    const state = dataService.getState()
    if (!state.hasOnboarded) return wx.reLaunch({ url: '/pages/welcome/welcome' })
    let patient = dataService.getActivePatient()
    if (!patient && state.patients[0]) {
      dataService.setActivePatient(state.patients[0].id); patient = state.patients[0]
    }
    const events = patient ? dataService.listEvents(patient.id).slice(0, 3).map(item => ({ ...item, displayDate: formatDate(item.date), typeLabel: typeLabel(item.type) })) : []
    this.setData({ patient, recentEvents: events, patientCount: state.patients.length })
  },
  goPatients() { wx.switchTab({ url: '/pages/patients/patients' }) },
  goTimeline() { wx.switchTab({ url: '/pages/timeline/timeline' }) },
  addEvent() {
    if (!this.data.patient) return wx.navigateTo({ url: '/pages/patient-edit/patient-edit?first=1' })
    wx.navigateTo({ url: `/pages/event-edit/event-edit?patientId=${this.data.patient.id}` })
  },
  openEvent(e) { wx.navigateTo({ url: `/pages/event-detail/event-detail?id=${e.currentTarget.dataset.id}` }) },
})

function typeLabel(type) {
  return ({ symptom:'症状', visit:'门诊', hospital:'住院', test:'检查', diagnosis:'确诊', medication:'用药', checkup:'复查', adverse:'不良反应', other:'其他' })[type] || '其他'
}
