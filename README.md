# 诊路微信小程序（第二阶段）

“诊路”是面向罕见病患者和照护者的复诊准备与病程整理助手。本版本在第一阶段的患者档案和时间线基础上，加入“医疗检验报告 OCR + 人工核对 + 保存到病程”的完整流程。

## 已实现

- 患者档案的新建、编辑、切换和删除
- 病程事件的新建、编辑、查看、筛选和删除
- 拍摄或选择检验报告图片
- 上传前在设备端自动缩放和压缩过大的报告图片
- 百度医疗检验报告单 OCR 的微信云函数适配
- 无需网络和凭证的虚构演示识别
- 报告基本信息及逐项检验结果的人工校对
- 核对后的报告保存为检查类病程事件
- 第一阶段数据自动迁移到模型 v2
- 本地数据清除和示例数据重置

## 明确不做

- 不解释指标，不判断正常或异常
- 不提供诊断、病情判断、治疗或用药建议
- 不在小程序端存放百度或微信服务端密钥
- 不长期保存报告图片
- 本阶段不做登录、跨设备同步、家庭共享和指标趋势

## 本地运行

1. 打开微信开发者工具，选择“导入项目”。
2. 选择包含 `project.config.json` 的仓库根目录。
3. 未配置正式 AppID 和云开发时，可直接使用演示识别审核完整流程。
4. 真实 OCR 需要正式小程序、微信云开发环境和已开通的百度医疗 OCR 服务，详见 [百度 OCR 配置](docs/BAIDU_OCR_SETUP.md)。

仓库中的 `project.config.json` 固定使用 `touristappid`。正式 AppID 仅配置在被 Git 忽略的 `project.private.config.json` 或微信开发者工具本机设置中。

## 主要目录

```text
miniprogram/
├─ pages/report-import/        报告选择、识别和人工校对
├─ pages/event-detail/         病程及检验项目详情
├─ services/ocr-service.js     微信云开发调用与临时文件清理
├─ services/ocr-normalizer.js  百度返回结果标准化
└─ services/data-service.js    本地数据、迁移和病程写入
cloudfunctions/
└─ recognizeMedicalReport/     百度医疗 OCR 服务端代理
docs/
├─ PHASE2_REVIEW.md            第二阶段验收清单
├─ BAIDU_OCR_SETUP.md          真实服务部署说明
└─ DATA_MODEL.md               数据模型
```

## 自动检查

```powershell
npm.cmd test
npm.cmd run check
```

测试不会访问微信、百度或任何网络服务。

## 审核建议

先按照 [第二阶段审核说明](docs/PHASE2_REVIEW.md) 使用虚构演示识别验收产品流程。真实 OCR 部署应在该流程审核通过后进行，并优先使用脱敏测试报告。
