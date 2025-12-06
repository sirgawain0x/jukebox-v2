'use client'

import { useState, useEffect } from 'react'
import { useMiniKit } from '@coinbase/onchainkit/minikit'
import { sdk } from '@farcaster/miniapp-sdk'
import { useAccount } from 'wagmi'
import { Button } from '../ui/Button'
import { subscribeUser, unsubscribeUser, sendNotification } from '@/app/actions'
import { getFarcasterWalletAddress } from '@/app/utils/farcaster-context'

// Allowed address that can send notifications
const ALLOWED_NOTIFICATION_ADDRESS = '0xc3118549B9bCd7Ed6672Ea2A5a3B26FfbE735F67'

/**
 * Helper function to convert VAPID public key from base64 URL to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

interface PushNotificationManagerProps {
  showUI?: boolean
  className?: string
}

/**
 * Push Notification Manager - Handles push notification subscription
 * Only activates when NOT in miniapp context
 */
export function PushNotificationManager({ 
  showUI = true,
  className = '' 
}: PushNotificationManagerProps) {
  const { context } = useMiniKit()
  // Get address from wagmi (works with OnchainKitProvider)
  const { address: wagmiAddress } = useAccount()
  // Get address from Farcaster context as fallback
  const farcasterAddress = getFarcasterWalletAddress()
  // Use wagmi address first, fallback to Farcaster address
  const address = wagmiAddress || (farcasterAddress as `0x${string}` | undefined)
  const [isSupported, setIsSupported] = useState(false)
  const [isInMiniApp, setIsInMiniApp] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<string>('')

  useEffect(() => {
    const checkSupport = async () => {
      // Check if we're in a miniapp
      let inMiniApp = false
      try {
        const sdkCheck = await sdk.isInMiniApp().catch(() => false)
        const isMiniKitContext = context?.client?.clientFid !== undefined
        inMiniApp = sdkCheck || isMiniKitContext
        setIsInMiniApp(inMiniApp)
      } catch {
        setIsInMiniApp(false)
      }

      // Check browser support
      const supported = 
        'serviceWorker' in navigator && 
        'PushManager' in window &&
        'Notification' in window

      setIsSupported(supported)

      // Use local inMiniApp variable instead of state (which hasn't updated yet)
      if (supported && !inMiniApp) {
        // Check current permission
        if ('Notification' in window) {
          setPermission(Notification.permission)
        }

        // Check for existing subscription
        try {
          const registration = await navigator.serviceWorker.ready
          const sub = await registration.pushManager.getSubscription()
          setSubscription(sub)
        } catch (error) {
          console.error('Error checking subscription:', error)
        }
      }
    }

    checkSupport()
  }, [context])

  const handleSubscribe = async () => {
    if (!isSupported || isInMiniApp) {
      setStatus('Push notifications not supported in this context')
      return
    }

    setIsLoading(true)
    setStatus('')

    try {
      // Request notification permission
      if (Notification.permission === 'default') {
        const permissionResult = await Notification.requestPermission()
        setPermission(permissionResult)

        if (permissionResult !== 'granted') {
          setStatus('Notification permission denied')
          setIsLoading(false)
          return
        }
      }

      if (Notification.permission !== 'granted') {
        setStatus('Notification permission is required')
        setIsLoading(false)
        return
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready

      // Get VAPID public key from environment
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) {
        setStatus('VAPID public key not configured')
        setIsLoading(false)
        return
      }

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })

      // Serialize subscription for server
      const p256dhKey = subscription.getKey('p256dh')
      const authKey = subscription.getKey('auth')

      if (!p256dhKey || !authKey) {
        setStatus('Failed to get subscription keys')
        setIsLoading(false)
        return
      }

      const serializedSub = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(
            String.fromCharCode(...new Uint8Array(p256dhKey))
          ),
          auth: btoa(
            String.fromCharCode(...new Uint8Array(authKey))
          ),
        },
      }

      const result = await subscribeUser(serializedSub)

      if (result.success) {
        setSubscription(subscription)
        setStatus('Successfully subscribed to push notifications!')
      } else {
        setStatus(result.error || 'Failed to subscribe')
        await subscription.unsubscribe()
      }
    } catch (error) {
      console.error('Error subscribing to push notifications:', error)
      setStatus(
        error instanceof Error
          ? error.message
          : 'Failed to subscribe to push notifications'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnsubscribe = async () => {
    if (!subscription) return

    setIsLoading(true)
    setStatus('')

    try {
      await subscription.unsubscribe()
      // Pass the endpoint to identify which subscription to remove
      const result = await unsubscribeUser(undefined, subscription.endpoint)

      if (!result.success) {
        setStatus(result.error || 'Failed to unsubscribe')
        return
      }

      setSubscription(null)
      setStatus('Successfully unsubscribed from push notifications')
    } catch (error) {
      console.error('Error unsubscribing:', error)
      setStatus(
        error instanceof Error
          ? error.message
          : 'Failed to unsubscribe from push notifications'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendTest = async () => {
    if (!subscription || !message.trim()) {
      setStatus('Please enter a message')
      return
    }

    if (!address) {
      setStatus('Please connect your wallet to send notifications')
      return
    }

    setIsLoading(true)
    setStatus('')

    try {
      const result = await sendNotification(message.trim(), undefined, 'Jukebox', address)
      if (result.success) {
        setStatus('Test notification sent!')
        setMessage('')
      } else {
        setStatus(result.error || 'Failed to send notification')
      }
    } catch (error) {
      console.error('Error sending test notification:', error)
      setStatus('Failed to send test notification')
    } finally {
      setIsLoading(false)
    }
  }

  // Don't show anything if in miniapp or not supported
  if (isInMiniApp || !isSupported) {
    return null
  }

  // If showUI is false, just handle subscription silently
  if (!showUI) {
    return null
  }

  return (
    <div className={`p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <h3 className="text-lg font-semibold mb-3">Push Notifications</h3>

      {status && (
        <div
          className={`mb-3 p-2 rounded text-sm ${
            status.includes('Success')
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : status.includes('Failed') || status.includes('denied')
              ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
              : 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
          }`}
        >
          {status}
        </div>
      )}

      {subscription ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            You are subscribed to push notifications.
          </p>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnsubscribe}
              disabled={isLoading}
            >
              Unsubscribe
            </Button>
          </div>

          {address && address.toLowerCase() === ALLOWED_NOTIFICATION_ADDRESS.toLowerCase() && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-medium mb-2">
                Send Test Notification
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter notification message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isLoading) {
                      handleSendTest()
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm"
                />
                <Button
                  size="sm"
                  onClick={handleSendTest}
                  disabled={isLoading || !message.trim()}
                >
                  Send
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {permission === 'denied'
              ? 'Notification permission was denied. Please enable it in your browser settings.'
              : 'Get notified about new music, predictions, and updates.'}
          </p>

          <Button
            onClick={handleSubscribe}
            disabled={isLoading || permission === 'denied'}
            size="sm"
          >
            {isLoading ? 'Subscribing...' : 'Subscribe to Notifications'}
          </Button>
        </div>
      )}
    </div>
  )
}

