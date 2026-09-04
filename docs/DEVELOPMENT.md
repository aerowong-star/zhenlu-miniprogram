# 诊路微信小程序开发文档

## 1. 项目概述

“诊路”是面向罕见病患者和照护者的病程整理与复诊准备工具。它帮助用户保存患者档案、记录病程、整理复诊问题，并在用户主动确认后使用 OCR、云备份和只读共享功能。

本产品不提供疾病诊断、检验结果解释、治疗方案或用药建议。OCR 结果必须由用户人工核对，示例病例仅用于演示。

## 2. 技术栈与架构

### 前端

- 微信原生小程序：JavaScript、WXML、WXSS、JSON
- 本地持久化：微信 Storage
- 云端调用：`wx.cloud.callFunction`、`wx.cloud.uploadFile`
- 图片处理：设备端等比缩放和压缩

### 后端

- 微信云开发 CloudBase
- Node.js 云函数和 `wx-server-sdk`
- 微信云数据库
- 微信云存储临时文件
- 定时触发器 `cleanupCareInvitesDaily`

### 第三方服务

- 百度医疗检验报告单 OCR
- OCR 只由云函数服务端调用，百度凭证不能放在小程序代码中

### 主要数据流

```text
本地档案/病程
    ├─ 导出云备份 → manageUserBackup → user_backups
    ├─ OCR 图片 → 临时云存储 → recognizeMedicalReport → 百度 OCR → 删除临时图片
    └─ 照护共享 → manageCareSharing → 最小化共享快照
```

## 3. 目录结构

```text
miniprogram/
├─ app.js                         应用启动、云初始化、隐私门槛
├─ app.json                       页面、导航和 TabBar 配置
├─ pages/                         页面逻辑、视图和样式
├─ services/data-service.js       本地数据、迁移、备份导出和恢复
├─ services/privacy-service.js    隐私同意版本管理
├─ services/cloud-error.js        云错误归类和内部信息隐藏
├─ services/ocr-service.js        OCR 云函数调用和临时文件清理
├─ services/ocr-normalizer.js     百度返回值标准化
├─ services/cloud-backup-service.js 云备份调用
├─ services/account-data-service.js 云端数据查询和删除
├─ services/care-sharing-service.js 照护共享调用
├─ services/care-share-snapshot.js 共享范围过滤和脱敏
├─ services/visit-summary.js      复诊摘要、签名和导出
└─ utils/                         日期等通用工具

cloudfunctions/
├─ recognizeMedicalReport/        百度 OCR 服务端代理
├─ manageUserBackup/              用户云备份
├─ manageCareSharing/             邀请、接受、共享和撤销
├─ manageMyCloudData/             当前微信身份数据查询和删除
└─ cleanupCareInvites/            过期数据定时清理

tests/                            Node.js 自动化测试
docs/                             配置、验收和开发文档
```

## 4. 本地开发

1. 使用微信开发者工具导入包含 `project.config.json` 的项目根目录。
2. 将 `cloudfunctions` 识别为云函数根目录。
3. 开发阶段可使用演示识别，不需要百度凭证。
4. 真实云功能需要正式 AppID 和已关联的云环境。
5. 正式 AppID 只保存在本机配置，不提交到 Git。

运行自动检查：

```powershell
npm.cmd test
npm.cmd run check
```

测试不会连接微信、百度或其他网络服务。

## 5. 页面和业务约定

### 隐私门槛

`pages/privacy-consent` 是首次入口。用户未同意当前政策版本时，只能访问：

- 隐私政策
- 用户协议
- 数据与隐私管理

修改政策版本时，应更新 `services/privacy-service.js` 中的版本号，并重新测试冷启动和撤回同意流程。

### 本地数据

`services/data-service.js` 使用版本化 Storage，当前模型版本为 v4。新增字段必须兼容旧数据，并为迁移补充测试。

示例患者带有 `isDemo` 标记。只要本地存在示例病例，设置页会禁用云备份和恢复，防止示例数据污染正式账号。

### 云备份

客户端不能提交用户身份。`manageUserBackup` 从 `cloud.getWXContext().OPENID` 获取身份，并使用不可逆摘要作为备份文档 ID。每个微信身份保留一份备份，恢复操作会覆盖当前设备本地业务数据，页面必须保留二次确认。

### 照护共享

共享内容必须先经过 `care-share-snapshot.js` 过滤。默认不共享患者称呼和检验明细；邀请码为一次性、限时、高随机度字符串。照护者只能查看授权快照，不能写入管理者档案。

### OCR

OCR 流程必须满足：

1. 用户主动选择或拍摄图片；
2. 前端压缩图片；
3. 上传至临时目录 `ocr-temp/`；
4. 调用 `recognizeMedicalReport`；
5. 结果标准化后人工核对；
6. 在 `finally` 中删除临时图片。

不要在前端放置百度 API Key、Secret Key 或 Access Token。

## 6. 云端资源配置

正式环境需要创建以下集合：

| 集合 | 用途 | 客户端权限 |
|---|---|---|
| `user_backups` | 个人云备份 | 禁止直接读写 |
| `care_invites` | 待接受邀请码 | 禁止直接读写 |
| `care_grants` | 共享授权快照 | 禁止直接读写 |
| `ocr_rate_limits` | OCR 每日限流 | 禁止直接读写 |
| `service_rate_limits` | 通用服务限流 | 禁止直接读写 |

建议为 `ocr_rate_limits` 和 `service_rate_limits` 建立 `userHash`、`expiresAt` 索引。

重新部署函数时选择：

> 上传并部署：云端安装依赖（不上传 node_modules）

百度 OCR 云函数需要配置环境变量：

- `BAIDU_OCR_API_KEY`
- `BAIDU_OCR_SECRET_KEY`

密钥只能配置在云函数环境变量中。

## 7. 测试要求

### 功能测试

- 患者档案和病程增删改查
- OCR 识别、人工核对和临时文件删除
- 复诊材料筛选、问题编辑和摘要确认
- 云备份上传、检查、恢复和删除
- 邀请码创建、接受、取消、撤销和退出
- 本地数据和云端数据分别删除

### 双账号测试

使用两个真实微信账号验证：

1. 账号 A 创建邀请码；
2. 账号 B 接受邀请码；
3. 账号 B 查看授权快照；
4. 账号 A 撤销授权；
5. 账号 B 确认无法继续查看；
6. 账号 A 删除全部云端数据；
7. 确认账号 B 的共享数据已不可访问。

### 安全测试

- 前端不提交 OpenID 或用户身份参数；
- 不同账号不能读取彼此备份；
- 未授权用户不能读取共享详情；
- 频繁调用会触发限流；
- 错误提示不包含 callId、trace、密钥或原始 SDK 错误；
- 示例病例不能上传或恢复云备份。

## 8. 发布流程

1. 使用正式 AppID 编译并真机测试。
2. 检查云环境、集合权限、索引和云函数更新时间。
3. 运行 `npm.cmd test`、`npm.cmd run check` 和敏感信息扫描。
4. 在微信开发者工具中上传版本。
5. 在公众平台“版本管理”中设为体验版。
6. 让体验成员完成核心流程测试。
7. 完善隐私保护指引和审核备注。
8. 提交微信审核。
9. 审核通过后手动点击“发布”。
10. 发布后观察云函数日志、调用量、错误率和 OCR 费用。

## 9. 维护与故障排查

### 云函数不存在

确认当前环境和 AppID 正确，并重新部署对应函数。部署成功后可在云开发控制台函数列表和日志中确认。

### 数据库集合不存在

确认集合创建在当前环境，不要只在其他测试环境创建。限流集合缺失时，备份、OCR或共享操作可能失败。

### 数据权限错误

检查集合权限是否由云函数访问。前端不应绕过服务层直接读写医疗数据。

### OCR 失败

依次检查图片大小、百度凭证、OCR 接口权限、每日额度、QPS 和云函数日志。失败时允许用户手动录入。

### 云备份混用

确认两个测试账号是真实不同微信身份，并重新部署最新 `manageUserBackup`。同一微信账号的新建患者档案仍属于同一份云备份。

## 10. 开发禁忌

- 不把正式 AppID、百度密钥、OpenID或真实患者资料提交到仓库；
- 不在日志中打印病历、报告原文、邀请码和图片地址；
- 不把 OCR 结果直接当作医疗结论；
- 不为了通过审核勾选实际未使用的信息类型；
- 不在未确认权限的情况下公开分享医疗数据；
- 不直接删除生产数据库集合或批量数据；
- 修改云函数后必须重新部署并检查日志。

## 11. 相关文档

- [百度 OCR 配置](BAIDU_OCR_SETUP.md)
- [云备份配置](CLOUD_BACKUP_SETUP.md)
- [照护共享配置](CARE_SHARING_SETUP.md)
- [数据模型](DATA_MODEL.md)
- [第六阶段验收](PHASE6_REVIEW.md)
- [上线环境配置](RELEASE_SETUP.md)
