# Mobile Testing Guide for CafeConnect

## Overview
This guide explains how to test the CafeConnect customer web app on your mobile device.

## Prerequisites
- Your mobile device and computer must be on the same WiFi network
- The development servers must be running

## Method 1: Local Network Access (Recommended)

### Step 1: Find Your Computer's IP Address

**On Windows:**
```powershell
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually starts with 192.168.x.x or 10.0.x.x)

**On Mac/Linux:**
```bash
ifconfig | grep "inet "
```

### Step 2: Update Next.js Configuration

Edit `apps/customer-web/package.json`:
```json
{
  "scripts": {
    "dev": "next dev -H 0.0.0.0"
  }
}
```

Or run directly:
```bash
cd apps/customer-web
pnpm run dev -- -H 0.0.0.0
```

### Step 3: Access from Mobile

Open your mobile browser and navigate to:
```
http://YOUR_COMPUTER_IP:3002
```

Example: `http://192.168.1.100:3002`

### Step 4: Update API URL

Create `apps/customer-web/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://YOUR_COMPUTER_IP:3000
```

Restart the dev server after creating this file.

---

## Method 2: Using ngrok (For Remote Testing)

### Step 1: Install ngrok
```bash
# Windows (using Chocolatey)
choco install ngrok

# Mac
brew install ngrok

# Or download from https://ngrok.com/download
```

### Step 2: Expose Your Servers

**Terminal 1 - Expose API:**
```bash
ngrok http 3000
```
Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

**Terminal 2 - Expose Customer Web:**
```bash
ngrok http 3002
```
Copy the HTTPS URL (e.g., `https://xyz789.ngrok.io`)

### Step 3: Update Environment Variables

Create `apps/customer-web/.env.local`:
```env
NEXT_PUBLIC_API_URL=https://abc123.ngrok.io
```

### Step 4: Access from Mobile

Open the customer web ngrok URL in your mobile browser:
```
https://xyz789.ngrok.io
```

---

## Method 3: Using Expo (For Native App - Future)

When you're ready to build a native mobile app:

### Step 1: Install Expo CLI
```bash
npm install -g expo-cli
```

### Step 2: Create Expo App
```bash
cd apps
npx create-expo-app customer-mobile
cd customer-mobile
```

### Step 3: Install Dependencies
```bash
npm install axios @react-navigation/native socket.io-client zustand
```

### Step 4: Run on Device
```bash
npx expo start
```

Scan the QR code with:
- **iOS**: Camera app
- **Android**: Expo Go app

---

## Testing Checklist

### Authentication
- [ ] Login with OTP (customer@test.com, OTP: 123456)
- [ ] Session persistence after refresh

### Home Page
- [ ] Search functionality
- [ ] Category filtering
- [ ] View daily specials
- [ ] Navigate to item details

### Menu Item Detail
- [ ] Select size (Regular/Large)
- [ ] Add add-ons (Extra shot, Oat milk, Sugar-free)
- [ ] Adjust quantity
- [ ] Add to cart

### Cart
- [ ] View cart items
- [ ] Update quantities
- [ ] Remove items
- [ ] View bill summary
- [ ] Proceed to checkout

### Checkout
- [ ] Select/add delivery address
- [ ] Add special instructions
- [ ] Place order

### Order Tracking
- [ ] View order status
- [ ] Real-time status updates
- [ ] View delivery address
- [ ] View order summary

---

## Troubleshooting

### Issue: Cannot connect to API
**Solution:**
1. Check firewall settings - allow ports 3000, 3001, 3002
2. Verify both devices are on same network
3. Try disabling Windows Firewall temporarily for testing

### Issue: CORS errors
**Solution:**
Update `apps/api/src/main.ts`:
```typescript
app.enableCors({
  origin: '*', // For development only
  credentials: true,
});
```

### Issue: Socket.IO not connecting
**Solution:**
1. Check if WebSocket port is open
2. Update Socket.IO connection URL in customer-web
3. Verify API is running and accessible

### Issue: Images not loading
**Solution:**
1. Use absolute URLs for images
2. Check network tab in browser dev tools
3. Verify image URLs are accessible

---

## Performance Tips

### For Better Mobile Experience:
1. **Enable Service Worker** (PWA)
2. **Optimize Images** - Use WebP format
3. **Lazy Load** - Load images on scroll
4. **Cache API Responses** - Use React Query or SWR
5. **Reduce Bundle Size** - Code splitting

### PWA Setup (Optional):
```bash
cd apps/customer-web
npm install next-pwa
```

Update `next.config.ts`:
```typescript
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});

module.exports = withPWA({
  // your next config
});
```

---

## Network Configuration

### Windows Firewall Rules:
```powershell
# Allow Node.js through firewall
netsh advfirewall firewall add rule name="Node.js" dir=in action=allow program="C:\Program Files\nodejs\node.exe" enable=yes

# Allow specific ports
netsh advfirewall firewall add rule name="CafeConnect API" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="CafeConnect Customer" dir=in action=allow protocol=TCP localport=3002
```

---

## Current URLs

### Development:
- **API**: http://localhost:3000/api
- **Customer Web**: http://localhost:3002
- **Staff Web**: http://localhost:3001

### Test Credentials:
- **Customer**: customer@test.com (OTP: 123456)
- **Staff**: staff@cafe.test (OTP: 123456)
- **Admin**: admin@cafe.test (OTP: 123456)

---

## Next Steps

1. **Test on Mobile** - Follow Method 1 or 2 above
2. **Fix Any Issues** - Check console logs on mobile
3. **Optimize Performance** - Use Lighthouse for mobile
4. **Build Native App** - Use React Native or Expo (Method 3)
5. **Deploy to Production** - Use Vercel, Netlify, or AWS

---

## Support

For issues or questions:
1. Check browser console for errors
2. Check API logs in terminal
3. Verify network connectivity
4. Review this guide's troubleshooting section