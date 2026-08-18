const dataService = require('../../services/data-service')
const { today } = require('../../utils/date')

Page({
  data:{
    id:'', patient:null, form:{patientId:'',date:today(),type:'visit',title:'',description:'',hospital:'',department:''},
    types:[{key:'symptom',label:'症状'},{key:'visit',label:'门诊'},{key:'hospital',label:'住院'},{key:'test',label:'检查'},{key:'diagnosis',label:'确诊'},{key:'medication',label:'用药'},{key:'checkup',label:'复查'},{key:'adverse',label:'不良反应'},{key:'other',label:'其他'}], maxDate:today()
  },
  onLoad(options){
    const record=options.id?dataService.getEvent(options.id):null
    const patientId=record?record.patientId:(options.patientId||dataService.getState().activePatientId)
    const patient=dataService.getPatient(patientId)
    if(!patient){ wx.showToast({title:'患者档案不存在',icon:'none'}); return setTimeout(()=>wx.navigateBack(),500) }
    this.setData({id:options.id||'',patient,form:record?{...this.data.form,...record}:{...this.data.form,patientId}})
  },
  chooseType(e){this.setData({'form.type':e.currentTarget.dataset.key})},
  fieldInput(e){this.setData({[`form.${e.currentTarget.dataset.field}`]:e.detail.value})},
  dateChange(e){this.setData({'form.date':e.detail.value})},
  save(){
    try{dataService.saveEvent({...this.data.form,id:this.data.id});wx.showToast({title:'已保存',icon:'success'});setTimeout(()=>wx.navigateBack(),350)}
    catch(error){wx.showToast({title:error.message,icon:'none'})}
  }
})
