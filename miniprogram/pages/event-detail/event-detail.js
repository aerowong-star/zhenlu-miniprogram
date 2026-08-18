const dataService=require('../../services/data-service'); const {formatDate}=require('../../utils/date')
const labels={symptom:'症状',visit:'门诊',hospital:'住院',test:'检查',diagnosis:'确诊',medication:'用药',checkup:'复查',adverse:'不良反应',other:'其他'}
Page({
  data:{id:'',event:null,patient:null},
  onLoad(options){this.setData({id:options.id||''})},
  onShow(){const event=dataService.getEvent(this.data.id);if(!event)return;this.setData({event:{...event,displayDate:formatDate(event.date),typeLabel:labels[event.type]||'其他'},patient:dataService.getPatient(event.patientId)})},
  edit(){wx.navigateTo({url:`/pages/event-edit/event-edit?id=${this.data.id}`})},
  remove(){wx.showModal({title:'删除这条病程记录？',content:'删除后无法恢复。',confirmColor:'#b74444',success:res=>{if(!res.confirm)return;dataService.deleteEvent(this.data.id);wx.showToast({title:'已删除',icon:'success'});setTimeout(()=>wx.navigateBack(),350)}})}
})
