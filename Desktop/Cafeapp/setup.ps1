# CafeConnect Setup Script
Write-Host "🚀 Setting up CafeConnect..." -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "Creating .env file with default values..." -ForegroundColor Yellow
    
    $envContent = @"
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cafeconnect?schema=public"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-in-production-12345"
JWT_EXPIRES_IN="7d"

# Node Environment
NODE_ENV="development"

# API Configuration
PORT=3000

# Email Configuration (for OTP - optional in dev)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="noreply@cafeconnect.com"

# Razorpay (for payments - optional for now)
RAZORPAY_KEY_ID=""
RAZORPAY_KEY_SECRET=""
"@
    
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✅ .env file created" -ForegroundColor Green
} else {
    Write-Host "✅ .env file exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
pnpm install

Write-Host ""
Write-Host "🗄️ Setting up database..." -ForegroundColor Yellow
Write-Host "Generating Prisma Client..." -ForegroundColor Cyan
pnpm --filter @cafeconnect/database db:generate

Write-Host ""
Write-Host "Pushing database schema..." -ForegroundColor Cyan
pnpm --filter @cafeconnect/database db:push

Write-Host ""
Write-Host "Seeding database..." -ForegroundColor Cyan
pnpm --filter @cafeconnect/database db:seed

Write-Host ""
Write-Host "✨ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Test Credentials:" -ForegroundColor Cyan
Write-Host "  Staff: staff@cafe.test" -ForegroundColor White
Write-Host "  Rider: rider@cafe.test" -ForegroundColor White
Write-Host "  Admin: admin@cafe.test" -ForegroundColor White
Write-Host "  Customer: customer@test.com" -ForegroundColor White
Write-Host "  OTP (dev): 123456" -ForegroundColor White
Write-Host ""
Write-Host "🚀 To start the API server:" -ForegroundColor Cyan
Write-Host "  cd apps/api" -ForegroundColor White
Write-Host "  pnpm start:dev" -ForegroundColor White
Write-Host ""
Write-Host "🧪 To run tests:" -ForegroundColor Cyan
Write-Host "  .\test-api.ps1" -ForegroundColor White
Write-Host "  .\test-menu-api.ps1" -ForegroundColor White

# Made with Bob
