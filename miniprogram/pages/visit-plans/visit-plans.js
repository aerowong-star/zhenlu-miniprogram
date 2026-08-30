const dataService = require('../../services/data-service')
const { formatDate } = require('../../utils/date')

Page({
  data: { patient: null, plans: [] },
  onLoad(options) { this.patientId = options.patientId || '' },
  onShow() { this.refresh() },
  refresh() {
    const patient = dataService.getPatient(this.patientId || dataService.getState().activePatientId)
    if (!patient) return wx.showToast({ title: '患者档案不存在', icon: 'none' })
    const plans = dataService.listVisitPlans(patient.id).map(plan => ({
      ...plan, displayDate: formatDate(plan.visitDate), statusLabel: plan.status === 'ready' ? '摘要已确认' : '准备中',
      materialCount: plan.selectedEventIds.length, questionCount: plan.questions.length,
    }))
    this.setData({ patient, plans })
  },
  add() { wx.navigateTo({ url: `/pages/visit-edit/visit-edit?patientId=${this.data.patient.id}` }) },
  open(e) { wx.navigateTo({ url: `/pages/visit-summary/visit-summary?id=${e.currentTarget.dataset.id}` }) },
  edit(e) { wx.navigateTo({ url: `/pages/visit-edit/visit-edit?id=${e.currentTarget.dataset.id}` }) },
  remove(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({ title: '删除复诊计划？', content: '已选择的材料和问题清单将一起删除，原病程记录不会受影响。', success: result => {
      if (!result.confirm) return
      dataService.deleteVisitPlan(id); this.refresh(); wx.showToast({ title: '已删除', icon: 'success' })
    } })
  },
})
