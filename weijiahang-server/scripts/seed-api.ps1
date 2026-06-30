# 种子数据脚本 — 通过 Admin API
$ErrorActionPreference = "Stop"

# Login
$csrf = (Invoke-RestMethod "http://localhost:3001/api/v1/auth/csrf-token").data.token
$login = Invoke-RestMethod -Method POST -Uri "http://localhost:3001/api/v1/admin/login" `
  -Headers @{"x-csrf-token"=$csrf} -ContentType "application/json" `
  -Body '{"username":"admin","password":"admin123"}'
$token = $login.data.accessToken
$headers = @{"Authorization"="Bearer $token"; "x-csrf-token"=$csrf}

# Get market IDs
Write-Output "Getting market IDs..."
$mkResp = Invoke-RestMethod "http://localhost:3001/api/v1/markets" -Headers $headers
$mids = @($mkResp.data | ForEach-Object { $_.id })
Write-Output "Found $($mids.Count) markets"

# Create 15 beacons
Write-Output "Creating beacons..."
for ($i = 0; $i -lt 15; $i++) {
  $mid = $mids[$i % $mids.Count]
  $suffix = [string](Get-Random -Minimum 1000 -Maximum 9999)
  $uid = "BLE-" + ($i + 1).ToString("000") + "-" + $suffix
  $body = @{
    marketId = $mid
    beaconUid = $uid
    floor = ($i % 3) + 1
    xPx = (Get-Random -Minimum 0 -Maximum 800)
    yPx = (Get-Random -Minimum 0 -Maximum 600)
    txPower = -59
    batteryLevel = (Get-Random -Minimum 60 -Maximum 100)
    status = if ($i -lt 12) { 1 } else { 0 }
  } | ConvertTo-Json
  try {
    Invoke-RestMethod -Method POST -Uri "http://localhost:3001/api/v1/admin/beacons" `
      -Headers $headers -ContentType "application/json" -Body $body | Out-Null
    Write-Output "  Beacon $($i+1)/15 OK"
  } catch {
    Write-Output "  Beacon $($i+1)/15 FAIL: $_"
  }
}

# Create system configs
Write-Output "Creating system configs..."
$configs = @{
  platformName = "为家航"
  minNavigatorIncome = "39"
  maxNavigatorDistance = "5"
  commissionRate = "20"
  enableRegistration = "true"
  enableAutoDispatch = "true"
  maintenanceMode = "false"
  autoCancelMinutes = "30"
  fatigueHours = "4"
  restRewardAmount = "5"
  maxDailyOrders = "20"
} | ConvertTo-Json
try {
  Invoke-RestMethod -Method PUT -Uri "http://localhost:3001/api/v1/admin/system-config" `
    -Headers $headers -ContentType "application/json" -Body $configs | Out-Null
  Write-Output "  11 system configs OK"
} catch {
  Write-Output "  System configs FAIL: $_"
}

# Create ads
Write-Output "Creating ads..."
$shopResp = Invoke-RestMethod "http://localhost:3001/api/v1/shops" -Headers $headers
$shopIds = @($shopResp.data | ForEach-Object { $_.id })
if ($shopIds.Count -eq 0) {
  Write-Output "  No shops available for ads, skipping"
} else {
  $adData = @(
    @{shopId=$shopIds[0]; adType="cpc"; adPosition="home_banner"; budget=5000; dailyBudget=500; cpcBid=2.5; startDate="2026-06-01"; endDate="2026-07-31"; status=1},
    @{shopId=$shopIds[1 % $shopIds.Count]; adType="cpm"; adPosition="shop_list_top"; budget=3000; dailyBudget=300; cpcBid=1.5; startDate="2026-06-15"; endDate="2026-07-15"; status=1},
    @{shopId=$shopIds[2 % $shopIds.Count]; adType="cpc"; adPosition="category_sidebar"; budget=2000; dailyBudget=200; cpcBid=3.0; startDate="2026-06-20"; endDate="2026-08-20"; status=1}
  )
  foreach ($ad in $adData) {
    $body = $ad | ConvertTo-Json
    try {
      Invoke-RestMethod -Method POST -Uri "http://localhost:3001/api/v1/admin/ads" `
        -Headers $headers -ContentType "application/json" -Body $body | Out-Null
      Write-Output "  Ad OK: $($ad.adPosition)"
    } catch {
      Write-Output "  Ad FAIL: $_"
    }
  }
}

# Verify
Write-Output "`nVerification:"
$m = Invoke-RestMethod "http://localhost:3001/api/v1/markets" -Headers $headers
Write-Output "  Markets: $($m.data.Count)"
$b = Invoke-RestMethod "http://localhost:3001/api/v1/admin/beacons" -Headers $headers
Write-Output "  Beacons: $($b.data.items.Count)"
$c = Invoke-RestMethod "http://localhost:3001/api/v1/admin/coupons" -Headers $headers
Write-Output "  Coupons: $($c.data.items.Count)"
$s = Invoke-RestMethod "http://localhost:3001/api/v1/admin/system-config" -Headers $headers
Write-Output "  SystemConfig: $($s.data | ConvertTo-PSObject | Get-Member -Type NoteProperty | Measure-Object | ForEach-Object Count) keys"

Write-Output "`nSeed data complete!"
