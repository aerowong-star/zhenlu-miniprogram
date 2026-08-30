# 诊路微信小程序（第四阶段）

“诊路”是面向罕见病患者和照护者的复诊准备与病程整理助手。本版本在复诊准备闭环上增加由用户主动操作、按微信身份隔离的个人云备份、恢复和删除能力。

## 已实现

- 患者档案的新建、编辑、切换和删除
- 病程事件的新建、编辑、查看、筛选和删除
- 拍摄或选择检验报告图片
- 上传前在设备端自动缩放和压缩过大的报告图片
- 百度医疗检验报告单 OCR 的微信云函数适配
- 无需网络和凭证的虚构演示识别
- 报告基本信息及逐项检验结果的人工校对
- 核对后的报告保存为检查类病程事件
- 复诊计划的新建、编辑和删除
- 从病程时间线选择本次复诊材料
- 可编辑的复诊问题清单与安全模板
- 默认隐藏患者称呼和出生年份的复诊摘要
- 摘要确认快照、变更失效和文字复制
- 个人云备份状态检查、创建或覆盖、恢复和彻底删除
- 云函数从微信上下文确认身份，客户端不能指定备份所有者
- 第一至三阶段数据自动迁移到模型 v4
- 本地数据清除和示例数据重置

## 明确不做

- 不解释指标，不判断正常或异常
- 不提供诊断、病情判断、治疗或用药建议
- 不在小程序端存放百度或微信服务端密钥
- 不长期保存报告图片
- 不做自动同步、照护者共享、公开分享和指标趋势

## 本地运行

1. 打开微信开发者工具，选择“导入项目”。
2. 选择包含 `project.config.json` 的仓库根目录。
3. 未配置正式 AppID 和云开发时，可直接使用演示识别审核完整流程。
4. 真实 OCR 需要正式小程序、微信云开发环境和已开通的百度医疗 OCR 服务，详见 [百度 OCR 配置](docs/BAIDU_OCR_SETUP.md)。
5. 个人云备份需要部署 `manageUserBackup` 云函数并创建数据库集合，详见 [云备份配置](docs/CLOUD_BACKUP_SETUP.md)。

仓库中的 `project.config.json` 固定使用 `touristappid`。正式 AppID 仅配置在被 Git 忽略的 `project.private.config.json` 或微信开发者工具本机设置中。

## 主要目录

```text
miniprogram/
├─ pages/report-import/        报告选择、识别和人工校对
├─ pages/visit-*/              复诊计划、材料、问题和摘要
├─ pages/event-detail/         病程及检验项目详情
├─ services/ocr-service.js     微信云开发调用与临时文件清理
├─ services/ocr-normalizer.js  百度返回结果标准化
├─ services/cloud-backup-service.js 云备份云函数调用
├─ services/visit-summary.js   脱敏摘要、签名和文字导出
└─ services/data-service.js    本地数据、迁移和病程写入
cloudfunctions/
├─ recognizeMedicalReport/     百度医疗 OCR 服务端代理
└─ manageUserBackup/           个人云备份、恢复和删除
docs/
├─ PHASE4_REVIEW.md            第四阶段验收清单
├─ BAIDU_OCR_SETUP.md          真实服务部署说明
├─ CLOUD_BACKUP_SETUP.md       云备份部署与权限说明
└─ DATA_MODEL.md               数据模型
```

## 自动检查

```powershell
npm.cmd test
npm.cmd run check
```

测试不会访问微信、百度或任何网络服务。

## 审核建议

先按照 [第四阶段审核说明](docs/PHASE4_REVIEW.md) 完成个人备份、覆盖确认、恢复和删除测试；测试真实医疗数据前，应先使用虚构示例完成流程验收。
