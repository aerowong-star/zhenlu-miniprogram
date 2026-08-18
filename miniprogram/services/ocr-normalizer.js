const FIELD_NAMES = {
  hospital: ['医院', '医院名称'],
  reportTitle: ['报告单名称', '报告名称'],
  department: ['科室'],
  reportDate: ['时间', '报告时间', '报告日期'],
  summary: ['检查结果', '临床诊断'],
}

const ITEM_NAMES = {
  name: ['项目名称'],
  code: ['项目代号'],
  result: ['结果'],
  unit: ['单位'],
  reference: ['参考区间'],
  hint: ['结果提示'],
}

function rowsToMap(rows) {
  return (Array.isArray(rows) ? rows : []).reduce((result, field) => {
    if (field && field.word_name) result[field.word_name] = String(field.word || '').trim()
    return result
  }, {})
}

function pick(map, names) {
  const key = names.find(name => map[name])
  return key ? map[key] : ''
}

function normalizeMedicalReport(response) {
  if (!response || response.error_code) {
    const message = response && (response.error_msg || response.message)
    throw new Error(message || 'OCR 服务未返回有效结果')
  }
  const words = response.words_result || response.result || {}
  const common = rowsToMap(words.CommonData || words.commonData)
  const itemRows = words.Item || words.items || []
  const fields = Object.keys(FIELD_NAMES).reduce((result, key) => {
    result[key] = pick(common, FIELD_NAMES[key])
    return result
  }, {})
  const items = itemRows.map(rowsToMap).map(row => Object.keys(ITEM_NAMES).reduce((result, key) => {
    result[key] = pick(row, ITEM_NAMES[key])
    return result
  }, {})).filter(item => item.name || item.result)
  return { ...fields, items, providerLogId: String(response.log_id || '') }
}

module.exports = { normalizeMedicalReport }
