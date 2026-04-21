# 太平猴魁茶叶溯源与品质辅助评估系统后端 MVP 设计

## 1. 目标与范围

本阶段聚焦毕业设计可演示、可写论文、可继续扩展的后端最小闭环，采用 `Go + Gin + GORM + MySQL` 实现以下能力：

- 溯源信息从批次到阶段记录的链式管理
- 基于固定规则和权重的品质辅助评估
- 基于 RBAC 的角色权限控制
- 面向前端图表的统计接口输出
- 面向消费者的公开溯源查询

本阶段暂不投入前端页面建设，优先保证接口、数据结构、权限边界和演示数据完整。

## 2. 系统模块划分

### 2.1 用户与权限模块

- 用户登录、获取当前用户信息
- 角色管理采用固定角色种子数据
- 角色包括：`farmer`、`enterprise`、`regulator`、`consumer`
- 通过 JWT 携带用户 ID 和角色列表

### 2.2 溯源管理模块

- 茶叶批次基本信息管理
- 溯源阶段记录管理
- 支持按批次码、溯源码、产品编号进行查询
- 使用阶段序号 `sequence` 保证链式展示顺序

### 2.3 品质辅助评估模块

- 录入品质指标：外形、色泽、香气、滋味
- 按权重计算总分
- 自动输出等级与结构化指标数据
- 为后续前端雷达图直接提供数据源

### 2.4 审核监管模块

- 监管方对批次或阶段进行审核
- 记录审核动作、结果、意见、审核时间
- 支持形成“待审核 / 已通过 / 已驳回”的监管状态

### 2.5 数据统计分析模块

- 产量分布统计
- 品质等级占比统计
- 品质指标趋势统计
- 输出结构化 JSON，前端后续直接对接图表库

## 3. 数据库表设计

## 3.1 `users` 用户表

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigint | 主键 |
| username | varchar(64) | 登录账号，唯一 |
| password_hash | varchar(255) | 密码哈希 |
| display_name | varchar(128) | 展示名称 |
| organization | varchar(128) | 所属主体 |
| status | varchar(32) | 用户状态 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

## 3.2 `roles` 角色表

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigint | 主键 |
| code | varchar(32) | 角色编码，唯一 |
| name | varchar(64) | 角色名称 |
| description | varchar(255) | 角色说明 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

## 3.3 `user_roles` 用户角色关联表

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| user_id | bigint | 用户 ID |
| role_id | bigint | 角色 ID |
| created_at | datetime | 关联创建时间 |

复合主键：`(user_id, role_id)`

## 3.4 `tea_batches` 茶叶批次表

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigint | 主键 |
| batch_code | varchar(64) | 批次码，唯一 |
| trace_code | varchar(64) | 溯源码，唯一 |
| product_code | varchar(64) | 产品编号 |
| tea_name | varchar(128) | 茶叶名称 |
| tea_type | varchar(64) | 茶类 |
| origin | varchar(128) | 产地 |
| farm_name | varchar(128) | 种植主体 |
| enterprise_name | varchar(128) | 企业主体 |
| quantity_kg | decimal | 批次重量 |
| harvest_date | datetime | 采摘日期 |
| packaging_date | datetime | 包装日期 |
| status | varchar(32) | 批次业务状态 |
| audit_status | varchar(32) | 审核状态 |
| latest_grade | varchar(32) | 最新品质等级 |
| public_visible | tinyint | 是否对消费者公开 |
| notes | text | 备注 |
| created_by | bigint | 创建人 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

## 3.5 `trace_stage_records` 溯源阶段记录表

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigint | 主键 |
| batch_id | bigint | 所属批次 |
| stage | varchar(32) | 阶段类型：种植/采摘/加工/包装/流通 |
| sequence | int | 阶段顺序 |
| title | varchar(128) | 阶段标题 |
| description | text | 阶段描述 |
| location | varchar(255) | 地点 |
| operator_id | bigint | 操作人 ID |
| operator_name | varchar(128) | 操作人名称 |
| operator_role | varchar(32) | 操作人角色 |
| occurred_at | datetime | 阶段发生时间 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

## 3.6 `quality_evaluations` 品质评估表

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigint | 主键 |
| batch_id | bigint | 所属批次 |
| evaluator_id | bigint | 评估人 |
| rule_version | varchar(32) | 规则版本 |
| total_score | decimal | 综合得分 |
| grade | varchar(32) | 等级 |
| summary | text | 分析结论 |
| evaluated_at | datetime | 评估时间 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

## 3.7 `quality_metric_details` 品质指标明细表

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigint | 主键 |
| evaluation_id | bigint | 所属评估 |
| metric_name | varchar(32) | 指标名称 |
| raw_score | decimal | 原始分值 |
| weight | decimal | 权重 |
| weighted_score | decimal | 加权分值 |
| comment | varchar(255) | 说明 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

## 3.8 `audit_records` 审核记录表

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigint | 主键 |
| batch_id | bigint | 所属批次 |
| stage_record_id | bigint | 关联阶段记录，可空 |
| reviewer_id | bigint | 审核人 |
| reviewer_name | varchar(128) | 审核人名称 |
| action | varchar(64) | 审核动作 |
| status | varchar(32) | 审核结果 |
| comment | text | 审核意见 |
| reviewed_at | datetime | 审核时间 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

## 4. 角色权限设计

| 角色 | 说明 | 核心权限 |
| --- | --- | --- |
| farmer | 茶农 | 录入批次、录入种植/采摘信息、查看本人或业务相关批次 |
| enterprise | 企业 | 维护加工/包装/流通信息、发起品质评估、查看统计数据 |
| regulator | 监管方 | 查看全部数据、执行审核、查看统计数据 |
| consumer | 消费者 | 仅查询公开溯源信息 |

本阶段采用后端接口级权限控制，不做复杂菜单权限。

## 5. REST API 草案

统一前缀：`/api/v1`

### 5.1 认证与用户

- `POST /auth/login` 登录
- `GET /auth/me` 获取当前用户信息

### 5.2 溯源管理

- `GET /trace/batches` 批次列表
- `POST /trace/batches` 新增批次
- `GET /trace/batches/:id` 查询批次详情
- `PUT /trace/batches/:id` 修改批次
- `POST /trace/batches/:id/stages` 新增阶段记录
- `PUT /trace/stages/:id` 修改阶段记录
- `DELETE /trace/stages/:id` 删除阶段记录
- `GET /trace/batches/:id/audits` 查询审核记录
- `POST /trace/batches/:id/audits` 新增审核记录

### 5.3 品质评估

- `POST /quality/evaluations` 新增品质评估
- `GET /quality/evaluations/:id` 查询评估详情
- `GET /quality/batches/:batchID/latest` 查询某批次最新评估

### 5.4 统计分析

- `GET /stats/overview` 概览统计
- `GET /stats/production-distribution` 产量分布
- `GET /stats/grade-distribution` 品质等级占比
- `GET /stats/metric-trends` 指标趋势

### 5.5 消费者公开查询

- `GET /public/traces/:code` 按溯源码/批次码/产品编号查询公开溯源

## 6. 品质评分规则设计

本系统采用规则固定、便于答辩解释的加权评分方式。

### 6.1 指标与权重

| 指标 | 权重 |
| --- | --- |
| 外形 appearance | 0.30 |
| 色泽 color | 0.20 |
| 香气 aroma | 0.25 |
| 滋味 taste | 0.25 |

总分计算公式：

`综合得分 = Σ(单项得分 × 权重)`

单项得分采用 0 到 100 的百分制。

### 6.2 等级判定

| 分值区间 | 等级 |
| --- | --- |
| >= 90 | 特级 |
| >= 80 且 < 90 | 一级 |
| >= 70 且 < 80 | 二级 |
| < 70 | 待改进 |

### 6.3 输出结构

评估接口返回：

- 总分
- 等级
- 指标明细
- 雷达图数据数组

雷达图数据格式建议：

```json
[
  { "metric_name": "appearance", "score": 92, "weight": 0.3 },
  { "metric_name": "color", "score": 88, "weight": 0.2 }
]
```

## 7. MVP 实施顺序

### 第一阶段

- 设计文档
- 基础骨架
- 数据库连接
- 统一响应
- JWT 登录

### 第二阶段

- 批次管理
- 阶段记录管理
- 品质评估与评分
- 公开查询

### 第三阶段

- 审核监管
- 统计接口
- 演示种子数据
- 前端联调建议

