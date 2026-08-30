const careSharingService = require('../../services/care-sharing-service')
const { formatDate } = require('../../utils/date')

Page({
  data: { loading: true, grant: null, patient: null, events: [], visitPlans: [], errorMessage: '' },
  onLoad(options) { this.grantId = options.id || ''; this.loadGrant() },
  async loadGrant() {
    try {
      const result = await careSharingService.getGrant(this.grantId)
      const grant = result.grant
      this.setData({
        grant,
        patient: grant.snapshot.patient,
        events: grant.snapshot.events.map(event => ({ ...event, displayDate: formatDate(event.date) })),
        visitPlans: grant.snapshot.visitPlans.map(plan => ({ ...plan, displayDate: formatDate(plan.visitDate) })),
      })
    } catch (error) {
      this.setData({ errorMessage: error.message || '共享内容加载失败' })
    } finally {
      this.setData({ loading: false })
    }
  },
})
