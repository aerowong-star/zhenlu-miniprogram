const { bootstrap } = require('./services/data-service')

App({
  globalData: {
    activePatientId: '',
  },

  onLaunch() {
    const state = bootstrap()
    this.globalData.activePatientId = state.activePatientId || ''
  },
})
