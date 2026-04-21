# 太平猴魁茶叶溯源与品质辅助评估系统

太平猴魁茶叶溯源与品质辅助评估系统，面向毕业设计场景构建，提供从用户注册审核、批次管理、溯源记录，到品质辅助评估、监管审核、消费者查询的完整业务闭环。

当前项目采用前后端分离架构：

- 后端：`Go + Gin + GORM + MySQL`
- 前端：`React + Vite + TypeScript + Ant Design`

## 项目简介

本项目围绕茶叶生产与流通过程中的“可追溯、可管理、可评价、可查询”目标设计，支持多角色协同使用：

- 管理员：审核注册申请、管理系统用户
- 茶农 / 企业：维护茶叶批次与溯源阶段信息
- 监管方：查看与审核关键业务记录
- 消费者：公开查询溯源信息、登录后收藏与反馈

## 核心功能

- 用户登录、注册与注册状态查询
- 管理员审核注册申请与用户管理
- 多角色账号体系：管理员、茶农、企业、监管方、消费者
- 茶叶批次管理与溯源阶段记录
- 品质辅助评估与等级判定
- 监管审核记录与状态跟踪
- 数据统计分析接口与图表展示
- 消费者匿名公开查询
- 消费者登录后收藏、反馈、查询历史

## 技术栈

### 后端

- Go
- Gin
- GORM
- MySQL
- JWT 鉴权
- RBAC 权限控制

### 前端

- React
- TypeScript
- Vite
- Ant Design
- ECharts / 可视化图表组件

## 项目结构

```text
cmd/server            程序入口
docs                  设计文档与联调说明
frontend              React 前端项目
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
scripts               辅助脚本
```

## 快速开始

### 1. 准备数据库

启动 MySQL，并创建数据库：

```sql
CREATE DATABASE tea_traceability;
```

### 2. 配置环境变量

复制根目录环境变量模板：

```bash
cp .env.example .env
```

按本机环境修改数据库连接、端口等配置。

### 3. 启动后端

```bash
go mod tidy
go run ./cmd/server
```

默认地址：

- 后端接口：`http://localhost:8080`

### 4. 启动前端

```bash
cd frontend
npm install
npm run dev
```

默认地址：

- 前端页面：`http://127.0.0.1:3000`

## 演示账号

启用 `SEED_DEMO=true` 时，会自动初始化演示数据：

- 管理员：`admin_demo / 123456`
- 茶农：`farmer_demo / 123456`
- 企业：`enterprise_demo / 123456`
- 监管方：`regulator_demo / 123456`
- 消费者：`consumer_demo / 123456`

## 文档说明

- [后端设计说明](./docs/mvp-backend-design.md)
- [本地联调指南](./docs/local-demo-guide.md)
- [接口冒烟测试](./docs/api-smoke-test.md)
- [答辩总结说明](./docs/defense-summary.md)
- [前端界面改版说明](./docs/frontend-ui-refresh.md)

## 前端说明

当前前端已升级为适合答辩展示的 Ant Design 界面版本，支持：

- 角色差异化菜单
- 统计图表展示
- 品质雷达图
- 监管审核页面
- 真实二维码公开查询场景

## 开发流程

后续推荐使用以下 Git 流程同步改动：

```bash
git status
git add .
git commit -m "feat: 功能改动说明"
git push
```

## 开源许可

如需开源发布，可后续补充 `MIT` 或其他许可证文件。
