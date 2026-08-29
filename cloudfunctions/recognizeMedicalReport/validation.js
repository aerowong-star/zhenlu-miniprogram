function isTemporaryOcrFile(fileID) {
  if (typeof fileID !== 'string') return false
  const match = fileID.match(/^cloud:\/\/[^/]+\/ocr-temp\/([^/]+)$/)
  return Boolean(match && match[1] !== '.' && match[1] !== '..')
}

module.exports = { isTemporaryOcrFile }
