# 第四阶段数据模型

业务数据保存在本地键 `zhenlu_state_v4`。启动时兼容读取 v1、v2 和 v3 数据，随后写入 v4；原有患者、病程、OCR 核对结果和复诊计划保持不变。

## 根状态

```js
{
  version: 4,
  hasOnboarded: false,
  activePatientId: "",
  patients: [],
  events: [],
  visitPlans: [],
  sync: {
    lastBackupAt: "",
    lastRestoreAt: "",
    cloudUpdatedAt: ""
  }
}
```

`sync` 只记录本机界面所需的同步时间，不上传到云端。患者、病程事件、复诊计划及第三阶段摘要结构保持原定义。

## 云端备份包

```js
{
  schemaVersion: 4,
  exportedAt: "ISO 时间",
  data: {
    hasOnboarded: true,
    activePatientId: "patient_xxx",
    patients: [],
    events: [],
    visitPlans: []
  }
}
```

云函数以当前微信上下文中的 OpenID 计算不可逆的 128 位摘要文档标识。数据库文档只保存 `schemaVersion`、`payload` 和 `updatedAt`，不保存明文 OpenID。客户端无法指定要读取或覆盖的用户。

## 完整性约束

- 患者、事件和复诊计划的 `id` 在各自集合内必须唯一；
- 事件必须引用备份内存在的患者；
- 复诊计划必须引用备份内存在的患者；
- `selectedEventIds` 只能引用同一患者的事件；
- `activePatientId` 为空，或指向备份内存在的患者；
- 恢复前由小程序再次执行同样的关联校验；
- 单份 JSON 备份不超过 750 KiB。

## 删除与覆盖

- 上传使用整体覆盖，每个微信身份只保留一份当前备份；
- 恢复会整体覆盖当前本机业务数据，界面必须二次确认；
- 清除本地数据与删除云端备份是两个独立操作；
- 云端删除完成后无法从该备份恢复。
