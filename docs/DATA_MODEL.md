# 第三阶段数据模型

业务数据保存在本地键 `zhenlu_state_v3`。启动时兼容读取第二阶段的 `zhenlu_state_v2`、第一阶段的 `zhenlu_phase1_state_v1` 和旧品牌键 `hanlu_phase1_state_v1`，随后写入 v3。

## 根状态

```js
{
  version: 3,
  hasOnboarded: false,
  activePatientId: "",
  patients: [],
  events: [],
  visitPlans: []
}
```

## Patient 与 TimelineEvent

患者字段沿用第一阶段。病程事件沿用第二阶段并继续支持经人工核对的 `report` 结构。报告图片和百度密钥不进入本地状态；事件中只保存用户确认后的文字结果。

## VisitPlan

```js
{
  id: "visit_xxx",
  patientId: "patient_xxx",
  visitDate: "2026-09-20",
  hospital: "示例医院",
  department: "遗传代谢科",
  doctor: "",
  purpose: "本次希望沟通的事项",
  selectedEventIds: ["event_xxx"],
  questions: [{ id: "question_xxx", content: "下一次需要复查哪些项目？", answered: false, note: "" }],
  status: "draft",
  privacyOptions: null,
  summarySnapshot: null,
  sourceSignature: "",
  confirmedAt: "",
  isDemo: false,
  createdAt: "ISO 时间",
  updatedAt: "ISO 时间"
}
```

`selectedEventIds` 只允许引用同一患者档案中的病程事件。删除病程事件时，相关复诊计划会自动移除该引用并取消摘要确认状态。

## 摘要确认

摘要由患者档案、复诊计划、所选事件、问题清单和隐私选项共同生成。用户确认时保存：

- `summarySnapshot`：当时看到的结构化摘要快照；
- `sourceSignature`：摘要来源内容的确定性签名；
- `privacyOptions`：本次确认使用的显示范围；
- `confirmedAt`：用户确认时间；
- `status: "ready"`：当前摘要可以复制使用。

任一来源内容或隐私选项发生变化，重新计算的签名会不同，界面必须要求用户再次确认。编辑计划、材料或问题时会主动清除旧快照。

## 默认隐私规则

- 患者称呼默认隐藏；
- 出生年份默认隐藏；
- 医院信息默认显示，可由用户关闭；
- 疾病名称、阶段和主要科室作为复诊沟通核心内容保留；
- 不保存身份证号、手机号、家庭住址或报告图片；
- 复制前必须完成一次明确确认。

## 删除与迁移

- 删除患者时级联删除其病程事件和复诊计划；
- 删除事件时清理所有复诊计划中的相应引用；
- 删除复诊计划不影响原始患者档案和病程事件；
- v1/v2 数据迁移后新增空的 `visitPlans` 数组，原有业务数据不变；
- 清除全部数据会恢复空的 v3 状态和首次使用流程。

## 后续云同步建议

云同步阶段应增加数据所有者、照护者授权、服务端版本、撤销记录和审计字段。摘要分享链接若放入云端，必须设置访问期限、撤销能力和最小化字段。
