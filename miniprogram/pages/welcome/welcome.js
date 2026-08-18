const dataService = require('../../services/data-service')

Page({
  data: { agreed: false },
  onLoad() {
    const state = dataService.getState()
    if (state.hasOnboarded && state.patients.length) wx.switchTab({ url: '/pages/home/home' })
  },
  toggleAgreement() { this.setData({ agreed: !this.data.agreed }) },
  startDemo() {
    if (!this.data.agreed) return wx.showToast({ title: '请先确认体验说明', icon: 'none' })
    dataService.loadDemo()
    getApp().globalData.activePatientId = dataService.getState().activePatientId
    wx.switchTab({ url: '/pages/home/home' })
  },
  createProfile() {
    if (!this.data.agreed) return wx.showToast({ title: '请先确认体验说明', icon: 'none' })
    dataService.completeOnboarding()
    wx.navigateTo({ url: '/pages/patient-edit/patient-edit?first=1' })
  },
})
