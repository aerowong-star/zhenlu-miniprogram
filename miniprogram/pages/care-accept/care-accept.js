const careSharingService = require('../../services/care-sharing-service')

function scopeLabel(scopes) {
  const labels = ['疾病概况']
  if (scopes.showNickname) labels.push('患者称呼')
  if (scopes.includeTimeline) labels.push('病程记录')
  if (scopes.includeReports) labels.push('检验明细')
  if (scopes.includeVisits) labels.push('复诊计划')
  return labels.join('、')
}

Page({
  data: { code: '', preview: null, consented: false, loading: false },
  codeInput(event) {
    const code = String(event.detail.value || '').toUpperCase().replace(/[^A-Z2-9-]/g, '').slice(0, 14)
    this.setData({ code, preview: null, consented: false })
  },
  consentChange(event) { this.setData({ consented: event.detail.value.includes('accepted') }) },
  normalizedCode() { return this.data.code.replace(/[^A-Z2-9]/g, '') },
  async verify() {
    if (this.data.loading) return
    const code = this.normalizedCode()
    if (code.length !== 12) return wx.showToast({ title: '请输入完整邀请码', icon: 'none' })
    this.setData({ loading: true })
    try {
      const result = await careSharingService.previewInvite(code)
      this.setData({ preview: { ...result.preview, scopeLabel: scopeLabel(result.preview.scopes) } })
    } catch (error) {
      wx.showModal({ title: '邀请码验证失败', content: error.message || '请确认邀请码后重试', showCancel: false })
    } finally {
      this.setData({ loading: false })
    }
  },
  async accept() {
    if (this.data.loading || !this.data.preview) return
    if (!this.data.consented) return wx.showToast({ title: '请先确认只读协作说明', icon: 'none' })
    this.setData({ loading: true })
    try {
      await careSharingService.acceptInvite(this.normalizedCode())
      wx.showToast({ title: '邀请已接受', icon: 'success' })
      setTimeout(() => wx.redirectTo({ url: '/pages/care-sharing/care-sharing' }), 500)
    } catch (error) {
      wx.showModal({ title: '无法接受邀请', content: error.message || '请确认邀请码后重试', showCancel: false })
    } finally {
      this.setData({ loading: false })
    }
  },
})
