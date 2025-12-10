'use server'

import webpush from 'web-push'

// Configure VAPID details with proper error handling
// Note: Server actions only need the private key for sending notifications
// The public key is served via API endpoint to clients
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY // Server-side variable (no NEXT_PUBLIC_ prefix)
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || '<mailto:your-email@example.com>'

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.warn(
    '⚠️ VAPID keys not configured. Web push notifications will not work.\n' +
    'Please set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables.\n' +
    'You can generate them using: npm install -g web-push && web-push generate-vapid-keys'
  )
} else {
  try {
    webpush.setVapidDetails(
      VAPID_SUBJECT,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    )
  } catch (error) {
    console.error('Failed to configure VAPID details:', error)
  }
}

// In production, store subscriptions in a database
// For now, using in-memory storage (will be lost on server restart)
// Using a serialized format that web-push can work with
interface SerializedPushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

const subscriptions: Map<string, SerializedPushSubscription> = new Map()

export interface SubscribeUserResult {
  success: boolean
  error?: string
}

export interface UnsubscribeUserResult {
  success: boolean
  error?: string
}

export interface SendNotificationResult {
  success: boolean
  error?: string
}

/**
 * Subscribe a user to push notifications
 * @param subscription - Push subscription object from the client
 * @param userId - Optional user identifier for multi-user support
 */
export async function subscribeUser(
  subscription: PushSubscription | SerializedPushSubscription,
  userId?: string
): Promise<SubscribeUserResult> {
  try {
    // In production, store in database:
    // await db.pushSubscriptions.create({
    //   data: {
    //     userId: userId || 'anonymous',
    //     endpoint: subscription.endpoint,
    //     p256dh: subscription.keys.p256dh,
    //     auth: subscription.keys.auth,
    //     createdAt: new Date(),
    //   }
    // })

    // Ensure we have the serialized format
    let serializedSub: SerializedPushSubscription
    
    // Check if it's already serialized or needs conversion
    // PushSubscription has a getKey() method, SerializedPushSubscription has keys object with string values
    if ('getKey' in subscription && typeof subscription.getKey === 'function') {
      // Need to serialize from PushSubscription
      const pushSub = subscription as PushSubscription
      const p256dhKey = pushSub.getKey('p256dh')
      const authKey = pushSub.getKey('auth')
      
      if (!p256dhKey || !authKey) {
        return {
          success: false,
          error: 'Invalid subscription: missing keys',
        }
      }
      
      serializedSub = {
        endpoint: pushSub.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(p256dhKey))),
          auth: btoa(String.fromCharCode(...new Uint8Array(authKey))),
        },
      }
    } else if ('keys' in subscription && typeof subscription.keys === 'object' && 
               subscription.keys !== null && 
               'p256dh' in subscription.keys && 
               typeof subscription.keys.p256dh === 'string') {
      // Already serialized
      serializedSub = subscription as SerializedPushSubscription
    } else {
      return {
        success: false,
        error: 'Invalid subscription format',
      }
    }

    // Use userId if provided, otherwise use endpoint as unique identifier
    // Endpoint should always be available for valid subscriptions
    // If endpoint is missing, generate a unique key to prevent overwrites
    let key: string
    if (userId) {
      key = userId
    } else if (serializedSub.endpoint) {
      key = serializedSub.endpoint
    } else {
      // Fallback: generate unique key if endpoint is missing (shouldn't happen)
      key = `anonymous_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    }
    
    subscriptions.set(key, serializedSub)

    return { success: true }
  } catch (error) {
    console.error('Error subscribing user:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to subscribe',
    }
  }
}

/**
 * Unsubscribe a user from push notifications
 * @param userId - Optional user identifier
 * @param endpoint - Optional subscription endpoint to identify the subscription
 */
export async function unsubscribeUser(
  userId?: string,
  endpoint?: string
): Promise<UnsubscribeUserResult> {
  try {
    // In production, remove from database:
    // await db.pushSubscriptions.delete({
    //   where: { userId: userId || 'anonymous' }
    // })

    if (userId) {
      subscriptions.delete(userId)
    } else if (endpoint) {
      // Find and remove subscription by endpoint
      for (const [key, sub] of subscriptions.entries()) {
        if (sub.endpoint === endpoint) {
          subscriptions.delete(key)
          break
        }
      }
    } else {
      // If neither userId nor endpoint provided, we can't safely remove
      // In production, you'd want to track this better
      return {
        success: false,
        error: 'Cannot unsubscribe: userId or endpoint required',
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error unsubscribing user:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unsubscribe',
    }
  }
}

// Allowed address that can send notifications
// Load from environment variable for security
const ALLOWED_NOTIFICATION_ADDRESS = process.env.ALLOWED_NOTIFICATION_ADDRESS || '0xc3118549B9bCd7Ed6672Ea2A5a3B26FfbE735F67'

/**
 * Send a push notification to a specific user
 * @param message - Notification message
 * @param userId - Optional user identifier (if not provided, sends to all)
 * @param title - Optional notification title
 * @param userAddress - Required user wallet address for authorization check
 */
export async function sendNotification(
  message: string,
  userId: string | undefined,
  title: string = 'Jukebox',
  userAddress: string
): Promise<SendNotificationResult> {
  // Check if VAPID keys are configured
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return {
      success: false,
      error: 'Web push notifications not configured. VAPID keys are missing.',
    }
  }

  // Check if user is authorized to send notifications
  // Require address and verify it matches the allowed address
  if (!userAddress || userAddress.toLowerCase() !== ALLOWED_NOTIFICATION_ADDRESS.toLowerCase()) {
    return {
      success: false,
      error: 'Unauthorized: Only the specified address can send notifications',
    }
  }

  try {
    // If userId is provided, send to that specific user
    // Otherwise, send to all anonymous subscriptions
    if (userId) {
      const subscription = subscriptions.get(userId)
      if (!subscription) {
        return {
          success: false,
          error: 'No subscription found for user',
        }
      }

      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      }

      const payload = JSON.stringify({
        title,
        body: message,
        icon: '/icon.png',
        badge: '/icon.png',
      })

      await webpush.sendNotification(pushSubscription, payload)
    } else {
      // Send to all anonymous subscriptions (those without userId)
      // Filter to only subscriptions that don't have a userId key
      const anonymousSubscriptions = Array.from(subscriptions.entries())
        .filter(([key, sub]) => {
          // Check if key is an endpoint (anonymous) or a generated anonymous key
          return key === sub.endpoint || key.startsWith('anonymous_')
        })
        .map(([_, sub]) => sub)

      if (anonymousSubscriptions.length === 0) {
        return {
          success: false,
          error: 'No anonymous subscriptions available',
        }
      }

      const payload = JSON.stringify({
        title,
        body: message,
        icon: '/icon.png',
        badge: '/icon.png',
      })

      // Send to all anonymous subscriptions
      const results = await Promise.allSettled(
        anonymousSubscriptions.map((subscription) => {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth,
            },
          }
          return webpush.sendNotification(pushSubscription, payload)
        })
      )

      const failures = results.filter((r) => r.status === 'rejected')
      if (failures.length > 0) {
        console.error('Some notifications failed:', failures)
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error sending push notification:', error)
    
    // Handle expired/invalid subscriptions
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const statusCode = (error as { statusCode?: number }).statusCode
      if (statusCode === 410 || statusCode === 404) {
        // Subscription expired or not found, remove it
        if (userId) {
          subscriptions.delete(userId)
        } else {
          // For anonymous subscriptions, we can't easily identify which one failed
          // This is a limitation of the current implementation
          // In production, you'd want to track which subscription failed
        }
        return {
          success: false,
          error: 'Subscription expired. Please subscribe again.',
        }
      }
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send notification',
    }
  }
}

/**
 * Send push notification to all subscribed users
 * @param message - Notification message
 * @param title - Optional notification title
 * @param userAddress - Required user wallet address for authorization check
 */
export async function sendNotificationToAll(
  message: string,
  title: string = 'Jukebox',
  userAddress: string
): Promise<SendNotificationResult> {
  // Check if VAPID keys are configured
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return {
      success: false,
      error: 'Web push notifications not configured. VAPID keys are missing.',
    }
  }

  // Check if user is authorized to send notifications
  // Require address and verify it matches the allowed address
  if (!userAddress || userAddress.toLowerCase() !== ALLOWED_NOTIFICATION_ADDRESS.toLowerCase()) {
    return {
      success: false,
      error: 'Unauthorized: Only the specified address can send notifications',
    }
  }

  try {
    if (subscriptions.size === 0) {
      return {
        success: false,
        error: 'No subscriptions available',
      }
    }

    const payload = JSON.stringify({
      title,
      body: message,
      icon: '/icon.png',
      badge: '/icon.png',
    })

    const results = await Promise.allSettled(
      Array.from(subscriptions.values()).map((subscription) => {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
          },
        }
        return webpush.sendNotification(pushSubscription, payload)
      })
    )

    const failures = results.filter((r) => r.status === 'rejected')
    if (failures.length > 0) {
      console.error('Some notifications failed:', failures)
    }

    return { success: true }
  } catch (error) {
    console.error('Error sending push notifications:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send notifications',
    }
  }
}

