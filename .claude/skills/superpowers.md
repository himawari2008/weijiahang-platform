# Superpowers — AI 编程方法论

为家航项目 5 个子包（miniapp / navigator / merchant / admin / server）的工程化自主开发方法论。

## 核心原则

1. **需求确认 → 规范 → 计划 → 执行** 四阶段，绝不跳过
2. **子代理驱动开发**：每个独立任务派生子代理并行推进
3. **自主工作数小时不偏离**：严格执行 TodoWrite 追踪进度
4. **每次只改一个关注点**：一个 PR / 一个 commit 只做一件事

## 开发流程

### Phase 1: 需求确认
- 用户说"我要xx功能" → 追问 3 个澄清问题
- 确认边界条件、用户角色、异常情况
- 产出：一句话需求描述

### Phase 2: 制定规范
- 定义 API 接口（RESTful / GraphQL）
- 定义数据库 Schema 变更
- 定义前端组件树和状态管理
- 产出：spec.md（放在对应子项目 docs/ 下）

### Phase 3: 计划
- 拆解为独立子任务，标记依赖关系
- 估算每个任务的工作量
- 使用 TodoWrite 创建任务列表
- 产出：可执行的任务清单

### Phase 4: 执行
- 每个子任务一个 Agent，并行推进
- 每个 Agent 完成后立即验证
- 所有 Agent 完成后集成测试
- 产出：可运行的代码 + 测试

## 子项目隔离原则

```
weijiahang-server    → Agent 1 (API 开发)
weijiahang-miniapp   → Agent 2 (用户端)
weijiahang-navigator → Agent 3 (领航员端)
weijiahang-merchant  → Agent 4 (商家端)
weijiahang-admin     → Agent 5 (管理后台)
```

每个 Agent 只能修改自己子项目的文件。

## 质量门禁

- [ ] 代码通过 lint
- [ ] 注释使用中文
- [ ] 每个 PR ≤ 500 行变更
- [ ] 关键逻辑有单元测试
