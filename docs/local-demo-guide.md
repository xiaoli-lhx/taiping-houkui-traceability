# 本地启动与联调说明

## 1. 启动前置条件

- Go 1.25+
- MySQL 8.0+
- Node.js 20+
- npm 10+

当前项目目录：

- 后端根目录：`D:\GolandProjects\Go_`
- 前端目录：`D:\GolandProjects\Go_\frontend`

## 2. 后端启动步骤

### 2.1 检查配置文件

当前已存在 `.env`，关键配置如下：

- `SERVER_ADDR=:8080`
- `MYSQL_DSN=root:123456@tcp(127.0.0.1:3306)/tea_traceability?charset=utf8mb4&parseTime=True&loc=Local`
- `AUTO_MIGRATE=true`
- `SEED_DEMO=true`

### 2.2 初始化数据库

若数据库不存在，可执行：

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -uroot -p123456 -e "CREATE DATABASE IF NOT EXISTS tea_traceability CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 2.3 启动后端

```powershell
cd D:\GolandProjects\Go_
go run ./cmd/server
```

健康检查：

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080/healthz
```

## 3. 演示账号

系统会在 `SEED_DEMO=true` 时自动写入演示账号：

- 管理员：`admin_demo / 123456`
- 企业：`enterprise_demo / 123456`
- 茶农：`farmer_demo / 123456`
- 监管方：`regulator_demo / 123456`
- 消费者：`consumer_demo / 123456`

建议毕业设计现场优先按以下顺序演示：

1. 茶农 / 企业注册
2. 管理员审核通过
3. 企业录入批次与品质评估
4. 监管方审核批次
5. 消费者匿名扫码查询
6. 消费者登录后查看收藏与反馈

## 4. 核心接口调用顺序

建议按以下顺序联调：

1. `POST /api/v1/auth/register`
2. `GET /api/v1/auth/registration-status`
3. `POST /api/v1/auth/login`
4. `GET /api/v1/auth/me`
5. `POST /api/v1/trace/batches`
6. `POST /api/v1/trace/batches/:id/stages`
7. `POST /api/v1/quality/evaluations`
8. `POST /api/v1/trace/batches/:id/audits`
9. `GET /api/v1/public/traces/:code`

## 5. 一条完整的演示流程

### 5.1 注册与审核

1. 用茶农、企业或消费者角色注册账号
2. 用管理员账号登录
3. 在注册审核页通过该申请

### 5.2 业务端

1. 用企业账号登录企业门户
2. 在批次管理页新建一个茶叶批次
3. 进入批次详情页补录阶段记录
4. 进入品质评估页录入外形、色泽、香气、滋味分值
5. 进入监管方门户，提交批次审核

### 5.3 消费者端

1. 打开公开查询页
2. 扫描页面二维码，或输入同一批次的溯源码
3. 查看该批次的基础信息、公开溯源路径和最新品质等级
4. 用消费者账号登录消费者中心，查看查询历史、收藏和反馈

## 5.3 当前前端展示特点

- 使用 `Ant Design` 构建后台页面
- 使用 `@ant-design/plots` 展示统计分析图和品质雷达图
- 公开查询页展示真实二维码
- 菜单会按管理员、企业、茶农、监管方、消费者角色自动变化

## 6. 前端启动步骤

```powershell
cd D:\GolandProjects\Go_\frontend
npm install
npm run dev
```

浏览器访问：

- 后台前端：`http://127.0.0.1:3000`
- 公开查询页：`http://127.0.0.1:3000/public-query`

如果需要让手机扫码直接打开公开查询页，建议在 `frontend/.env` 中增加：

```env
VITE_PUBLIC_QUERY_BASE_URL=http://你的电脑局域网IP:3000
```

例如：

```env
VITE_PUBLIC_QUERY_BASE_URL=http://192.168.1.20:3000
```

这样二维码编码的就是可被手机访问的局域网地址，而不是仅本机可用的 `127.0.0.1`。

## 7. 前端联调接口说明

### 登录页

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/register`
- `GET /api/v1/auth/registration-status`

### 管理员门户

- `GET /api/v1/admin/users`
- `GET /api/v1/admin/registrations`
- `POST /api/v1/admin/registrations/:id/approve`
- `POST /api/v1/admin/registrations/:id/reject`

### 批次列表页

- `GET /api/v1/trace/batches`
- `POST /api/v1/trace/batches`

### 批次详情页

- `GET /api/v1/trace/batches/:id`
- `GET /api/v1/trace/batches/:id/audits`
- `POST /api/v1/trace/batches/:id/stages`

### 监管审核页

- `GET /api/v1/trace/batches`
- `GET /api/v1/trace/batches/:id`
- `GET /api/v1/trace/batches/:id/audits`
- `POST /api/v1/trace/batches/:id/audits`

### 品质评估录入页

- `POST /api/v1/quality/evaluations`
- `GET /api/v1/quality/batches/:batchID/latest`

### 统计分析页

- `GET /api/v1/stats/overview`
- `GET /api/v1/stats/production-distribution`
- `GET /api/v1/stats/grade-distribution`
- `GET /api/v1/stats/metric-trends`

### 消费者公开查询页

- `GET /api/v1/public/traces/:code`

### 消费者中心

- `POST /api/v1/consumer/favorites`
- `GET /api/v1/consumer/favorites`
- `POST /api/v1/consumer/feedback`
- `GET /api/v1/consumer/history`
- `POST /api/v1/consumer/history`
