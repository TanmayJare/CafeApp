# Kill all node processes
Write-Host "Stopping all Node.js processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

Write-Host "All servers stopped. Please start them manually:" -ForegroundColor Green
Write-Host "1. Terminal 1: cd apps/api; pnpm run start:dev" -ForegroundColor Cyan
Write-Host "2. Terminal 2: cd apps/customer-web; pnpm run dev" -ForegroundColor Cyan
Write-Host "3. Terminal 3: cd apps/staff-web; pnpm run dev" -ForegroundColor Cyan

# Made with Bob
