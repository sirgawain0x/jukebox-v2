'use client'

import { useState, useEffect } from 'react'
import { useMiniKit } from '@coinbase/onchainkit/minikit'
import { sdk } from '@farcaster/miniapp-sdk'
import { Button } from '../ui/Button'

// Type for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Install Prompt - Shows PWA install button when not in miniapp
 */
export function InstallPrompt() {
  const { context } = useMiniKit()
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isInMiniApp, setIsInMiniApp] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // Check if we're in a miniapp
    const checkMiniApp = async () => {
      try {
        const inMiniApp = await sdk.isInMiniApp().catch(() => false)
        const isMiniKitContext = context?.client?.clientFid !== undefined
        setIsInMiniApp(inMiniApp || isMiniKitContext)
      } catch {
        setIsInMiniApp(false)
      }
    }

    checkMiniApp()

    // Check if already installed
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches)

    // Detect iOS
    setIsIOS(
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream
    )

    // Listen for beforeinstallprompt event (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [context])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      console.log(`User response to install prompt: ${outcome}`)
      setDeferredPrompt(null)
      setShowPrompt(false)
    }
  }

  // Don't show if in miniapp, already installed, or no prompt available
  if (isInMiniApp || isStandalone || (!showPrompt && !isIOS)) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">Install Jukebox</h3>
          {isIOS ? (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Tap the share button{' '}
              <span role="img" aria-label="share icon">⎋</span> and then &quot;Add to Home Screen&quot;
              <span role="img" aria-label="plus icon"> ➕</span>
            </p>
          ) : (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Install Jukebox for a better experience
            </p>
          )}
        </div>
        {!isIOS && deferredPrompt && (
          <Button
            size="sm"
            onClick={handleInstallClick}
            className="text-xs"
          >
            Install
          </Button>
        )}
      </div>
    </div>
  )
}

