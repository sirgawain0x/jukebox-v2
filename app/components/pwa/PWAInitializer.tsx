'use client'

import { useEffect } from 'react'
import { useMiniKit } from '@coinbase/onchainkit/minikit'
import { sdk } from '@farcaster/miniapp-sdk'

/**
 * PWA Initializer - Only registers service worker when NOT in miniapp context
 * This ensures PWA features don't interfere with miniapp functionality
 */
export function PWAInitializer() {
  const { context } = useMiniKit()

  useEffect(() => {
    // Don't register service worker if we're in a miniapp context
    const registerServiceWorker = async () => {
      try {
        // Check if we're in a miniapp using Farcaster SDK
        const isInMiniApp = await sdk.isInMiniApp().catch(() => false)
        
        // Also check MiniKit context
        const isMiniKitContext = context?.client?.clientFid !== undefined
        
        // If we're in either miniapp context, skip service worker registration
        if (isInMiniApp || isMiniKitContext) {
          console.log('Skipping PWA service worker registration - running in miniapp context')
          return
        }

        // Check if service workers are supported
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
            updateViaCache: 'none',
          })

          console.log('Service Worker registered:', registration.scope)

          // Check for updates periodically
          setInterval(() => {
            registration.update()
          }, 60 * 60 * 1000) // Check every hour
        }
      } catch (error) {
        console.error('Service Worker registration failed:', error)
      }
    }

    registerServiceWorker()
  }, [context])

  return null // This component doesn't render anything
}

