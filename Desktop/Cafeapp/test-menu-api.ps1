# Test Menu API Endpoints
Write-Host "=== Testing CafeConnect Menu API ===" -ForegroundColor Cyan
Write-Host ""

# Base URL
$baseUrl = "http://localhost:3000/api"

# Test 1: Get all categories (Public)
Write-Host "1. Testing GET /menu/categories (Public)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/menu/categories" -Method GET
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    $categories = $response.Content | ConvertFrom-Json
    Write-Host "Found $($categories.Count) categories" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Get all menu items (Public)
Write-Host "2. Testing GET /menu/items (Public)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/menu/items" -Method GET
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    $items = $response.Content | ConvertFrom-Json
    Write-Host "Found $($items.Count) menu items" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Get daily specials (Public)
Write-Host "3. Testing GET /menu/daily-specials (Public)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/menu/daily-specials" -Method GET
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Send OTP to staff
Write-Host "4. Testing POST /auth/send-otp (Staff)" -ForegroundColor Yellow
try {
    $body = @{
        email = "staff@cafe.test"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/auth/send-otp" -Method POST -Headers @{"Content-Type"="application/json"} -Body $body
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 5: Verify OTP and get JWT token
Write-Host "5. Testing POST /auth/verify-otp (Staff)" -ForegroundColor Yellow
try {
    $body = @{
        email = "staff@cafe.test"
        otp = "123456"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/auth/verify-otp" -Method POST -Headers @{"Content-Type"="application/json"} -Body $body
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    $authResponse = $response.Content | ConvertFrom-Json
    $token = $authResponse.access_token
    Write-Host "Token received: $($token.Substring(0, 20))..." -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 6: Create a new category (Staff only - requires auth)
Write-Host "6. Testing POST /menu/categories (Staff - Authenticated)" -ForegroundColor Yellow
try {
    $body = @{
        name = "Test Category"
        description = "A test category created via API"
        displayOrder = 99
    } | ConvertTo-Json
    
    $headers = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $token"
    }
    
    $response = Invoke-WebRequest -Uri "$baseUrl/menu/categories" -Method POST -Headers $headers -Body $body
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    $newCategory = $response.Content | ConvertFrom-Json
    $categoryId = $newCategory.id
    Write-Host "Created category with ID: $categoryId" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 7: Create a new menu item (Staff only - requires auth)
Write-Host "7. Testing POST /menu/items (Staff - Authenticated)" -ForegroundColor Yellow
try {
    $body = @{
        name = "Test Coffee"
        description = "A delicious test coffee"
        price = 4.99
        categoryId = $categoryId
        isAvailable = $true
        preparationTime = 5
        options = @(
            @{
                name = "Size"
                type = "SINGLE_CHOICE"
                required = $true
                choices = @(
                    @{ name = "Small"; priceModifier = 0.0 }
                    @{ name = "Medium"; priceModifier = 0.5 }
                    @{ name = "Large"; priceModifier = 1.0 }
                )
            }
        )
    } | ConvertTo-Json -Depth 10
    
    $headers = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $token"
    }
    
    $response = Invoke-WebRequest -Uri "$baseUrl/menu/items" -Method POST -Headers $headers -Body $body
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    $newItem = $response.Content | ConvertFrom-Json
    Write-Host "Created menu item with ID: $($newItem.id)" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 8: Try to create category without auth (should fail)
Write-Host "8. Testing POST /menu/categories (No Auth - Should Fail)" -ForegroundColor Yellow
try {
    $body = @{
        name = "Unauthorized Category"
        description = "This should fail"
        displayOrder = 100
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/menu/categories" -Method POST -Headers @{"Content-Type"="application/json"} -Body $body
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Red
    Write-Host "ERROR: Should have been rejected!" -ForegroundColor Red
} catch {
    Write-Host "Correctly rejected: $($_.Exception.Response.StatusCode)" -ForegroundColor Green
}
Write-Host ""

Write-Host "=== All Tests Complete ===" -ForegroundColor Cyan

# Made with Bob
