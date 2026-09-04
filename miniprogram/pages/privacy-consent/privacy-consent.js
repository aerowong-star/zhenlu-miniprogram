const dataService = require('../../services/data-service')
const privacyService = require('../../services/privacy-service')

Page({
  data: { agreed: false, policyVersion: privacyService.CURRENT_VERSION },
  onLoad() {
    if (privacyService.hasValidConsent()) this.continueToApp()
  },
  agreementChange(event) { this.setData({ agreed: event.detail.value.includes('accepted') }) },
  openPrivacy() { wx.navigateTo({ url: '/pages/privacy-policy/privacy-policy' }) },
  openAgreement() { wx.navigateTo({ url: '/pages/user-agreement/user-agreement' }) },
  openDataManagement() { wx.navigateTo({ url: '/pages/data-management/data-management' }) },
  accept() {
    if (!this.data.agreed) return wx.showToast({ title: '请先阅读并勾选同意', icon: 'none' })
    privacyService.accept()
    this.continueToApp()
  },
  continueToApp() {
    const state = dataService.getState()
    wx.reLaunch({ url: state.hasOnboarded && state.patients.length ? '/pages/home/home' : '/pages/welcome/welcome' })
  },
  decline() {
    const showManualClose = () => wx.showModal({
      title: '未同意隐私政策',
      content: '你仍可查看政策和管理已有数据。如需离开，请点击右上角关闭小程序。',
      showCancel: false,
      confirmText: '知道了',
    })
    wx.showModal({
      title: '暂不同意',
      content: '不同意时无法进入病程整理功能，但仍可查看政策或删除已有数据。',
      cancelText: '继续阅读',
      confirmText: '退出',
      success: result => {
        if (!result.confirm) return
        if (!wx.exitMiniProgram) return showManualClose()
        wx.exitMiniProgram({ fail: showManualClose })
      },
      fail: () => wx.showToast({ title: '操作未完成，请重试', icon: 'none' }),
    })
  },
})
