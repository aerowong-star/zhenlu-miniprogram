const dataService = require('../../services/data-service')
const careSharingService = require('../../services/care-sharing-service')
const { buildShareSnapshot } = require('../../services/care-share-snapshot')

function formatTime(value) {
  if (!value) return '暂无'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '时间未知'
  const pad = number => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
function scopeLabel(scopes) {
  const labels = ['疾病概况']
  if (scopes.includeTimeline) labels.push('病程')
  if (scopes.includeReports) labels.push('检验明细')
  if (scopes.includeVisits) labels.push('复诊计划')
  return labels.join('、')
}
function decorate(item) {
  return {
    ...item,
    patientLabel: item.snapshot.patient.nickname || '患者称呼已隐藏',
    diseaseName: item.snapshot.patient.diseaseName || '病种待补充',
    scopeLabel: scopeLabel(item.scopes),
    updatedLabel: formatTime(item.updatedAt),
    statusLabel: item.status === 'active' ? '共享中' : '已撤销',
  }
}

Page({
  data: { loading: false, pending: [], owned: [], received: [], errorMessage: '' },
  onShow() { this.refresh() },
  async refresh() {
    if (this.data.loading) return
    this.setData({ loading: true, errorMessage: '' })
    try {
      const result = await careSharingService.listShares()
      this.setData({
        pending: (result.pending || []).map(item => ({ ...item, scopeLabel: scopeLabel(item.scopes), expiresLabel: formatTime(item.expiresAt) })),
        owned: (result.owned || []).map(decorate), received: (result.received || []).map(decorate),
      })
    } catch (error) {
      this.setData({ errorMessage: error.message || '加载失败' })
    } finally {
      this.setData({ loading: false })
    }
  },
  createInvite() { wx.navigateTo({ url: '/pages/care-invite/care-invite' }) },
  acceptInvite() { wx.navigateTo({ url: '/pages/care-accept/care-accept' }) },
  openGrant(event) { wx.navigateTo({ url: `/pages/care-shared-detail/care-shared-detail?id=${event.currentTarget.dataset.id}` }) },
  refreshGrant(event) {
    const grant = this.data.owned.find(item => item.id === event.currentTarget.dataset.id)
    if (!grant || grant.status !== 'active') return
    const patient = dataService.getPatient(grant.snapshot.patient.id)
    if (!patient) return wx.showToast({ title: '本机已没有对应档案', icon: 'none' })
    wx.showModal({
      title: '更新共享内容？',
      content: '将按原有共享范围，用本机最新内容覆盖照护者看到的只读快照。',
      confirmText: '确认更新',
      success: async result => {
        if (!result.confirm) return
        this.setData({ loading: true })
        try {
          const snapshot = buildShareSnapshot(patient.id, grant.scopes)
          await careSharingService.refreshGrant(grant.id, snapshot, grant.scopes)
          wx.showToast({ title: '共享内容已更新', icon: 'success' })
          this.setData({ loading: false })
          await this.refresh()
        } catch (error) {
          wx.showModal({ title: '更新未完成', content: error.message || '请稍后重试', showCancel: false })
        } finally {
          this.setData({ loading: false })
        }
      },
    })
  },
  revoke(event) {
    const id = event.currentTarget.dataset.id
    wx.showModal({
      title: '撤销照护者访问？',
      content: '撤销后，对方将无法再查看这份共享内容。如需重新共享，必须创建新的邀请码。',
      confirmText: '确认撤销', confirmColor: '#b74444',
      success: async result => {
        if (!result.confirm) return
        this.setData({ loading: true })
        try {
          await careSharingService.revokeGrant(id)
          wx.showToast({ title: '授权已撤销', icon: 'success' })
          this.setData({ loading: false })
          await this.refresh()
        } catch (error) {
          wx.showModal({ title: '撤销未完成', content: error.message || '请稍后重试', showCancel: false })
        } finally {
          this.setData({ loading: false })
        }
      },
    })
  },
  cancelInvite(event) {
    const id = event.currentTarget.dataset.id
    wx.showModal({
      title: '取消这个邀请码？', content: '取消后，即使对方已经收到邀请码也无法再接受。',
      confirmText: '确认取消', confirmColor: '#b74444',
      success: async result => {
        if (!result.confirm) return
        this.setData({ loading: true })
        try {
          await careSharingService.cancelInvite(id)
          this.setData({ loading: false })
          await this.refresh()
        } catch (error) {
          wx.showModal({ title: '取消未完成', content: error.message || '请稍后重试', showCancel: false })
        } finally { this.setData({ loading: false }) }
      },
    })
  },
  leaveGrant(event) {
    const id = event.currentTarget.dataset.id
    wx.showModal({
      title: '退出这份共享？', content: '退出后你将无法继续查看；如需恢复，必须请管理者创建新的邀请码。',
      confirmText: '确认退出', confirmColor: '#b74444',
      success: async result => {
        if (!result.confirm) return
        this.setData({ loading: true })
        try {
          await careSharingService.leaveGrant(id)
          this.setData({ loading: false })
          await this.refresh()
        } catch (error) {
          wx.showModal({ title: '退出未完成', content: error.message || '请稍后重试', showCancel: false })
        } finally { this.setData({ loading: false }) }
      },
    })
  },
})
