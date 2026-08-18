const dataService = require('../../services/data-service')

Page({
  data: { patients: [], activePatientId: '' },
  onShow() {
    const state = dataService.getState()
    this.setData({ patients: dataService.listPatients().map(item => ({ ...item, initial: (item.nickname || '?').charAt(0) })), activePatientId: state.activePatientId })
  },
  addPatient() { wx.navigateTo({ url: '/pages/patient-edit/patient-edit' }) },
  editPatient(e) { wx.navigateTo({ url: `/pages/patient-edit/patient-edit?id=${e.currentTarget.dataset.id}` }) },
  selectPatient(e) {
    const id = e.currentTarget.dataset.id
    dataService.setActivePatient(id); getApp().globalData.activePatientId = id
    this.setData({ activePatientId: id }); wx.showToast({ title: '已切换档案', icon: 'success' })
  },
})
