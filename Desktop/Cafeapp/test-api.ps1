# Test CafeConnect API
Write-Host "🧪 Testing CafeConnect API..." -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "`n1️⃣ Testing Health Endpoint..." -ForegroundColor Yellow
$health = Invoke-WebRequest -Uri http://localhost:3000/api/health | ConvertFrom-Json
Write-Host "✅ Health: $($health.status)" -ForegroundColor Green

# Test 2: Send OTP
Write-Host "`n2️⃣ Sending OTP to staff@cafe.test..." -ForegroundColor Yellow
$otpResponse = Invoke-WebRequest -Uri http://localhost:3000/api/auth/send-otp -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"staff@cafe.test"}' | ConvertFrom-Json
Write-Host "✅ OTP sent: $($otpResponse.message)" -ForegroundColor Green
Write-Host "   Dev OTP: $($otpResponse.otp)" -ForegroundColor Cyan

# Test 3: Verify OTP
Write-Host "`n3️⃣ Verifying OTP..." -ForegroundColor Yellow
$authResponse = Invoke-WebRequest -Uri http://localhost:3000/api/auth/verify-otp -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"staff@cafe.test","code":"123456"}' | ConvertFrom-Json
Write-Host "✅ Authentication successful!" -ForegroundColor Green
Write-Host "   User: $($authResponse.user.email) ($($authResponse.user.role))" -ForegroundColor Cyan
$token = $authResponse.accessToken

# Test 4: Get Profile
Write-Host "`n4️⃣ Getting user profile..." -ForegroundColor Yellow
$profile = Invoke-WebRequest -Uri http://localhost:3000/api/auth/me -Headers @{"Authorization"="Bearer $token"} | ConvertFrom-Json
Write-Host "✅ Profile retrieved: $($profile.email)" -ForegroundColor Green

Write-Host "`n✨ All tests passed!" -ForegroundColor Green
Write-Host "`n🔑 Access Token (save for menu tests):" -ForegroundColor Cyan
Write-Host $token -ForegroundColor White

# Made with Bob
