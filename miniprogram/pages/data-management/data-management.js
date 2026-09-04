const accountDataService = require('../../services/account-data-service')
const dataService = require('../../services/data-service')
const privacyService = require('../../services/privacy-service')

function confirm(options) {
  return new Promise(resolve => wx.showModal({ ...options, success: result => resolve(Boolean(result.confirm)), fail: () => resolve(false) }))
}

Page({
  data: {
    loading: false, inspected: false,
    summary: { backupCount: 0, pendingInviteCount: 0, managedShareCount: 0, receivedShareCount: 0 },
    localPatientCount: 0, localEventCount: 0, consented: false,
  },
  onShow() {
    const state = dataService.getState()
    this.setData({
      localPatientCount: state.patients.length,
      localEventCount: state.events.length,
      consented: privacyService.hasValidConsent(),
    })
  },
  openPrivacy() { wx.navigateTo({ url: '/pages/privacy-policy/privacy-policy' }) },
  openAgreement() { wx.navigateTo({ url: '/pages/user-agreement/user-agreement' }) },
  async inspectCloud() {
    if (this.data.loading) return
    this.setData({ loading: true })
    try {
      const result = await accountDataService.inspect()
      this.setData({ inspected: true, summary: result.summary })
    } catch (error) {
      wx.showModal({ title: '无法查询云端数据', content: error.message, showCancel: false })
    } finally { this.setData({ loading: false }) }
  },
  async deleteCloud() {
    if (this.data.loading) return
    const first = await confirm({
      title: '删除全部云端数据？',
      content: '将删除个人云备份、尚未接受的邀请码、你管理或接受的所有共享授权。此操作无法撤销，本地档案不会被删除。',
      confirmText: '继续', confirmColor: '#b74444',
    })
    if (!first) return
    const final = await confirm({
      title: '最后确认', content: '删除后无法从云端恢复，也会立即中断所有照护者共享。确定继续吗？',
      confirmText: '彻底删除', confirmColor: '#b74444',
    })
    if (!final) return
    this.setData({ loading: true })
    try {
      await accountDataService.deleteAll()
      dataService.markCloudBackupDeleted()
      this.setData({ inspected: true, summary: { backupCount: 0, pendingInviteCount: 0, managedShareCount: 0, receivedShareCount: 0 } })
      wx.showToast({ title: '云端数据已删除', icon: 'success' })
    } catch (error) {
      wx.showModal({ title: '删除未完成', content: error.message, showCancel: false })
    } finally { this.setData({ loading: false }) }
  },
  async deleteLocal() {
    const approved = await confirm({
      title: '清除全部本地业务数据？',
      content: '当前设备上的患者档案、病程和复诊计划都会删除。云端数据和隐私同意记录不受影响。',
      confirmText: '确认清除', confirmColor: '#b74444',
    })
    if (!approved) return
    dataService.resetAll()
    getApp().globalData.activePatientId = ''
    this.onShow()
    wx.showToast({ title: '本地数据已清除', icon: 'success' })
  },
  async revokeConsent() {
    const approved = await confirm({
      title: '撤回隐私同意？',
      content: '撤回后将返回隐私说明页，无法继续使用业务功能。已有本地和云端数据不会自动删除，可在本页先分别删除。',
      confirmText: '确认撤回', confirmColor: '#b74444',
    })
    if (!approved) return
    privacyService.revoke()
    wx.reLaunch({ url: '/pages/privacy-consent/privacy-consent' })
  },
})
