const dataService = require('../../services/data-service')
const { today } = require('../../utils/date')

Page({
  data: { id: '', patient: null, form: { patientId: '', visitDate: today(), hospital: '', department: '', doctor: '', purpose: '', selectedEventIds: [], questions: [] } },
  onLoad(options) {
    const plan = options.id ? dataService.getVisitPlan(options.id) : null
    const patientId = plan ? plan.patientId : (options.patientId || dataService.getState().activePatientId)
    const patient = dataService.getPatient(patientId)
    if (!patient) return wx.showToast({ title: '患者档案不存在', icon: 'none' })
    this.setData({ id: options.id || '', patient, form: plan ? { ...this.data.form, ...plan } : { ...this.data.form, patientId, department: patient.department || '' } })
  },
  fieldInput(e) { this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value }) },
  dateChange(e) { this.setData({ 'form.visitDate': e.detail.value }) },
  save() {
    try {
      const plan = dataService.saveVisitPlan({ ...this.data.form, id: this.data.id })
      wx.redirectTo({ url: `/pages/visit-materials/visit-materials?id=${plan.id}` })
    } catch (error) { wx.showToast({ title: error.message, icon: 'none' }) }
  },
})
