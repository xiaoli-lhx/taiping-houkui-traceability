# 太平猴魁茶叶溯源与品质辅助评估系统

当前仓库为毕业设计前后端联调版：

- 后端：`Go + Gin + GORM + MySQL`
- 前端：`React + Vite + TypeScript + Ant Design`

## 当前已实现的核心能力

- 登录、注册、注册状态查询
- 管理员审核注册申请与用户管理
- 单角色账号体系：管理员、茶农、企业、监管方、消费者
- 茶叶批次与溯源阶段记录管理
- 品质辅助评估与等级判定
- 监管审核记录
- 数据统计分析接口
- 消费者匿名公开查询
- 消费者登录后收藏、反馈、查询历史

## 目录结构

```text
cmd/server            程序入口
docs                  设计文档
internal/app          应用启动
internal/config       配置管理
internal/database     数据库初始化与迁移
internal/handler      HTTP 处理器
internal/middleware   JWT 与 RBAC 中间件
internal/model        数据模型
internal/router       路由注册
internal/service      业务服务
pkg/authx             JWT 工具
pkg/responsex         统一响应
```

## 快速启动

1. 启动 MySQL，并创建数据库 `tea_traceability`
2. 复制 `.env.example` 为 `.env`，按本机环境修改
3. 执行：

```bash
go mod tidy
go run ./cmd/server
```

服务默认监听：`http://localhost:8080`

## 前端启动

```bash
cd frontend
npm install
npm run dev
```

前端默认地址：`http://127.0.0.1:3000`

## 演示账号

在 `SEED_DEMO=true` 时会自动初始化演示数据：

- 管理员：`admin_demo / 123456`
- 茶农：`farmer_demo / 123456`
- 企业：`enterprise_demo / 123456`
- 监管方：`regulator_demo / 123456`
- 消费者：`consumer_demo / 123456`

## 设计文档

详见：[docs/mvp-backend-design.md](D:\GolandProjects\Go_\docs\mvp-backend-design.md)

## 联调文档

- [docs/local-demo-guide.md](D:\GolandProjects\Go_\docs\local-demo-guide.md)
- [docs/api-smoke-test.md](D:\GolandProjects\Go_\docs\api-smoke-test.md)
- [docs/defense-summary.md](D:\GolandProjects\Go_\docs\defense-summary.md)
- [docs/frontend-ui-refresh.md](D:\GolandProjects\Go_\docs\frontend-ui-refresh.md)

## 前端展示版

- 已升级为 `Ant Design` 答辩展示版
- 已支持角色菜单差异化、统计图表、品质雷达图、监管审核页面和真实二维码公开查询
