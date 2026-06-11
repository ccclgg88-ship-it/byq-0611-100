# ☸ 八正道修行进度仪表盘

> 依佛陀教导的八正道（正见、正思维、正语、正业、正命、正精进、正念、正定），每日自评修行完成度，以可视化方式呈现周/月趋势。

一个纯前端 Vue 3 + TypeScript + Pinia + ECharts 的修行自评工具。

---

## ✨ 功能概览

| 模块 | 功能 |
|------|------|
| **八维自评** | 8 个维度 0-100 滑块 + 实践心得文本；防抖 autosave 至 localStorage；同日多次提交覆盖更新；**至少 4 维方可保存** |
| **雷达图** | 实时预览「未保存态（虚线边框）、已保存态、周均分三重叠加，选中维度高亮 |
| **趋势图** | 选中维度近 30 天折线图，无数据日期显示断点而非归零，附 30 日均线标注 |
| **开示面板 | 依**最低分维度**自动匹配 `mock/advice.json` 的开示语 + 今日建议 |
| **定课提醒** | 10 项默认提醒；**低分维度自动建议勾选**（虚线框高亮） |
| **首次引导** | 分步介绍八正道每一支的巴利名、释义、实践举例 |
| **数据管理** | JSON 导入/导出，导入时校验 schema；历史 365 天自动归档最早 30 天至 `archive` |
| **报表导出** | 导出周报 PNG/PDF，含水印「修行仪表盘 Demo」 |

---

## 🏗️ 技术栈

| 类别 | 选型 |
|------|------|
| 前端框架 | Vue 3.4 + `<script setup>` |
| 语言 | TypeScript 5 (strict) |
| 构建 | Vite 5 |
| 状态管理 | Pinia 2 |
| 图表 | ECharts 5 + vue-echarts 6 |
| 测试 | Vitest 1 + @vue/test-utils + jsdom |
| 导出 | html2canvas + jsPDF |
| 样式 | SCSS + CSS 变量（暖金佛教配色） |
| 部署 | Docker + Nginx 静态托管 |

---

## 🚀 快速开始

### 环境要求

- Node.js ≥ 18+（推荐 20 LTS）
- npm ≥ 9+

### 本地开发

```bash
# 1. 安装依赖（推荐使用国内镜像）
npm install --registry=https://registry.npmmirror.com

# 2. 启动开发服务器
npm run dev
# → http://localhost:5173

# 3. 类型检查 + 生产构建
npm run build

# 4. 本地预览构建产物
npm run preview

# 5. 运行单元测试
npm test
```

首次进入首页，可点击工具栏 **🎲 载入演示数据** 一键加载 14 天示例数据以便体验图表。

---

## 🐳 Docker 部署

```bash
# 构建镜像并启动（8080 端口）
docker-compose up -d --build

# 打开浏览器访问
open http://localhost:8080

# 停止
docker-compose down
```

> `Dockerfile` 采用多阶段构建：第一阶段 `node:20-alpine` 构建，第二阶段 `nginx:1.25-alpine` 托管静态文件；`nginx.conf` 已启用 gzip、缓存头、安全响应头。

---

## 📁 项目结构

```
.
├── src/
│   ├── components/
│   │   ├── EightfoldDashboard.vue    # 主仪表盘（工具栏+滑块+趋势+开示+历史）
│   │   ├── RadarChart.vue          # 雷达图（已保存/未保存/周均分 三层）
│   │   ├── TrendChart.vue          # 折线图（30 天趋势 + 断点）
│   │   ├── DimensionSlider.vue    # 单维滑块 + 心得文本
│   │   ├── AdvicePanel.vue       # 佛陀开示 + 定课提醒
│   │   ├── OnboardingModal.vue  # 首次 8 步引导
│   │   └── ImportExportPanel.vue  # JSON 导入/导出 + 存储占用
│   ├── stores/
│   │   ├── eightfold.ts          # Pinia store（核心状态+算法）
│   │   └── eightfold.test.ts   # ≥4 组单元测试
│   ├── mock/
│   │   ├── advice.json              # 八维 → 开示语映射
│   │   └── eightfold-descriptions.json   # 八维详细说明（含巴利名、举例）
│   ├── constants/index.ts           # 八维顺序、名称、颜色、默认提醒、存储键
│   ├── types/index.ts             # TypeScript 类型定义（DailyRecord / BackupData 等）
│   ├── utils/
│   │   ├── date.ts                # 日期工具（formatDate / getWeekDates 等）
│   │   └── validation.ts          # schema 校验（isValidBackupData / 等）
│   ├── styles/main.scss           # 全局样式 + CSS 变量
│   ├── App.vue
│   ├── main.ts
│   └── env.d.ts
├── nginx.conf                     # Nginx 站点配置
├── Dockerfile                    # 多阶段构建镜像
├── docker-compose.yml             # 一键启动
├── vite.config.ts               # Vite + Vitest 配置
├── tsconfig.json
└── package.json
```

---

## 🧠 核心算法与业务规则

### 周均分算法

```typescript
// 七日内「有效记录」各维算术平均
// 无记录日（记录缺失 OR 该维得分为 0）不参与分母
周均分[维度] = 该维近 7 天 >0 的分数之和 ÷ 该维近 7 天 >0 的天数
```

### 保存校验

| 条件 | 结果 |
|------|------|
| 已填写维度数 ≥ 4 | ✅ 可保存，同日多次提交覆盖 `records[日期]` |
| 已填写维度数 < 4 | ❌ 拒绝，提示用户补足维度 |

### 自动归档策略

- `records` 键内记录数 **> 365 天时：
- 按日期**从旧到新**自动将最早 **30 天记录移动到 `archive` 键。

### autosave 机制

- 滑块 / 心得输入 → 500 ms **防抖**写入 `localStorage['eightfold_draft']`，防止频繁持久化。

---

## 📑 localStorage Schema 文档

完整说明见同目录 [STORAGE_SCHEMA.md

| Key | 类型 | 说明 |
|-----|------|------|
| `eightfold_records` | `Record<string, DailyRecord>` | 主记录（≤365 天） |
| `eightfold_archive` | `Record<string, DailyRecord>` | 归档记录（溢出最早 30 天/批） |
| `eightfold_reminders` | `ReminderItem[]` | 定课提醒勾选态 + 建议态 |
| `eightfold_draft` | `Partial<Record<DimensionKey, DimensionScore>>` | 未保存草稿（500ms 防抖） |
| `eightfold_onboarding` | `'1' \| undefined` | 是否已完成首次引导 |
| `eightfold_active_date` | `YYYY-MM-DD` | 当前操作日期 |

### BackupData 导出格式

```jsonc
{
  "version": "1.0.0",
  "exportedAt": "2025-06-11T12:00:00.000Z",
  "records": [ /* DailyRecord[] */ ],
  "archive": [ /* DailyRecord[] */ ],
  "reminders": [ /* ReminderItem[] (可选) */ ]
}
```

---

## 🧪 单元测试（Vitest）

`src/stores/eightfold.test.ts` 覆盖 **4 组 ≥11 用例**：

| 分组 | 用例 |
|------|------|
| 保存校验 & 写入 | 少于 4 维失败；≥4 维成功并同日覆盖；草稿撤销 |
| 周均分算法 | 7 日内有效记录算术平均；全空边界 |
| 记录上限 & 归档 | 380 条→归档最早 30 条；保存触发归档检查 |
| 导入导出 | schema 错误拒绝；成功导入后计算周均分 |

运行测试：

```bash
npm test
```

---

## 🗺️ 八正道 × 开示映射表

见 [`src/mock/advice.json`](src/mock/advice.json) & [`src/mock/eightfold-descriptions.json`](src/mock/eightfold-descriptions.json)

| 维度 | 键 Key | 巴利名 | 开示主题 |
|------|---------|--------|----------|
| 正见 | `rightView` | Sammā-diṭṭhi | 因果四谛 |
| 正思维 | `rightThought` | Sammā-saṅkappa | 出离·无嗔·无害 |
| 正语 | `rightSpeech` | Sammā-vācā | 妄语·两舌·恶口·绮语 |
| 正业 | `rightAction` | Sammā-kammanta | 杀盗淫三业清净 |
| 正命 | `rightLivelihood` | Sammā-ājīva | 远离五种邪命 |
| 正精进 | `rightEffort` | Sammā-vāyāma | 四正勤 |
| 正念 | `rightMindfulness` | Sammā-sati | 四念处安住 |
| 正定 | `rightConcentration` | Sammā-samādhi | 四禅次第 |

---

## ⚖️ License

本项目代码仅用于个人修行辅助工具的 Demo 演示用途。
