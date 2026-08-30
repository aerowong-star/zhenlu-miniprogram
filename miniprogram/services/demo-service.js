const DEMO_PATIENT_ID = 'patient_demo_xiaoyu'

function demoPatient() {
  return {
    id: DEMO_PATIENT_ID,
    nickname: '小雨（示例）',
    birthYear: '2016',
    relationship: '家长',
    diseaseName: '苯丙酮尿症（PKU）',
    diagnosisDate: '2016-10-18',
    stage: '长期随访',
    department: '遗传代谢科',
    isDemo: true,
    createdAt: '2026-08-01T09:00:00.000Z',
    updatedAt: '2026-08-01T09:00:00.000Z',
  }
}

function demoEvents() {
  return [
    {
      id: 'event_demo_1', patientId: DEMO_PATIENT_ID, date: '2016-10-18',
      type: 'diagnosis', title: '完成确诊', description: '新生儿筛查后进一步检查，确诊为苯丙酮尿症。',
      hospital: '示例妇幼保健院', department: '遗传代谢科', isDemo: true,
      createdAt: '2026-08-01T09:10:00.000Z', updatedAt: '2026-08-01T09:10:00.000Z',
    },
    {
      id: 'event_demo_2', patientId: DEMO_PATIENT_ID, date: '2026-03-12',
      type: 'checkup', title: '门诊复查', description: '完成常规随访检查，继续按医嘱记录饮食和复查情况。',
      hospital: '示例儿童医院', department: '遗传代谢科', isDemo: true,
      createdAt: '2026-08-01T09:20:00.000Z', updatedAt: '2026-08-01T09:20:00.000Z',
    },
    {
      id: 'event_demo_3', patientId: DEMO_PATIENT_ID, date: '2026-07-18',
      type: 'test', title: '完成血液检查', description: '示例记录：报告已由家长核对并归入病程。',
      hospital: '示例儿童医院', department: '检验科', isDemo: true,
      createdAt: '2026-08-01T09:30:00.000Z', updatedAt: '2026-08-01T09:30:00.000Z',
    },
  ]
}

function demoVisitPlans() {
  return [{
    id: 'visit_demo_1', patientId: DEMO_PATIENT_ID, visitDate: '2026-09-15',
    hospital: '示例儿童医院', department: '遗传代谢科', doctor: '',
    purpose: '整理近期检查结果，与医生确认下一阶段复查安排。',
    selectedEventIds: ['event_demo_2', 'event_demo_3'],
    questions: [
      { id: 'question_demo_1', content: '下一次需要复查哪些项目？', answered: false, note: '' },
      { id: 'question_demo_2', content: '日常记录中还需要重点关注什么？', answered: false, note: '' },
    ],
    status: 'draft', privacyOptions: null, summarySnapshot: null,
    sourceSignature: '', confirmedAt: '', isDemo: true,
    createdAt: '2026-08-20T09:00:00.000Z', updatedAt: '2026-08-20T09:00:00.000Z',
  }]
}

module.exports = { DEMO_PATIENT_ID, demoPatient, demoEvents, demoVisitPlans }
