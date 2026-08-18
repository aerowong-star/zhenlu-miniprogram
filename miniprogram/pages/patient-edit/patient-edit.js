const dataService = require('../../services/data-service')
const { today } = require('../../utils/date')

Page({
  data: {
    id: '', first: false, form: { nickname:'', birthYear:'', relationship:'', diseaseName:'', diagnosisDate:'', stage:'', department:'' },
    relationshipOptions: ['本人','家长','配偶','子女','其他照护者'], relationshipIndex: -1,
    stageOptions: ['等待进一步检查','已确诊，治疗方案评估中','治疗初期','长期随访','病情变化评估中'], stageIndex: -1,
    maxDate: today(), isDemo: false,
  },
  onLoad(options) {
    const id = options.id || ''; const record = id ? dataService.getPatient(id) : null
    if (record) {
      this.setData({ id, form: { ...this.data.form, ...record }, relationshipIndex: this.data.relationshipOptions.indexOf(record.relationship), stageIndex: this.data.stageOptions.indexOf(record.stage), isDemo: record.isDemo })
    }
    this.setData({ first: options.first === '1' })
  },
  fieldInput(e) { this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value }) },
  relationshipChange(e) { const i=Number(e.detail.value); this.setData({ relationshipIndex:i, 'form.relationship':this.data.relationshipOptions[i] }) },
  stageChange(e) { const i=Number(e.detail.value); this.setData({ stageIndex:i, 'form.stage':this.data.stageOptions[i] }) },
  dateChange(e) { this.setData({ 'form.diagnosisDate': e.detail.value }) },
  save() {
    try {
      const saved = dataService.savePatient({ ...this.data.form, id: this.data.id })
      getApp().globalData.activePatientId = saved.id
      wx.showToast({ title:'已保存', icon:'success' })
      setTimeout(() => this.data.first ? wx.switchTab({ url:'/pages/home/home' }) : wx.navigateBack(), 350)
    } catch (error) { wx.showToast({ title:error.message, icon:'none' }) }
  },
  remove() {
    if (!this.data.id) return
    wx.showModal({ title:'删除患者档案？', content:'该档案下的全部病程事件也会被删除，此操作无法撤销。', confirmColor:'#b74444', success:res => {
      if (!res.confirm) return
      dataService.deletePatient(this.data.id); getApp().globalData.activePatientId=dataService.getState().activePatientId
      wx.showToast({ title:'已删除', icon:'success' }); setTimeout(()=>wx.navigateBack(),350)
    }})
  },
})
