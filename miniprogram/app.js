const { bootstrap } = require('./services/data-service')

App({
  globalData: {
    activePatientId: '',
  },

  onLaunch() {
    if (wx.cloud) {
      try { wx.cloud.init({ traceUser: true }) } catch (error) { console.warn('微信云开发初始化失败，演示识别仍可使用', error) }
    }
    const state = bootstrap()
    this.globalData.activePatientId = state.activePatientId || ''
  },
})
