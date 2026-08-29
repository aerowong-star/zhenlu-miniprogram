const { normalizeMedicalReport } = require('./ocr-normalizer')

const CLOUD_FUNCTION_NAME = 'recognizeMedicalReport'

function demoResponse() {
  return {
    log_id: 'demo-only',
    words_result: {
      CommonData: [
        { word_name: '医院', word: '示例市中心医院（虚构）' },
        { word_name: '报告单名称', word: '血常规检验报告（示例）' },
        { word_name: '科室', word: '遗传代谢科' },
        { word_name: '时间', word: '2026-08-18' },
      ],
      Item: [
        [{ word_name: '项目名称', word: '示例指标 A' }, { word_name: '结果', word: '12.3' }, { word_name: '单位', word: '示例单位' }, { word_name: '参考区间', word: '10.0–15.0' }, { word_name: '结果提示', word: '' }],
        [{ word_name: '项目名称', word: '示例指标 B' }, { word_name: '结果', word: '7.8' }, { word_name: '单位', word: '示例单位' }, { word_name: '参考区间', word: '4.0–7.0' }, { word_name: '结果提示', word: '↑' }],
      ],
    },
  }
}

function recognizeDemo() {
  return Promise.resolve({ ...normalizeMedicalReport(demoResponse()), provider: 'demo', isDemo: true })
}

async function recognizeImage(imagePath) {
  if (!imagePath) throw new Error('请先选择报告图片')
  if (!wx.cloud || !wx.cloud.uploadFile || !wx.cloud.callFunction) throw new Error('当前环境未启用微信云开发')
  const extension = (imagePath.match(/\.(jpe?g|png|bmp)$/i) || [])[1] || 'jpg'
  const cloudPath = `ocr-temp/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${extension}`
  let fileID = ''
  try {
    const uploaded = await wx.cloud.uploadFile({ cloudPath, filePath: imagePath })
    fileID = uploaded.fileID
    const response = await wx.cloud.callFunction({ name: CLOUD_FUNCTION_NAME, data: { fileID } })
    const payload = response && response.result
    if (!payload || payload.ok === false) throw new Error((payload && payload.message) || 'OCR 识别失败')
    return { ...normalizeMedicalReport(payload.data || payload), provider: 'baidu-medical-ocr', isDemo: false }
  } finally {
    if (fileID && wx.cloud.deleteFile) wx.cloud.deleteFile({ fileList: [fileID] }).catch(() => {})
  }
}

module.exports = { recognizeDemo, recognizeImage }
