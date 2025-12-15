'use server'

import {
  saveSubscription,
  deleteSubscription,
  serializeSubscription,
  broadcastNotification as libBroadcastNotification
} from '@/lib/push-notifications'

// Configure VAPID details with proper error handling
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.warn(
    '⚠️ VAPID keys not configured. Web push notifications will not work.\n' +
    'Please set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables.\n' +
    'You can generate them using: npm install -g web-push && web-push generate-vapid-keys'
  )
}

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
  subscription: PushSubscription | unknown,
  userId?: string
): Promise<SubscribeUserResult> {
  try {
    const serializedSub = serializeSubscription(subscription as unknown as PushSubscription)

    if (!serializedSub) {
      return {
        success: false,
        error: 'Invalid subscription format',
      }
    }

    await saveSubscription(serializedSub, userId)

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
    if (userId) {
      await deleteSubscription(userId)
    } else if (endpoint) {
      await deleteSubscription(endpoint)
    } else {
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
  if (!userAddress || userAddress.toLowerCase() !== ALLOWED_NOTIFICATION_ADDRESS.toLowerCase()) {
    return {
      success: false,
      error: 'Unauthorized: Only the specified address can send notifications',
    }
  }

  try {
    if (userId) {
      // TODO: Implement direct messaging if needed. 
      // Current lib implementation focuses on broadcast or Key retrieval.
      // We'd need to expose a "getSubscription" method in lib to support this fully if we want to bypass broadcast.
      // For now, let's treat single user notification as "not implemented" or implement getSubscription in lib?
      // Actually, we can just broadcast or throw error?
      // Let's implement broadcast for now since that's the main use case.
      return { success: false, error: "Direct messaging not fully implemented in this refactor yet." }
    } else {
      await libBroadcastNotification(title, message)
    }

    return { success: true }
  } catch (error) {
    console.error('Error sending push notification:', error)

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
  if (!userAddress || userAddress.toLowerCase() !== ALLOWED_NOTIFICATION_ADDRESS.toLowerCase()) {
    return {
      success: false,
      error: 'Unauthorized: Only the specified address can send notifications',
    }
  }

  try {
    await libBroadcastNotification(title, message)
    return { success: true }
  } catch (error) {
    console.error('Error sending push notifications:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send notifications',
    }
  }
}


