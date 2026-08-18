function pad(value) {
  return String(value).padStart(2, '0')
}

function today() {
  const date = new Date()
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

function formatDate(value) {
  if (!isValidDate(value)) return value || '日期待补充'
  const [year, month, day] = value.split('-')
  return `${year}年${Number(month)}月${Number(day)}日`
}

function compareDateDesc(a, b) {
  if (a.date === b.date) return (b.updatedAt || '').localeCompare(a.updatedAt || '')
  return (b.date || '').localeCompare(a.date || '')
}

module.exports = { today, isValidDate, formatDate, compareDateDesc }
