param(
  [string]$BaseUrl = "http://127.0.0.1:8080/api/v1"
)

$ErrorActionPreference = "Stop"

function Invoke-PostJson {
  param(
    [string]$Url,
    [hashtable]$Body,
    [string]$Token = ""
  )

  $headers = @{}
  if ($Token) {
    $headers["Authorization"] = "Bearer $Token"
  }

  Invoke-RestMethod -Method Post -Uri $Url -Headers $headers -ContentType "application/json; charset=utf-8" -Body ($Body | ConvertTo-Json -Depth 10)
}

function Invoke-GetJson {
  param(
    [string]$Url,
    [string]$Token = ""
  )

  $headers = @{}
  if ($Token) {
    $headers["Authorization"] = "Bearer $Token"
  }

  Invoke-RestMethod -Method Get -Uri $Url -Headers $headers
}

$login = Invoke-PostJson -Url "$BaseUrl/auth/login" -Body @{
  username = "enterprise_demo"
  password = "123456"
  role = "enterprise"
}

$token = $login.data.access_token
$me = Invoke-GetJson -Url "$BaseUrl/auth/me" -Token $token

$stamp = Get-Date -Format "yyyyMMddHHmmss"
$batchCode = "HKSMOKE-$stamp"
$traceCode = "TRACE-$batchCode"
$productCode = "PROD-$batchCode"

$batch = Invoke-PostJson -Url "$BaseUrl/trace/batches" -Token $token -Body @{
  batch_code = $batchCode
  trace_code = $traceCode
  product_code = $productCode
  tea_name = "Taiping Houkui"
  tea_type = "Green Tea"
  origin = "Huangshan, Anhui"
  farm_name = "Demo Tea Garden"
  enterprise_name = "Huangshan Tea Co"
  quantity_kg = 68.5
  harvest_date = (Get-Date).ToString("yyyy-MM-dd")
  packaging_date = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
  status = "processing"
  public_visible = $true
  notes = "Smoke test batch"
}

$batchID = $batch.data.id

$stage = Invoke-PostJson -Url "$BaseUrl/trace/batches/$batchID/stages" -Token $token -Body @{
  stage = "processing"
  sequence = 1
  title = "Smoke Demo Processing"
  description = "Completed processing stage for smoke test."
  location = "Demo Workshop"
  occurred_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:sszzz")
}

$evaluation = Invoke-PostJson -Url "$BaseUrl/quality/evaluations" -Token $token -Body @{
  batch_id = $batchID
  rule_version = "v1"
  summary = "Smoke test evaluation"
  metrics = @(
    @{ metric_name = "appearance"; score = 92; comment = "Good shape" }
    @{ metric_name = "color"; score = 88; comment = "Green color" }
    @{ metric_name = "aroma"; score = 91; comment = "Clean aroma" }
    @{ metric_name = "taste"; score = 90; comment = "Fresh taste" }
  )
}

$latest = Invoke-GetJson -Url "$BaseUrl/quality/batches/$batchID/latest" -Token $token
$stats = Invoke-GetJson -Url "$BaseUrl/stats/overview" -Token $token
$public = Invoke-GetJson -Url "$BaseUrl/public/traces/$traceCode"

[ordered]@{
  login_user = $login.data.user.username
  me_roles = $me.data.roles
  created_batch_id = $batchID
  created_batch_code = $batch.data.batch_code
  created_trace_code = $traceCode
  stage_id = $stage.data.id
  evaluation_id = $evaluation.data.evaluation.id
  latest_grade = $latest.data.evaluation.grade
  overview_total_batches = $stats.data.total_batches
  public_batch_code = $public.data.batch.batch_code
  public_trace_path_count = $public.data.trace_path.Count
} | ConvertTo-Json -Depth 10
