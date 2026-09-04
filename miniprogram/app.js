const { bootstrap } = require('./services/data-service')
const privacyService = require('./services/privacy-service')

const PRIVACY_ROUTES = new Set([
  'pages/privacy-consent/privacy-consent',
  'pages/privacy-policy/privacy-policy',
  'pages/user-agreement/user-agreement',
  'pages/data-management/data-management',
])

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

  onShow() {
    if (privacyService.hasValidConsent()) return
    const pages = getCurrentPages()
    if (!pages.length) return
    const route = pages.length ? pages[pages.length - 1].route : ''
    if (!PRIVACY_ROUTES.has(route)) wx.reLaunch({ url: '/pages/privacy-consent/privacy-consent' })
  },
})
