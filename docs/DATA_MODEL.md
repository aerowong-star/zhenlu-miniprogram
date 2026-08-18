# 第一阶段数据模型

本阶段全部业务数据保存在本地存储 `zhenlu_phase1_state_v1` 中；首次启动会兼容读取旧品牌版本的 `hanlu_phase1_state_v1`。

## 根状态

```js
{
  version: 1,
  hasOnboarded: false,
  activePatientId: "",
  patients: [],
  events: []
}
```

`version` 用于后续本地数据迁移。业务页面不直接读写存储，而是通过 `services/data-service.js` 操作。

## Patient

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 本地唯一标识 |
| nickname | string | 患者称呼，必填 |
| birthYear | string | 出生年份，选填 |
| relationship | string | 当前用户与患者关系 |
| diseaseName | string | 医生已明确诊断的病种，必填 |
| diagnosisDate | YYYY-MM-DD | 确诊日期 |
| stage | string | 当前随访阶段 |
| department | string | 主要复诊科室 |
| isDemo | boolean | 是否为虚构示例数据 |
| createdAt / updatedAt | ISO string | 创建和更新时间 |

## TimelineEvent

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 本地唯一标识 |
| patientId | string | 所属患者档案 |
| date | YYYY-MM-DD | 事件发生日期，必填 |
| type | enum | symptom / visit / hospital / test / diagnosis / medication / checkup / adverse / other |
| title | string | 事件标题，必填 |
| description | string | 事实性详细记录 |
| hospital | string | 医院或机构 |
| department | string | 科室 |
| isDemo | boolean | 是否为虚构示例数据 |
| createdAt / updatedAt | ISO string | 创建和更新时间 |

## 删除规则

- 删除患者档案时级联删除其全部病程事件。
- 删除单条病程事件不会影响患者档案。
- 清除全部数据会恢复空状态和首次使用流程。

## 第二阶段迁移建议

接入云数据库时保留当前字段含义，并新增 `ownerUserId`、授权记录和服务端版本字段。需要以新的 repository 接口替换本地存储实现，页面层不直接依赖云数据库 SDK。
