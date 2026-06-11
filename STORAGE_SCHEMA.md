# localStorage 持久化 Schema 文档

> 版本 `1.0.0` · 八正道修行进度仪表盘

---

## 0. 总览

本应用**无后端服务**，用户数据 100% 存储于浏览器 `localStorage`，遵循下表键名约定。
可通过工具栏「🔧 数据管理 → 导出 JSON 备份」一键迁移。

| localStorage Key | Value 类型 | 写入时机 | 自动清除 |
|---|---|---|---|
| `eightfold_records` | JSON Object | 保存每日自评时 | 超 365 天自动归档 |
| `eightfold_archive` | JSON Object | `records` 溢出时 | - |
| `eightfold_reminders` | JSON Array | 勾选提醒项 / 低分建议时 | - |
| `eightfold_draft` | JSON Object | 滑块/心得输入（500ms 防抖） | 保存/撤销时清除 |
| `eightfold_onboarding` | 字符串 `'1'` | 完成首次引导时 | - |
| `eightfold_active_date` | 日期字符串 | 切换日期时 | - |

---

## 1. `eightfold_records` · 每日主记录

**Value 类型**：`Record<string, DailyRecord>` —— 以日期 (`YYYY-MM-DD`) 为 key

```typescript
interface DailyRecord extends Record<DimensionKey, DimensionScore> {
  date: string          // "2025-06-11"
  savedAt: string      // ISO 8601，最新一次保存时间戳
}

interface DimensionScore {
  score: number       // 0-100，整数
  note?: string      // 当日实践心得，≤500 字符
}
```

### DimensionKey 枚举

```
rightView         正见
rightThought     正思维
rightSpeech     正语
rightAction     正业
rightLivelihood  正命
rightEffort     正精进
rightMindfulness  正念
rightConcentration 正定
```

### 约束

- **数量上限**：365 条，超出时自动将**最早 30 条移动到 `eightfold_archive`
- 写入要求：8 维中至少 4 维 `score > 0`（由 `canSave` 计算）
- 同日多次 `saveTodayRecord()`：覆盖 `savedAt` 更新为当前时间

---

## 2. `eightfold_archive` · 历史归档

**Value 类型**：`Record<string, DailyRecord>`

- 从 `eightfold_records` 溢出时自动填充，按日期降序分批（每批 30 天

### 归档触发点

1. `init()` 启动加载时
2. `saveTodayRecord()` 保存后
3. `importBackup()` 导入后

---

## 3. `eightfold_reminders` · 定课提醒

**Value 类型**：`ReminderItem[]`

```typescript
interface ReminderItem {
  key: string            // 唯一标识 e.g. "morning_sutra"
  label: string         // 显示文案
  dimension: DimensionKey  // 关联八维 key，用于低分建议匹配
  checked: boolean      // 用户是否勾选
  suggested: boolean     // 是否因「该维<60 分被自动建议（虚线框高亮）
}
```

### 默认 10 条

| key | label | 关联维度 |
|-----|-------|----------|
| `morning_sutra` | 早课诵经 30 分钟 | rightEffort |
| `evening_sutra` | 晚课诵经回向 | rightEffort |
| `meditation` | 静坐禅修 15 分钟 | rightConcentration |
| `mindfulness_breath` | 每小时观呼吸一次 | rightMindfulness |
| `kind_speech` | 今日只说柔软语 | rightSpeech |
| `no_killing` | 慈心不杀，食素一日 | rightAction |
| `dana` | 布施或随喜赞叹 | rightAction |
| `right_livelihood_reflection` | 检视职业是否清净 | rightLivelihood |
| `contemplate_causality` | 思惟因果因缘 | rightView |
| `metta` | 慈心禅修 | rightThought |

---

## 4. `eightfold_draft` · 未保存草稿

**Value 类型**：`Partial<Record<DimensionKey, DimensionScore>>`

- 防抖 500 ms 写入 localStorage，防止滑块拖动频繁 IO
- **清除条件**：
  - `saveTodayRecord()` 成功 → 清空
  - `revertDraft()` 撤销 → 清空
  - `setActiveDate()` 切换日期 → 清空

---

## 5. `eightfold_onboarding` · 首次引导状态

**Value 类型**：字符串字面量

| 值 | 含义 |
|----|------|
| `'1'` | 已完成八正道八支引导弹窗 |
| 不存在 / `null` | 首次进入 → 显示引导弹窗 |

---

## 6. `eightfold_active_date` · 当前操作日期

**Value 类型**：`YYYY-MM-DD` 字符串

用户在工具栏日期选择器选定

---

## 7. 导出/导入格式 BackupData Schema

### 结构

```jsonc
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["version", "exportedAt", "records"],
  "properties": {
    "version": { "const": "1.0.0" },
    "exportedAt": { "type": "string", "format": "date-time" },
    "records": {
      "type": "array",
      "items": { "$ref": "#/$defs/DailyRecord" }
    },
    "archive": {
      "type": "array",
      "items": { "$ref": "#/$defs/DailyRecord" }
    },
    "reminders": {
      "type": "array",
      "items": { "$ref": "#/$defs/ReminderItem" }
    }
  }
}
```

### 导入校验步骤（`isValidBackupData`）

1. `version` 字符串
2. `exportedAt` 合法 ISO 日期
3. `records` 为数组
4. 每条记录：日期 / 八维各维 `score ∈ [0,100]`
5. 任一校验失败 → `errors` 明细返回

### 示例

```json
{
  "version": "1.0.0",
  "exportedAt": "2025-06-11T08:30:00.000Z",
  "records": [
    {
      "date": "2025-06-11",
      "savedAt": "2025-06-11T08:29:00.000Z",
      "rightView":           { "score": 85, "note": "晨读《相应部》" },
      "rightThought":        { "score": 72, "note": "对境起嗔时及时转念" },
      "rightSpeech":        { "score": 90 },
      "rightAction":        { "score": 80 },
      "rightLivelihood":   { "score": 65 },
      "rightEffort":        { "score": 88 },
      "rightMindfulness":  { "score": 78 },
      "rightConcentration": { "score": 70 }
    }
  ]
}
```

---

## 8. 容量估算

每条 DailyRecord 约 700–1200 字节（含心得时更大）

| 数据量 | 估算大小 |
|--------|----------|
| 365 天 × 1 KB ≈ **365 KB |
| 加上提醒、草稿、其他元数据 ≈ **≤ 1 MB，远低于 5 MB 配额 |

> 💡 建议每 1-3 个月导出一次 JSON 备份到本地文件，防止浏览器缓存清理导致修行数据。
