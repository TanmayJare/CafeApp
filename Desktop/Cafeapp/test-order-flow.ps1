# Test Order Flow Script
Write-Host "=== CafeConnect Order Flow Test ===" -ForegroundColor Cyan

# Step 1: Customer Login
Write-Host "`n1. Customer Login..." -ForegroundColor Yellow
$loginResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/send-otp" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body '{"email":"customer@test.com"}'
Write-Host "✓ OTP sent" -ForegroundColor Green

$verifyResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/verify-otp" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body '{"email":"customer@test.com","code":"123456"}'
$authData = $verifyResponse.Content | ConvertFrom-Json
$token = $authData.accessToken
Write-Host "✓ Customer logged in" -ForegroundColor Green
Write-Host "Token: $($token.Substring(0,20))..." -ForegroundColor Gray

# Step 2: Get Menu Items
Write-Host "`n2. Fetching menu items..." -ForegroundColor Yellow
$menuResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/menu/items" `
    -Headers @{"Authorization"="Bearer $token"}
$menuItems = $menuResponse.Content | ConvertFrom-Json
$firstItem = $menuItems[0]
Write-Host "✓ Found $($menuItems.Count) menu items" -ForegroundColor Green
Write-Host "First item: $($firstItem.name) - ₹$($firstItem.price)" -ForegroundColor Gray

# Step 3: Add to Cart
Write-Host "`n3. Adding item to cart..." -ForegroundColor Yellow
$cartBody = @{
    menuItemId = $firstItem.id
    quantity = 2
    customizations = "Extra sugar"
} | ConvertTo-Json

$cartResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/cart" `
    -Method POST `
    -Headers @{
        "Authorization"="Bearer $token"
        "Content-Type"="application/json"
    } `
    -Body $cartBody
Write-Host "✓ Item added to cart" -ForegroundColor Green

# Step 4: Get or Create Address
Write-Host "`n4. Setting up delivery address..." -ForegroundColor Yellow
$addressBody = @{
    label = "Home"
    street = "123 Test Street"
    area = "Test Area"
    city = "Test City"
    state = "Test State"
    pincode = "123456"
    latitude = 12.9716
    longitude = 77.5946
} | ConvertTo-Json

try {
    $addressResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/addresses" `
        -Method POST `
        -Headers @{
            "Authorization"="Bearer $token"
            "Content-Type"="application/json"
        } `
        -Body $addressBody
    $address = $addressResponse.Content | ConvertFrom-Json
    Write-Host "✓ Address created" -ForegroundColor Green
} catch {
    # Address might already exist, get existing addresses
    $addressesResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/addresses" `
        -Headers @{"Authorization"="Bearer $token"}
    $addresses = $addressesResponse.Content | ConvertFrom-Json
    $address = $addresses[0]
    Write-Host "✓ Using existing address" -ForegroundColor Green
}

# Step 5: Place Order
Write-Host "`n5. Placing order..." -ForegroundColor Yellow
$orderBody = @{
    addressId = $address.id
    customerPhone = "+919876543210"
    specialInstructions = "Please ring the doorbell"
} | ConvertTo-Json

$orderResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/orders" `
    -Method POST `
    -Headers @{
        "Authorization"="Bearer $token"
        "Content-Type"="application/json"
    } `
    -Body $orderBody
$order = $orderResponse.Content | ConvertFrom-Json
Write-Host "✓ Order placed successfully!" -ForegroundColor Green
Write-Host "Order Number: $($order.orderNumber)" -ForegroundColor Cyan
Write-Host "Total Amount: ₹$($order.totalAmount)" -ForegroundColor Cyan
Write-Host "Status: $($order.status)" -ForegroundColor Cyan

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan
Write-Host "Check the Staff Web Orders Dashboard at http://localhost:3001/orders" -ForegroundColor Yellow
Write-Host "The order should appear in real-time via WebSocket" -ForegroundColor Yellow

# Made with Bob
