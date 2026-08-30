const dataService = require('../../services/data-service')
const cloudBackupService = require('../../services/cloud-backup-service')

function formatTime(value) {
  if (!value) return '暂无'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '时间未知'
  const pad = number => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function confirm(options) {
  return new Promise(resolve => wx.showModal({ ...options, success: result => resolve(Boolean(result.confirm)), fail: () => resolve(false) }))
}

Page({
  data: {
    patientCount: 0, eventCount: 0, reportCount: 0, visitCount: 0, activeName: '未选择',
    cloudLoading: false, cloudChecked: false, cloudExists: false,
    cloudStatusLabel: '尚未检查', cloudUpdatedLabel: '暂无', localBackupLabel: '暂无',
  },

  onShow() { this.refreshLocal() },

  refreshLocal() {
    const state = dataService.getState()
    const active = dataService.getActivePatient()
    this.setData({
      patientCount: state.patients.length,
      eventCount: state.events.length,
      reportCount: state.events.filter(item => item.report).length,
      visitCount: state.visitPlans.length,
      activeName: active ? active.nickname : '未选择',
      localBackupLabel: formatTime(state.sync && state.sync.lastBackupAt),
    })
  },

  setCloudStatus(status) {
    this.setData({
      cloudChecked: true,
      cloudExists: Boolean(status.exists),
      cloudStatusLabel: status.exists ? '已有云端备份' : '暂无云端备份',
      cloudUpdatedLabel: formatTime(status.updatedAt),
    })
  },

  showCloudError(error) {
    wx.showModal({ title: '云备份未完成', content: error.message || '服务暂时不可用，请稍后重试', showCancel: false })
  },

  async checkBackup() {
    if (this.data.cloudLoading) return
    this.setData({ cloudLoading: true })
    try {
      this.setCloudStatus(await cloudBackupService.getStatus())
    } catch (error) {
      this.showCloudError(error)
    } finally {
      this.setData({ cloudLoading: false })
    }
  },

  async backup() {
    if (this.data.cloudLoading) return
    const approved = await confirm({
      title: this.data.cloudExists ? '覆盖云端备份？' : '创建个人云备份？',
      content: '将上传患者档案、病程文字、OCR 核对结果和复诊计划。不会上传报告原图，也不会包含任何服务密钥。',
      confirmText: this.data.cloudExists ? '覆盖备份' : '开始备份',
    })
    if (!approved) return
    this.setData({ cloudLoading: true })
    try {
      const payload = dataService.exportBackupPayload()
      const result = await cloudBackupService.uploadBackup(payload)
      dataService.markCloudBackup(result.updatedAt)
      this.setCloudStatus({ exists: true, updatedAt: result.updatedAt })
      this.refreshLocal()
      wx.showToast({ title: '备份已完成', icon: 'success' })
    } catch (error) {
      this.showCloudError(error)
    } finally {
      this.setData({ cloudLoading: false })
    }
  },

  async restore() {
    if (this.data.cloudLoading) return
    if (!this.data.cloudChecked) return wx.showToast({ title: '请先检查云备份', icon: 'none' })
    if (!this.data.cloudExists) return wx.showToast({ title: '暂无可恢复的备份', icon: 'none' })
    const approved = await confirm({
      title: '用云备份覆盖本机数据？',
      content: '恢复后，本机现有的患者档案、病程和复诊计划将被云端备份替换。此操作无法撤销。',
      confirmText: '确认恢复', confirmColor: '#b74444',
    })
    if (!approved) return
    this.setData({ cloudLoading: true })
    try {
      const result = await cloudBackupService.downloadBackup()
      const state = dataService.restoreBackupPayload(result.payload, result.updatedAt)
      getApp().globalData.activePatientId = state.activePatientId
      wx.showToast({ title: '恢复已完成', icon: 'success' })
      setTimeout(() => wx.reLaunch({ url: '/pages/home/home' }), 500)
    } catch (error) {
      this.showCloudError(error)
    } finally {
      this.setData({ cloudLoading: false })
    }
  },

  async deleteCloudBackup() {
    if (this.data.cloudLoading || !this.data.cloudExists) return
    const approved = await confirm({
      title: '删除云端备份？',
      content: '只删除云端副本，不会清除当前设备上的数据。删除后无法从云端恢复。',
      confirmText: '删除备份', confirmColor: '#b74444',
    })
    if (!approved) return
    this.setData({ cloudLoading: true })
    try {
      await cloudBackupService.deleteBackup()
      dataService.markCloudBackupDeleted()
      this.setCloudStatus({ exists: false })
      wx.showToast({ title: '云备份已删除', icon: 'success' })
    } catch (error) {
      this.showCloudError(error)
    } finally {
      this.setData({ cloudLoading: false })
    }
  },

  loadDemo() {
    wx.showModal({
      title: '重新载入示例？', content: '现有的示例档案、病程和复诊计划会被替换，你创建的其他数据不受影响。',
      success: result => {
        if (!result.confirm) return
        const state = dataService.loadDemo()
        getApp().globalData.activePatientId = state.activePatientId
        this.refreshLocal()
        wx.showToast({ title: '示例已载入', icon: 'success' })
      },
    })
  },

  reset() {
    wx.showModal({
      title: '清除全部本地数据？',
      content: '患者档案、病程事件和复诊计划都会从当前设备删除，且无法恢复。云端备份不会被删除。',
      confirmText: '全部清除', confirmColor: '#b74444',
      success: result => {
        if (!result.confirm) return
        dataService.resetAll()
        getApp().globalData.activePatientId = ''
        wx.showToast({ title: '已清除', icon: 'success' })
        setTimeout(() => wx.reLaunch({ url: '/pages/welcome/welcome' }), 400)
      },
    })
  },
})
