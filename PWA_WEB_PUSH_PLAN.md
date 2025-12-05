# Web Push Notification Integration Plan

## Overview
This document outlines the strategy for integrating web push notifications into the Jukebox PWA while maintaining compatibility with the miniapp environment.

## Architecture

### Components
1. **Service Worker** (`public/sw.js`) - Handles push events and displays notifications
2. **Server Actions** (`app/actions.ts`) - Manages subscriptions and sends notifications
3. **Client Components** - UI for subscription management
4. **Database Storage** - Persist subscriptions (to be implemented)

## Implementation Steps

### Phase 1: Setup & Configuration

#### 1.1 Install Dependencies
```bash
npm install web-push
npm install --save-dev @types/web-push  # If using TypeScript
```

#### 1.2 Generate VAPID Keys
```bash
npx web-push generate-vapid-keys
```

This will output:
- Public Key: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- Private Key: `VAPID_PRIVATE_KEY`

#### 1.3 Environment Variables
Add to `.env.local`:
```env
# VAPID Configuration
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_SUBJECT=mailto:your-email@example.com
```

### Phase 2: Database Schema (Optional but Recommended)

#### 2.1 Subscription Storage
Create a database table/model to store push subscriptions:

```typescript
// Example schema (adapt to your database)
interface PushSubscription {
  id: string
  userId?: string  // Optional: link to user account
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  createdAt: Date
  updatedAt: Date
  userAgent?: string
  isActive: boolean
}
```

#### 2.2 Database Operations
- `createSubscription()` - Store new subscription
- `getSubscription(userId)` - Retrieve user's subscription
- `deleteSubscription(userId)` - Remove subscription
- `getAllActiveSubscriptions()` - For broadcast notifications

### Phase 3: Client-Side Implementation

#### 3.1 Create Push Notification Manager Component
**File**: `app/components/pwa/PushNotificationManager.tsx`

Features:
- Check browser support for push notifications
- Request notification permission
- Subscribe/unsubscribe to push notifications
- Display subscription status
- Only activate when NOT in miniapp context

Key functions:
```typescript
- checkNotificationSupport()
- requestNotificationPermission()
- subscribeToPush()
- unsubscribeFromPush()
- getSubscriptionStatus()
```

#### 3.2 Integration Points
- Add to main page (`app/page.tsx`) conditionally
- Show only when not in miniapp
- Provide user-friendly UI for managing notifications

### Phase 4: Server-Side Implementation

#### 4.1 Update Server Actions
**File**: `app/actions.ts`

Uncomment and enhance:
- `subscribeUser()` - Store subscription in database
- `unsubscribeUser()` - Remove from database
- `sendNotification()` - Send to specific user
- `sendNotificationToAll()` - Broadcast to all users

#### 4.2 Notification Triggers
Identify when to send notifications:
- New song releases
- Prediction market updates
- User mentions/interactions
- System announcements
- Custom user preferences

#### 4.3 API Routes (Optional)
Create dedicated API routes for:
- `/api/push/subscribe` - Handle subscription
- `/api/push/unsubscribe` - Handle unsubscription
- `/api/push/send` - Admin endpoint to send notifications

### Phase 5: Service Worker Enhancement

#### 5.1 Update `public/sw.js`
Already includes push event handler, but may need:
- Better notification formatting
- Action buttons in notifications
- Deep linking to specific app sections
- Notification grouping

#### 5.2 Notification Click Handling
Enhance `notificationclick` event:
```javascript
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  const urlToOpen = event.notification.data?.url || '/'
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus()
          }
        }
        // Open new window if app not open
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      })
  )
})
```

### Phase 6: User Experience

#### 6.1 Permission Request Flow
1. **Timing**: Request permission after user shows engagement
2. **Context**: Explain why notifications are useful
3. **Graceful Decline**: Handle rejection gracefully
4. **Re-engagement**: Allow users to enable later

#### 6.2 Notification Preferences
Create settings page for:
- Enable/disable notifications
- Notification types (song updates, predictions, etc.)
- Quiet hours
- Frequency controls

#### 6.3 UI Components
- Notification permission prompt
- Settings toggle
- Notification history (optional)
- Test notification button (for development)

### Phase 7: Testing Strategy

#### 7.1 Local Testing
- Use HTTPS (required for push notifications)
  ```bash
  next dev --experimental-https
  ```
- Test on multiple browsers (Chrome, Firefox, Safari)
- Test on mobile devices
- Test permission flows

#### 7.2 Test Cases
- [ ] Subscribe successfully
- [ ] Unsubscribe successfully
- [ ] Receive notification
- [ ] Click notification opens correct page
- [ ] Works in standalone PWA mode
- [ ] Disabled in miniapp context
- [ ] Handles permission denial
- [ ] Handles expired subscriptions
- [ ] Handles network failures

### Phase 8: Production Considerations

#### 8.1 Security
- Validate subscription endpoints
- Rate limit notification sending
- Authenticate admin endpoints
- Sanitize notification content

#### 8.2 Performance
- Batch notifications when possible
- Queue notifications during high load
- Monitor subscription health
- Clean up expired subscriptions

#### 8.3 Monitoring
- Track subscription rates
- Monitor notification delivery success
- Log failures for debugging
- Alert on high failure rates

## Integration with Existing Features

### Miniapp Compatibility
- ✅ Service worker only registers outside miniapp
- ✅ Push manager checks miniapp context before activating
- ✅ No conflicts with Farcaster/Base App notifications

### Music Features
- Notify when favorite artists release new songs
- Notify when playlists are updated
- Notify about trending songs

### Prediction Market
- Notify when predictions close
- Notify when user wins a prediction
- Notify about market updates

## File Structure

```
app/
├── actions.ts                    # Server actions (push notification logic)
├── components/
│   └── pwa/
│       ├── PWAInitializer.tsx    # Service worker registration
│       ├── InstallPrompt.tsx    # PWA install prompt
│       └── PushNotificationManager.tsx  # NEW: Push notification UI
├── api/
│   └── push/                     # NEW: Optional API routes
│       ├── subscribe/route.ts
│       ├── unsubscribe/route.ts
│       └── send/route.ts
public/
└── sw.js                         # Service worker (already has push handler)
```

## Implementation Priority

### High Priority (MVP)
1. ✅ Service worker with push handler
2. ✅ Server actions structure
3. ⏳ Install web-push package
4. ⏳ Generate VAPID keys
5. ⏳ Create PushNotificationManager component
6. ⏳ Enable server actions

### Medium Priority (Enhanced UX)
1. Database storage for subscriptions
2. Notification preferences UI
3. Better notification formatting
4. Deep linking in notifications

### Low Priority (Advanced Features)
1. Notification history
2. Quiet hours
3. Notification grouping
4. Rich notifications with images
5. Action buttons in notifications

## Next Steps

1. **Install web-push**: `npm install web-push`
2. **Generate VAPID keys**: `npx web-push generate-vapid-keys`
3. **Add environment variables** to `.env.local`
4. **Create PushNotificationManager component**
5. **Uncomment and test server actions**
6. **Add to main page** (conditionally, outside miniapp)
7. **Test locally with HTTPS**
8. **Deploy and test in production**

## Resources

- [Web Push API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [web-push npm package](https://www.npmjs.com/package/web-push)
- [VAPID Specification](https://datatracker.ietf.org/doc/html/rfc8292)
- [Next.js PWA Guide](https://nextjs.org/docs/app/building-your-application/configuring/progressive-web-apps)

## Notes

- Push notifications require HTTPS (except localhost)
- iOS 16.4+ supports push notifications for PWAs
- Safari on macOS 13+ supports push notifications
- Service worker must be registered before subscribing
- Subscriptions expire and need renewal
- Handle subscription errors gracefully (expired, revoked, etc.)

