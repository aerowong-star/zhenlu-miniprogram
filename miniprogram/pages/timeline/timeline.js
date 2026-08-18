const dataService = require('../../services/data-service')
const { formatDate } = require('../../utils/date')

const TYPE_LABELS = { symptom:'症状', visit:'门诊', hospital:'住院', test:'检查', diagnosis:'确诊', medication:'用药', checkup:'复查', adverse:'不良反应', other:'其他' }

Page({
  data: { patient:null, events:[], allEvents:[], filters:[{key:'all',label:'全部'},{key:'visit',label:'就诊'},{key:'test',label:'检查'},{key:'medication',label:'用药'},{key:'symptom',label:'症状'},{key:'other',label:'其他'}], activeFilter:'all' },
  onShow(){ this.refresh() },
  refresh(){
    const patient=dataService.getActivePatient()
    const allEvents=patient ? dataService.listEvents(patient.id).map(item=>({ ...item, displayDate:formatDate(item.date), typeLabel:TYPE_LABELS[item.type]||'其他', group:filterGroup(item.type) })) : []
    this.setData({ patient, allEvents },()=>this.applyFilter())
  },
  filter(e){ this.setData({ activeFilter:e.currentTarget.dataset.key },()=>this.applyFilter()) },
  applyFilter(){ const key=this.data.activeFilter; this.setData({ events:key==='all'?this.data.allEvents:this.data.allEvents.filter(item=>item.group===key) }) },
  add(){ if(!this.data.patient)return wx.switchTab({url:'/pages/patients/patients'}); wx.navigateTo({url:`/pages/event-edit/event-edit?patientId=${this.data.patient.id}`}) },
  open(e){ wx.navigateTo({url:`/pages/event-detail/event-detail?id=${e.currentTarget.dataset.id}`}) },
  goPatients(){ wx.switchTab({url:'/pages/patients/patients'}) },
})
function filterGroup(type){ if(['visit','hospital','diagnosis','checkup'].includes(type))return'visit'; if(type==='test')return'test'; if(type==='medication')return'medication'; if(type==='symptom')return'symptom'; return'other' }
