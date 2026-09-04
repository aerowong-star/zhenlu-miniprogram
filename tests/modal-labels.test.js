const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')

function javascriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name)
    return entry.isDirectory() ? javascriptFiles(target) : entry.name.endsWith('.js') ? [target] : []
  })
}

test('modal button labels stay within the WeChat four-character limit', () => {
  const root = path.join(__dirname, '..', 'miniprogram')
  const invalid = []
  const pattern = /(?:confirmText|cancelText)\s*:\s*['"]([^'"]+)['"]/g
  for (const file of javascriptFiles(root)) {
    const source = fs.readFileSync(file, 'utf8')
    for (const match of source.matchAll(pattern)) {
      if ([...match[1]].length > 4) invalid.push(`${path.relative(root, file)}: ${match[1]}`)
    }
  }
  assert.deepEqual(invalid, [])
})
