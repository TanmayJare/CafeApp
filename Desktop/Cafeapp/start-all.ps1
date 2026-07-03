# CafeConnect — Start All Servers (Network Exposed & Automatically Updated)
# Run from: C:\Users\tanma\Desktop\Cafeapp

$root = $PSScriptRoot

# Detect the local IP address
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.IPAddress -notlike '127.*' -and 
    $_.IPAddress -notlike '169.*' -and 
    $_.InterfaceAlias -notlike '*Loopback*' 
} | Select-Object -First 1).IPAddress

if (-not $ip) {
    $ip = "localhost"
}

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  CafeConnect Launcher  " -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "Detected Local IP: $ip" -ForegroundColor Yellow
Write-Host "Updating environment files..." -ForegroundColor Green

# 1. Update customer-web env
$customerWebEnv = @"
NEXT_PUBLIC_API_URL=http://${ip}:3000/api
NEXT_PUBLIC_WS_URL=http://${ip}:3000
"@
$customerWebEnv | Set-Content -Path "$root\apps\customer-web\.env.local" -Force

# 2. Update staff-web env
$staffWebEnv = @"
NEXT_PUBLIC_API_URL=http://${ip}:3000/api
NEXT_PUBLIC_WS_URL=http://${ip}:3000
"@
$staffWebEnv | Set-Content -Path "$root\apps\staff-web\.env.local" -Force

# 3. Update customer-mobile env
$customerMobileEnv = @"
EXPO_PUBLIC_API_URL=http://${ip}:3000/api
EXPO_PUBLIC_WS_URL=http://${ip}:3000
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_T530E8YMHm7vou
"@
$customerMobileEnv | Set-Content -Path "$root\apps\customer-mobile\.env.local" -Force

Write-Host "Environment files updated successfully!" -ForegroundColor Green
Write-Host "Starting processes in separate windows..." -ForegroundColor Green

# 1. API — port 3000
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\apps\api'; Write-Host '--- API (NestJS :3000) ---' -ForegroundColor Yellow; pnpm run start:dev"

Start-Sleep -Seconds 2

# 2. Staff Web — port 3001
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\apps\staff-web'; Write-Host '--- Staff Web (Next.js :3001) ---' -ForegroundColor Green; pnpm run dev"

# 3. Customer Web — port 3002
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\apps\customer-web'; Write-Host '--- Customer Web (Next.js :3002) ---' -ForegroundColor Magenta; pnpm run dev"

# 4. Customer Mobile — Expo
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\apps\customer-mobile'; Write-Host '--- Customer Mobile (Expo) ---' -ForegroundColor Cyan; pnpm run start"

Write-Host ""
Write-Host "======================================" -ForegroundColor DarkGray
Write-Host "  LOCAL (this machine)" -ForegroundColor White
Write-Host "    API             -> http://localhost:3000/api"
Write-Host "    Staff Panel     -> http://localhost:3001"
Write-Host "    Customer App    -> http://localhost:3002"
Write-Host "    Customer Mobile -> (Expo console)"
Write-Host ""
Write-Host "  NETWORK (other devices on Wi-Fi)" -ForegroundColor Cyan
Write-Host "    API             -> http://${ip}:3000/api"
Write-Host "    Staff Panel     -> http://${ip}:3001"
Write-Host "    Customer App    -> http://${ip}:3002"
Write-Host "======================================" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Credentials:" -ForegroundColor Yellow
Write-Host "  Staff  -> tanmayjare13@gmail.com / cafestaff2024"
Write-Host "  Customer -> any email, OTP to inbox"
Write-Host ""
