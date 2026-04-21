# 接口冒烟测试说明

## 1. 自动化脚本

已提供 PowerShell 冒烟脚本：

```powershell
cd D:\GolandProjects\Go_
.\scripts\smoke-demo.ps1
```

脚本默认会依次验证：

- 用户登录
- 获取当前用户信息
- 创建茶叶批次
- 新增溯源阶段记录
- 创建品质评估
- 查询最新品质评估
- 查询统计概览
- 消费者公开查询溯源信息

## 2. 脚本输出示例

```json
{
  "login_user": "enterprise_demo",
  "me_roles": ["enterprise"],
  "created_batch_id": 3,
  "created_batch_code": "HKSMOKE-20260402220001",
  "created_trace_code": "TRACE-HKSMOKE-20260402220001",
  "stage_id": 11,
  "evaluation_id": 3,
  "latest_grade": "特级",
  "overview_total_batches": 3,
  "public_batch_code": "HKSMOKE-20260402220001",
  "public_trace_path_count": 1
}
```

## 3. 手工调试建议

若使用 Apifox、Postman 或前端页面手工演示，建议先登录并保存 `Bearer Token`，再按以下顺序调试：

1. 登录拿 token
2. 创建批次拿 `batch_id`
3. 为该 `batch_id` 增加阶段记录
4. 为该 `batch_id` 新增品质评估
5. 查询该批次最新品质评估
6. 查统计接口
7. 用该批次溯源码走公开查询接口

