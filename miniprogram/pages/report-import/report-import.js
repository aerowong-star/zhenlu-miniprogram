const dataService = require('../../services/data-service')
const ocrService = require('../../services/ocr-service')
const { today } = require('../../utils/date')

const MAX_RAW_IMAGE_BYTES = 2.5 * 1024 * 1024

function safeDate(value) {
  const match = String(value || '').match(/(20\d{2})[年./-](\d{1,2})[月./-](\d{1,2})/)
  if (!match) return today()
  return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
}

Page({
  data: {
    patient: null, imagePath: '', consented: false, recognizing: false,
    reviewed: false, result: null, maxDate: today(),
  },

  onLoad(options) {
    const patient = dataService.getPatient(options.patientId || dataService.getState().activePatientId)
    if (!patient) {
      wx.showToast({ title: '患者档案不存在', icon: 'none' })
      return setTimeout(() => wx.navigateBack(), 500)
    }
    this.setData({ patient })
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1, mediaType: ['image'], sourceType: ['album', 'camera'], sizeType: ['compressed'],
      success: response => {
        const file = response.tempFiles && response.tempFiles[0]
        if (!file) return
        if (file.size > MAX_RAW_IMAGE_BYTES) return wx.showToast({ title: '图片仍过大，请裁剪后重试', icon: 'none' })
        this.setData({ imagePath: file.tempFilePath, result: null, reviewed: false })
      },
    })
  },

  consentChange(e) { this.setData({ consented: e.detail.value.includes('upload') }) },
  reviewChange(e) { this.setData({ reviewed: e.detail.value.includes('reviewed') }) },

  async recognize() {
    if (!this.data.imagePath) return wx.showToast({ title: '请先选择报告图片', icon: 'none' })
    if (!this.data.consented) return wx.showToast({ title: '请先确认上传授权', icon: 'none' })
    this.setData({ recognizing: true, reviewed: false })
    try { this.applyResult(await ocrService.recognizeImage(this.data.imagePath)) }
    catch (error) { wx.showModal({ title: '识别未完成', content: error.message || '请稍后重试，也可以使用演示识别查看流程。', showCancel: false }) }
    finally { this.setData({ recognizing: false }) }
  },

  async recognizeDemo() {
    this.setData({ recognizing: true, reviewed: false })
    try { this.applyResult(await ocrService.recognizeDemo()) }
    finally { this.setData({ recognizing: false }) }
  },

  applyResult(result) {
    this.setData({ result: {
      ...result, reportTitle: result.reportTitle || '检验报告', reportDate: safeDate(result.reportDate),
      hospital: result.hospital || '', department: result.department || '', summary: result.summary || '',
      items: (result.items || []).map((item, index) => ({ ...item, _key: `ocr_${Date.now()}_${index}` })),
    } })
    wx.showToast({ title: '请逐项核对', icon: 'none' })
  },

  fieldInput(e) { this.setData({ [`result.${e.currentTarget.dataset.field}`]: e.detail.value, reviewed: false }) },
  dateChange(e) { this.setData({ 'result.reportDate': e.detail.value, reviewed: false }) },
  itemInput(e) { this.setData({ [`result.items[${e.currentTarget.dataset.index}].${e.currentTarget.dataset.field}`]: e.detail.value, reviewed: false }) },
  addItem() {
    this.setData({ 'result.items': [...this.data.result.items, { _key: `manual_${Date.now()}`, name: '', code: '', result: '', unit: '', reference: '', hint: '' }], reviewed: false })
  },
  removeItem(e) {
    this.setData({ 'result.items': this.data.result.items.filter((_, index) => index !== Number(e.currentTarget.dataset.index)), reviewed: false })
  },

  save() {
    const result = this.data.result
    if (!result || !result.reportTitle.trim()) return wx.showToast({ title: '请填写报告名称', icon: 'none' })
    if (!this.data.reviewed) return wx.showToast({ title: '请确认已核对原报告', icon: 'none' })
    const items = result.items.map(item => ({
      name: String(item.name || '').trim(), code: String(item.code || '').trim(), result: String(item.result || '').trim(),
      unit: String(item.unit || '').trim(), reference: String(item.reference || '').trim(), hint: String(item.hint || '').trim(),
    })).filter(item => item.name || item.result)
    const flagged = items.filter(item => item.hint).length
    dataService.saveEvent({
      patientId: this.data.patient.id, date: result.reportDate, type: 'test', title: result.reportTitle.trim(),
      description: result.summary.trim() || `已核对 ${items.length} 项检验结果${flagged ? `，其中 ${flagged} 项带有报告原始提示` : ''}。`,
      hospital: result.hospital.trim(), department: result.department.trim(),
      source: result.isDemo ? 'ocr-demo' : 'baidu-medical-ocr',
      report: {
        provider: result.provider, providerLogId: result.providerLogId, reviewed: true,
        reviewedAt: new Date().toISOString(), isDemo: Boolean(result.isDemo), items,
      },
    })
    wx.showToast({ title: '已保存到时间线', icon: 'success' })
    setTimeout(() => wx.switchTab({ url: '/pages/timeline/timeline' }), 450)
  },
})
