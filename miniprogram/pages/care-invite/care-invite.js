const dataService = require('../../services/data-service')
const careSharingService = require('../../services/care-sharing-service')
const { DEFAULT_SCOPES, buildShareSnapshot } = require('../../services/care-share-snapshot')

Page({
  data: {
    patients: [], patientIndex: 0, caregiverLabel: '', scopes: { ...DEFAULT_SCOPES },
    expiryOptions: ['24 小时', '3 天', '7 天'], expiryValues: [24, 72, 168], expiryIndex: 1,
    loading: false, inviteCode: '', expiresLabel: '',
  },
  onLoad() {
    const patients = dataService.listPatients()
    const activeId = dataService.getState().activePatientId
    const patientIndex = Math.max(0, patients.findIndex(item => item.id === activeId))
    this.setData({ patients, patientIndex })
  },
  patientChange(event) { this.setData({ patientIndex: Number(event.detail.value) }) },
  expiryChange(event) { this.setData({ expiryIndex: Number(event.detail.value) }) },
  labelInput(event) { this.setData({ caregiverLabel: event.detail.value }) },
  scopeChange(event) {
    const field = event.currentTarget.dataset.field
    const update = { [`scopes.${field}`]: event.detail.value }
    if (field === 'includeTimeline' && !event.detail.value) update['scopes.includeReports'] = false
    this.setData(update)
  },
  async submit() {
    if (this.data.loading || !this.data.patients.length) return
    const patient = this.data.patients[this.data.patientIndex]
    const labels = ['疾病概况']
    if (this.data.scopes.showNickname) labels.push('患者称呼')
    if (this.data.scopes.includeTimeline) labels.push('病程记录')
    if (this.data.scopes.includeReports) labels.push('检验明细')
    if (this.data.scopes.includeVisits) labels.push('复诊计划')
    const confirmed = await new Promise(resolve => wx.showModal({
      title: '确认创建邀请码？',
      content: `将向“${this.data.caregiverLabel.trim() || '照护者'}”共享：${labels.join('、')}。接受授权后，对方可持续查看，直到你撤销。`,
      confirmText: '创建邀请码', success: result => resolve(Boolean(result.confirm)), fail: () => resolve(false),
    }))
    if (!confirmed) return
    this.setData({ loading: true })
    try {
      const snapshot = buildShareSnapshot(patient.id, this.data.scopes)
      const result = await careSharingService.createInvite(
        snapshot, this.data.scopes, this.data.caregiverLabel,
        this.data.expiryValues[this.data.expiryIndex],
      )
      this.setData({ inviteCode: result.code, expiresLabel: new Date(result.expiresAt).toLocaleString() })
    } catch (error) {
      wx.showModal({ title: '邀请码创建失败', content: error.message || '请稍后重试', showCancel: false })
    } finally {
      this.setData({ loading: false })
    }
  },
  copyCode() {
    wx.setClipboardData({ data: this.data.inviteCode, success: () => wx.showToast({ title: '邀请码已复制', icon: 'success' }) })
  },
})
