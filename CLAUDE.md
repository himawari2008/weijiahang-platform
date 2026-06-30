# 为家航 — 为家领航

> 线下建材市场 O2O：室内导航 + AI推荐 + 领航员 + 在线下单

## 项目结构

| 子项目 | 类型 | 用户 |
|--------|------|------|
| `weijiahang-miniapp` | 微信小程序 | 业主/采购商 |
| `weijiahang-navigator` | 微信小程序 | 线下领航员 |
| `weijiahang-merchant` | React + Ant Design | 市场商户 |
| `weijiahang-admin` | React + Ant Design | 平台运营 |
| `weijiahang-server` | Nest.js | 后端 API |

## 技术栈 & 环境

- 前端：微信小程序 · React 18 · Ant Design 5 · 腾讯地图 API
- 后端：Nest.js · PostgreSQL 17 + PostGIS 3.6 · Redis 5.0
- AI：Claude API / 通义千问 · BLE 蓝牙信标
- DB：`localhost:5432` · `weijiahang`/`weijiahang123` · `weijiahang_dev`
- Node：`D:\Program Files\nodejs` v24.16

## 开发规范

- **流程**：需求确认(追问3问) → 规范(API Schema) → 计划(TodoWrite) → 执行(并行Agent)
- **质量**：中文注释 · PR≤500行 · 关键逻辑有单测 · 先方案再代码
- **Agent隔离**：5子项目各一个Agent，只改自己目录；跨项目先定接口契约
- **UI铁律**：按钮≥88rpx · 正文≥32rpx · 主色#FF6B35 · 辅助#1A365D
- 详细规范见 [skills/](.claude/skills/) — frontend-design / systematic-debugging / autoresearch

## 当前进度

- **miniapp**：22页全部完成(R1-R4)，含AI Chat/Calc/订单生态/消息/Mine ✅
- **navigator**：21页+WebSocket ✅ · **merchant**：13页+移动端适配 ✅
- **server**：26控制器+28实体+安全体系(生产就绪) ✅ · **admin**：未开始
- 待做：真机测试 · BLE部署 · AI接入真实API · 生产数据库切换
- 材质纹理 `.tc-*` CSS体系 · 全平台零emoji(CSS图标) · AI Calc离线引擎

## 会话约定

- 默认批准项目目录文件读写 · 注释中文 · EnterPlanMode做规划
- 子代理 `deepseek-v4-flash` · 主模型 `deepseek-v4-pro`
- 对话过长→开新窗口，新窗口读此文件接上进度
