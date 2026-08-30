const dataService = require('../../services/data-service')
const { DEFAULT_PRIVACY, buildVisitSummary, summarySourceSignature, summaryToText } = require('../../services/visit-summary')

Page({
  data: { plan: null, patient: null, summary: null, privacy: { ...DEFAULT_PRIVACY }, confirmed: false },
  onLoad(options) { this.planId = options.id || '' },
  onShow() { this.refresh() },
  refresh() {
    const plan = dataService.getVisitPlan(this.planId)
    if (!plan) return wx.showToast({ title: '复诊计划不存在', icon: 'none' })
    const patient = dataService.getPatient(plan.patientId)
    const privacy = plan.privacyOptions || this.data.privacy || { ...DEFAULT_PRIVACY }
    this.render(patient, plan, privacy)
  },
  render(patient, plan, privacy) {
    const events = dataService.listEvents(plan.patientId)
    const summary = buildVisitSummary(patient, plan, events, privacy)
    const signature = summarySourceSignature(patient, plan, events, privacy)
    this.currentSignature = signature
    this.currentText = summaryToText(summary)
    this.setData({ patient, plan, privacy, summary, confirmed: Boolean(plan.summarySnapshot && plan.sourceSignature === signature) })
  },
  privacyChange(e) {
    const values = e.detail.value
    const privacy = { showNickname: values.includes('nickname'), showBirthYear: values.includes('birthYear'), showHospital: values.includes('hospital') }
    this.render(this.data.patient, this.data.plan, privacy)
  },
  confirm() {
    try {
      const plan = dataService.confirmVisitSummary(this.data.plan.id, this.data.summary, this.currentSignature, this.data.privacy)
      this.setData({ plan, confirmed: true })
      wx.showToast({ title: '摘要已确认', icon: 'success' })
    } catch (error) { wx.showToast({ title: error.message, icon: 'none' }) }
  },
  copy() {
    if (!this.data.confirmed) return wx.showToast({ title: '请先确认摘要', icon: 'none' })
    wx.setClipboardData({ data: this.currentText, success: () => wx.showToast({ title: '摘要已复制', icon: 'success' }) })
  },
  editPlan() { wx.navigateTo({ url: `/pages/visit-edit/visit-edit?id=${this.data.plan.id}` }) },
  editMaterials() { wx.navigateTo({ url: `/pages/visit-materials/visit-materials?id=${this.data.plan.id}` }) },
  editQuestions() { wx.navigateTo({ url: `/pages/visit-questions/visit-questions?id=${this.data.plan.id}` }) },
})
