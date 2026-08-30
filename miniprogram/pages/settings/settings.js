const dataService=require('../../services/data-service')
Page({
  data:{patientCount:0,eventCount:0,reportCount:0,visitCount:0,activeName:'未选择'},
  onShow(){const state=dataService.getState();const active=dataService.getActivePatient();this.setData({patientCount:state.patients.length,eventCount:state.events.length,reportCount:state.events.filter(item=>item.report).length,visitCount:state.visitPlans.length,activeName:active?active.nickname:'未选择'})},
  loadDemo(){wx.showModal({title:'重新载入示例？',content:'现有的示例档案、病程和复诊计划会被替换，你创建的其他数据不受影响。',success:res=>{if(!res.confirm)return;const state=dataService.loadDemo();getApp().globalData.activePatientId=state.activePatientId;this.onShow();wx.showToast({title:'示例已载入',icon:'success'})}})},
  reset(){wx.showModal({title:'清除全部本地数据？',content:'患者档案、病程事件和复诊计划都会从当前设备删除，且无法恢复。',confirmText:'全部清除',confirmColor:'#b74444',success:res=>{if(!res.confirm)return;dataService.resetAll();getApp().globalData.activePatientId='';wx.showToast({title:'已清除',icon:'success'});setTimeout(()=>wx.reLaunch({url:'/pages/welcome/welcome'}),400)}})}
})
