# 为家航 — 线下建材市场 O2O 平台

> 一个人，5个项目，54,000行代码，18岁独立完成的全栈作品。

---

## 项目概述

为家航是一个面向线下建材市场的 O2O 平台，覆盖 **4类用户角色**、**5个独立子项目**，从产品设计、数据库建模、API 设计到前端页面全部独立完成。

| 子项目 | 类型 | 用户 | 技术栈 | 页面/模块 |
|--------|------|------|--------|-----------|
| `weijiahang-miniapp` | 微信小程序 | 业主/采购商 | 原生 WXML/WXSS/JS | 29页 |
| `weijiahang-navigator` | 微信小程序 | 线下领航员 | 原生 WXML/WXSS/JS | 20页 |
| `weijiahang-merchant` | Web 管理后台 | 市场商户 | React 18 + Ant Design 5 | 12页 |
| `weijiahang-admin` | Web 管理后台 | 平台运营 | React 18 + Ant Design 5 | 18页 |
| `weijiahang-server` | 后端 API | — | NestJS + PostgreSQL + Redis | 35模块 · 39实体 |

---

## 技术架构

```
┌──────────────────────────────────────────────────────┐
│                    前端层                              │
│  weijiahang-miniapp    weijiahang-navigator           │
│  (业主端 · 微信小程序)   (领航员端 · 微信小程序)        │
│                                                       │
│  weijiahang-merchant   weijiahang-admin               │
│  (商户端 · React Web)   (运营端 · React Web)           │
├──────────────────────────────────────────────────────┤
│                    网关层                              │
│  API Gateway · Rate Limiting · JWT Auth               │
├──────────────────────────────────────────────────────┤
│                    服务层 (NestJS)                     │
│  35个业务模块 · 36个控制器 · WebSocket 实时通信         │
│  AI推荐引擎 · 派单算法 · 动态定价 · 审计日志            │
├──────────────────────────────────────────────────────┤
│                    数据层                              │
│  PostgreSQL 17 + PostGIS · Redis 5.0 · BLE 信标        │
└──────────────────────────────────────────────────────┘
```

### 安全体系

- JWT 多角色认证（业主/领航员/商户/管理员）
- CSRF 防护 · XSS 过滤 · Helmet 安全头
- 三级速率限制（全局/认证/管理后台）
- 审计日志拦截器（自动记录所有写操作）
- 优雅关闭（SIGTERM/SIGINT）

### 核心功能模块

- **AI 推荐引擎**：Claude API 驱动，建材智能推荐 + 装修预算计算器
- **派单系统**：就近匹配领航员，WebSocket 实时推送
- **室内导航**：BLE 蓝牙信标 + 腾讯地图
- **订单生态**：下单 → 领航员接单 → 验货拍照 → 结算
- **游戏化系统**：徽章/排行榜/等级权益
- **动态定价**：基于供需的实时定价引擎

---

## 各子项目详情

### 📱 weijiahang-miniapp — 业主端小程序

**功能链路**：搜索建材 → AI 推荐 → 商品详情 → 导航到店 → 下单购买

| 页面层级 | 包含页面 |
|----------|----------|
| 入口层 | splash · onboarding · index（首页） |
| 发现层 | shop-list · shop-detail · market-detail · map · feed |
| 决策层 | product-detail · ai-chat · ai-calc · city-select |
| 交易层 | cart · order-create · order-product · settle |
| 履约层 | orders · order-detail · chat · messages |
| 个人层 | mine · favorites · address-list · profile-edit · settings · coupons |
| 支撑层 | feedback · dispute · service |

### 🧭 weijiahang-navigator — 领航员端小程序

**功能链路**：接单大厅 → 到市场等客户 → 1对1带逛 → 拍照验货 → 结算佣金

核心页面：接单大厅 · 订单详情 · 收入明细 · 验货拍照 · 等级权益 · 排行榜 · 培训考试 · 数据统计

### 🏪 weijiahang-merchant — 商户端 (React + Ant Design)

核心页面：数据看板 · 店铺管理 · 商品管理 · 订单管理 · 评价管理 · 客户管理 · 营销中心 · 财务管理

### ⚙️ weijiahang-admin — 运营后台 (React + Ant Design)

核心页面：运营大盘 · 商家入驻审核 · 领航员认证审核 · 用户管理 · 订单管理 · 市场管理 · 结算审核 · 审计日志

### 🖥️ weijiahang-server — 后端服务 (NestJS)

- **35 个业务模块**：auth · users · shops · markets · orders · navigators · navigation · ai · reviews · ads · dispatch · notification · dynamic-pricing · gamification · settlement · analytics · audit-log · ...
- **39 个数据库实体**：user · shop · product · order · navigator · market · beacon · review · coupon · ...
- **Swagger API 文档**：`/api/docs`
- **WebSocket 网关**：订单实时推送 · 领航员位置跟踪

---

## 项目文档

| 文档 | 说明 |
|------|------|
| [PRD 产品需求文档](为家航_PRD_产品需求文档.md) | 完整功能规格 |
| [市场调研报告](为家航_市场调研报告.md) | 竞品分析与市场洞察 |
| [品牌视觉规范](为家航_品牌视觉规范.md) | 设计系统与视觉标准 |
| [全平台链路图](为家航-全平台链路图.md) | 用户旅程与数据流 |
| [产品扩展方案](为家航-产品扩展方案.md) | 后续规划 |
| [架构文档](docs/architecture.md) | 技术架构详细说明 |
| [战略重构分析](.claude/memory/weijiahang-pivot-analysis.md) | 商业模式反思 |

---

## 技术栈

### 前端
- 微信小程序原生（WXML · WXSS · JS）
- React 18 · React Router 6 · Ant Design 5
- Vite · Axios · ECharts
- 腾讯地图 API · BLE 蓝牙信标

### 后端
- NestJS 10 · TypeORM · PostgreSQL 17 + PostGIS 3.6
- Redis 5.0 · WebSocket (Socket.IO)
- Swagger API 文档 · Winston 日志
- JWT · CSRF · XSS · Rate Limiting · Helmet

### AI
- Claude API · 通义千问
- 建材推荐引擎 · 装修预算计算器

---

## 项目状态与反思

本项目在技术层面已基本完成（~54,000行代码，515+源文件），但在商业模式验证阶段发现核心问题：

1. **领航员模式** 的本质缺陷——佣金驱动必然导致代理人失控，类似啄木鸟平台的"维修刺客"困局
2. **建材市场熟人社会** 的既有利益链（工人-商户回扣体系），平台难以切入
3. **低频高价市场** 的平台模式，冷启动成本远大于创造的价值

**我学到的**：写代码之前，先搞清楚谁为什么愿意用。技术能解决的问题，远少于商业上真正需要解决的问题。

详见 [战略重构分析](.claude/memory/weijiahang-pivot-analysis.md)。

---

## 关于作者

- 18岁，独立全栈开发者
- 从产品设计 → UI → 前后端 → 数据库 → 文档，全链路独立完成
- 这个项目是自学编程一年的成果，也是求职的技术名片
- 联系方式：jiyuanshi50@gmail.com
