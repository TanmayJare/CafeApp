# CafeConnect - Debugging Guide

## 🐛 Current Issues

### Issue: Socket.IO WebSocket Connection Errors (Staff Web)

**Symptoms:**
```
[browser] Socket.IO connection error: Error: websocket error
```

**Status**: ⚠️ Intermittent - Connections are successful but errors appear

**Analysis:**

1. **Terminal Logs Show Success:**
   ```
   [Nest] Client connected: jx4aWInnOS0UEeWBAAAG (User: cmqnwjr6z0000tc4ziokgquxk, Role: STAFF)
   [Nest] Client jx4aWInnOS0UEeWBAAAG joined staff room
   ```

2. **Configuration:**
   - Gateway CORS: ✅ Configured for localhost:3001, localhost:3002
   - Namespace: ✅ `/orders`
   - Transport: ✅ `['websocket', 'polling']`
   - Auth: ✅ JWT token passed in handshake

3. **Possible Causes:**
   - Browser console errors (need to check)
   - Event name mismatch between client/server
   - Token refresh issues
   - Network/firewall intermittent blocking

**Event Name Mismatch Found:**

**Server (orders.gateway.ts):**
- Emits: `new-order`, `order-status-update`

**Client (staff-web orders/page.tsx):**
- Listens: `order:new`, `order:status`

❌ **MISMATCH DETECTED!**

---

## 🔧 Fixes to Apply

### Fix 1: Align Socket.IO Event Names

**Option A: Update Client to Match Server**
Change in `apps/staff-web/src/app/(staff)/orders/page.tsx`:
```typescript
// Line 89: Change from 'order:new' to 'new-order'
newSocket.on('new-order', (order: Order) => {
  console.log('🔔 New order received:', order);
  setOrders((prev) => [order, ...prev]);
  // ...
});

// Line 103: Change from 'order:status' to 'order-status-update'
newSocket.on('order-status-update', (data: { orderId: string; status: Order['status'] }) => {
  console.log('📦 Order status updated:', data);
  setOrders((prev) =>
    prev.map((order) =>
      order.id === data.orderId ? { ...order, status: data.status } : order
    )
  );
});
```

**Option B: Update Server to Match Client**
Change in `apps/api/src/modules/orders/orders.service.ts`:
```typescript
// Change emit event names to match client expectations
this.ordersGateway.server.to('staff').emit('order:new', order);
this.ordersGateway.server.to(`order:${orderId}`).emit('order:status', { orderId, status });
```

**Recommendation**: Update client (Option A) to match server conventions.

---

## 🔍 Debugging Steps

### Step 1: Check Browser Console
1. Open staff-web in browser: http://localhost:3001
2. Open DevTools (F12)
3. Go to Console tab
4. Look for Socket.IO connection logs
5. Check for any error messages

### Step 2: Check Network Tab
1. Open DevTools Network tab
2. Filter by "WS" (WebSocket)
3. Look for Socket.IO connection attempts
4. Check if WebSocket upgrade is successful
5. Monitor for disconnections

### Step 3: Verify Token
1. Check localStorage for `auth-storage`
2. Verify `accessToken` is present
3. Decode JWT at https://jwt.io
4. Check expiry (should be 7 days)

### Step 4: Test Socket.IO Connection
```javascript
// Run in browser console
const socket = io('http://localhost:3000/orders', {
  auth: { token: localStorage.getItem('auth-storage')?.accessToken },
  transports: ['websocket', 'polling'],
});

socket.on('connect', () => console.log('✅ Connected'));
socket.on('connect_error', (err) => console.error('❌ Error:', err));
```

---

## 🧪 Testing Checklist

### Socket.IO Connection Test
- [ ] Staff web connects successfully
- [ ] Customer web connects successfully
- [ ] Staff joins staff room
- [ ] Customer joins order room
- [ ] No connection errors in console
- [ ] WebSocket upgrade successful

### Real-time Events Test
- [ ] New order appears in staff dashboard
- [ ] Order status updates in real-time
- [ ] Customer sees status updates
- [ ] Browser notifications work (staff)
- [ ] Multiple clients receive updates

### Error Handling Test
- [ ] Invalid token rejected
- [ ] Expired token handled
- [ ] Disconnection handled gracefully
- [ ] Reconnection works
- [ ] Error messages are clear

---

## 📊 Socket.IO Event Reference

### Server Events (Emitted by Backend)

| Event | Emitted To | Payload | Description |
|-------|-----------|---------|-------------|
| `new-order` | `staff` room | `Order` object | New order placed by customer |
| `order-status-update` | `order:{orderId}` room | `{ orderId, status }` | Order status changed |

### Client Events (Sent by Frontend)

| Event | Sent By | Payload | Description |
|-------|---------|---------|-------------|
| `join-order` | Customer | `orderId` | Join specific order room |
| `leave-order` | Customer | `orderId` | Leave specific order room |

### Connection Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `connect` | Server → Client | Connection established |
| `disconnect` | Server → Client | Connection closed |
| `connect_error` | Server → Client | Connection failed |

---

## 🔐 Authentication Flow

### Socket.IO JWT Authentication

1. **Client Side:**
   ```typescript
   const socket = io('http://localhost:3000/orders', {
     auth: { token: accessToken },
     transports: ['websocket', 'polling'],
   });
   ```

2. **Server Side (Gateway):**
   ```typescript
   async handleConnection(client: AuthenticatedSocket) {
     const token = client.handshake.auth.token;
     const payload = await this.jwtService.verifyAsync(token);
     client.userId = payload.sub;
     client.userRole = payload.role;
     // Join rooms based on role
   }
   ```

3. **Token Validation:**
   - Token extracted from `handshake.auth.token`
   - JWT verified using `jwtService.verifyAsync()`
   - User ID and role attached to socket
   - Invalid tokens result in disconnection

---

## 🚨 Common Issues & Solutions

### Issue: "No token" Error
**Cause**: Token not passed in handshake  
**Solution**: Ensure `accessToken` is available before connecting
```typescript
if (accessToken) {
  const socket = io('...', { auth: { token: accessToken } });
}
```

### Issue: "Authentication failed" Error
**Cause**: Invalid or expired JWT  
**Solution**: Re-login to get fresh token

### Issue: Events Not Received
**Cause**: Event name mismatch  
**Solution**: Verify event names match between client and server

### Issue: Multiple Connections
**Cause**: useEffect running multiple times  
**Solution**: Add cleanup function and dependency array
```typescript
useEffect(() => {
  const socket = io('...');
  return () => socket.close();
}, [accessToken]);
```

### Issue: CORS Error
**Cause**: Origin not allowed  
**Solution**: Add origin to CORS config in gateway
```typescript
@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3001', 'http://localhost:3002'],
    credentials: true,
  },
})
```

---

## 📝 Logging Best Practices

### Backend Logging
```typescript
this.logger.log(`Client connected: ${client.id}`);
this.logger.warn(`Connection rejected: No token`);
this.logger.error(`Authentication failed:`, error.message);
```

### Frontend Logging
```typescript
console.log('✅ Socket.IO connected');
console.error('❌ Socket.IO connection error:', error);
console.log('🔔 New order received:', order);
console.log('📦 Order status updated:', data);
```

---

## 🔄 Server Restart Procedure

When debugging Socket.IO issues:

1. **Kill all Node processes:**
   ```powershell
   .\restart-servers.ps1
   ```

2. **Restart API:**
   ```powershell
   cd apps/api
   pnpm run start:dev
   ```

3. **Restart frontends:**
   ```powershell
   # Terminal 2
   cd apps/customer-web
   pnpm run dev

   # Terminal 3
   cd apps/staff-web
   pnpm run dev
   ```

4. **Clear browser cache:**
   - Hard refresh: Ctrl+Shift+R
   - Clear localStorage
   - Close and reopen browser

---

## 🎯 Next Steps

1. ✅ Fix event name mismatch (Priority: HIGH)
2. ⏳ Test real-time order flow end-to-end
3. ⏳ Add error boundaries for Socket.IO failures
4. ⏳ Implement reconnection logic with exponential backoff
5. ⏳ Add Socket.IO connection status indicator in UI
6. ⏳ Monitor Socket.IO performance and connection stability

---

## 📚 Resources

- Socket.IO Docs: https://socket.io/docs/v4/
- NestJS WebSockets: https://docs.nestjs.com/websockets/gateways
- JWT Authentication: https://jwt.io/introduction
- Browser DevTools: https://developer.chrome.com/docs/devtools/

---

**Last Updated**: 2026-06-25  
**Status**: Event name mismatch identified, fix pending