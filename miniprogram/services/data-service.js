const { demoPatient, demoEvents, DEMO_PATIENT_ID } = require('./demo-service')
const { compareDateDesc } = require('../utils/date')

const STORAGE_KEY = 'zhenlu_phase1_state_v1'
const LEGACY_STORAGE_KEY = 'hanlu_phase1_state_v1'
const SCHEMA_VERSION = 1

function emptyState() {
  return { version: SCHEMA_VERSION, hasOnboarded: false, activePatientId: '', patients: [], events: [] }
}

function getStorage() {
  try {
    return wx.getStorageSync(STORAGE_KEY) || wx.getStorageSync(LEGACY_STORAGE_KEY) || null
  } catch (error) {
    console.warn('读取本地数据失败', error)
    return null
  }
}

function setStorage(state) {
  wx.setStorageSync(STORAGE_KEY, state)
  return state
}

function normalize(raw) {
  if (!raw || raw.version !== SCHEMA_VERSION) return emptyState()
  return {
    version: SCHEMA_VERSION,
    hasOnboarded: Boolean(raw.hasOnboarded),
    activePatientId: raw.activePatientId || '',
    patients: Array.isArray(raw.patients) ? raw.patients : [],
    events: Array.isArray(raw.events) ? raw.events : [],
  }
}

function bootstrap() {
  const state = normalize(getStorage())
  setStorage(state)
  return state
}

function getState() { return normalize(getStorage()) }

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function completeOnboarding() {
  const state = getState(); state.hasOnboarded = true; return setStorage(state)
}

function loadDemo() {
  const state = getState()
  state.patients = state.patients.filter(item => !item.isDemo)
  state.events = state.events.filter(item => !item.isDemo)
  state.patients.unshift(demoPatient())
  state.events.push(...demoEvents())
  state.activePatientId = DEMO_PATIENT_ID
  state.hasOnboarded = true
  return setStorage(state)
}

function listPatients() { return getState().patients.slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')) }
function getPatient(id) { return getState().patients.find(item => item.id === id) || null }

function savePatient(input) {
  const state = getState(); const now = new Date().toISOString()
  const index = input.id ? state.patients.findIndex(item => item.id === input.id) : -1
  if (input.id && index < 0) throw new Error('患者档案不存在')
  const record = {
    id: input.id || uid('patient'), nickname: String(input.nickname || '').trim(),
    birthYear: String(input.birthYear || '').trim(), relationship: String(input.relationship || '').trim(),
    diseaseName: String(input.diseaseName || '').trim(), diagnosisDate: input.diagnosisDate || '',
    stage: String(input.stage || '').trim(), department: String(input.department || '').trim(),
    isDemo: index >= 0 ? Boolean(state.patients[index].isDemo) : false,
    createdAt: index >= 0 ? state.patients[index].createdAt : now, updatedAt: now,
  }
  if (!record.nickname || !record.diseaseName) throw new Error('患者称呼和病种不能为空')
  if (index >= 0) state.patients.splice(index, 1, record); else state.patients.push(record)
  if (!state.activePatientId || index < 0) state.activePatientId = record.id
  state.hasOnboarded = true; setStorage(state); return record
}

function deletePatient(id) {
  const state = getState(); state.patients = state.patients.filter(item => item.id !== id)
  state.events = state.events.filter(item => item.patientId !== id)
  if (state.activePatientId === id) state.activePatientId = state.patients[0] ? state.patients[0].id : ''
  return setStorage(state)
}

function setActivePatient(id) {
  const state = getState()
  if (!state.patients.some(item => item.id === id)) throw new Error('患者档案不存在')
  state.activePatientId = id; setStorage(state); return id
}

function getActivePatient() { const state = getState(); return state.patients.find(item => item.id === state.activePatientId) || null }
function listEvents(patientId) { return getState().events.filter(item => item.patientId === patientId).sort(compareDateDesc) }
function getEvent(id) { return getState().events.find(item => item.id === id) || null }

function saveEvent(input) {
  const state = getState(); const now = new Date().toISOString()
  if (!state.patients.some(item => item.id === input.patientId)) throw new Error('请先选择有效的患者档案')
  const index = input.id ? state.events.findIndex(item => item.id === input.id) : -1
  if (input.id && index < 0) throw new Error('病程事件不存在')
  const record = {
    id: input.id || uid('event'), patientId: input.patientId, date: input.date || '',
    type: input.type || 'other', title: String(input.title || '').trim(),
    description: String(input.description || '').trim(), hospital: String(input.hospital || '').trim(),
    department: String(input.department || '').trim(), isDemo: index >= 0 ? Boolean(state.events[index].isDemo) : false,
    createdAt: index >= 0 ? state.events[index].createdAt : now, updatedAt: now,
  }
  if (!record.date || !record.title) throw new Error('事件日期和标题不能为空')
  if (index >= 0) state.events.splice(index, 1, record); else state.events.push(record)
  setStorage(state); return record
}

function deleteEvent(id) { const state = getState(); state.events = state.events.filter(item => item.id !== id); return setStorage(state) }
function resetAll() { return setStorage(emptyState()) }

module.exports = {
  STORAGE_KEY, SCHEMA_VERSION, bootstrap, getState, completeOnboarding, loadDemo,
  listPatients, getPatient, savePatient, deletePatient, setActivePatient, getActivePatient,
  listEvents, getEvent, saveEvent, deleteEvent, resetAll,
}
