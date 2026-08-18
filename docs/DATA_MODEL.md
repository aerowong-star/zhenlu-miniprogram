# 第二阶段数据模型

业务数据保存在本地键 `zhenlu_state_v2`。启动时兼容读取第一阶段的 `zhenlu_phase1_state_v1` 和旧品牌键 `hanlu_phase1_state_v1`，随后写入 v2。

## 根状态

```js
{
  version: 2,
  hasOnboarded: false,
  activePatientId: "",
  patients: [],
  events: []
}
```

## Patient

患者字段沿用第一阶段：`id`、`nickname`、`birthYear`、`relationship`、`diseaseName`、`diagnosisDate`、`stage`、`department`、`isDemo`、`createdAt`、`updatedAt`。

## TimelineEvent

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 本地唯一标识 |
| patientId | string | 所属患者档案 |
| date | YYYY-MM-DD | 事件日期 |
| type | enum | 事件类型；OCR 报告使用 `test` |
| title / description | string | 经用户确认的标题和事实记录 |
| hospital / department | string | 医院与科室 |
| source | string | `manual`、`ocr-demo` 或 `baidu-medical-ocr` |
| report | object/null | 经人工核对的结构化报告 |
| isDemo | boolean | 第一阶段示例事件标记 |
| createdAt / updatedAt | ISO string | 创建和更新时间 |

## Report

```js
{
  provider: "baidu-medical-ocr",
  providerLogId: "用于服务问题定位的日志 ID",
  reviewed: true,
  reviewedAt: "ISO 时间",
  isDemo: false,
  items: [
    {
      name: "项目名称",
      code: "项目代号",
      result: "结果原文",
      unit: "单位原文",
      reference: "参考区间原文",
      hint: "报告原始提示符号"
    }
  ]
}
```

报告图片和百度密钥均不进入本地状态。图片只作为临时 OCR 输入；事件中仅保存用户核对后的文字结果。

## 删除与迁移

- 删除患者时级联删除其全部病程事件和报告文字结果。
- 删除事件时同时删除内嵌的报告结果。
- 清除全部数据会恢复空状态和首次使用流程。
- v1 事件迁移后自动补充 `report: null`，原有业务字段不变。

## 后续云同步建议

云同步阶段应新增 `ownerUserId`、授权记录、服务端版本和审计字段，并通过 repository 接口替换本地实现。图片若需要长期保存，必须另行设计明确授权、访问控制、保留期限和删除机制。
