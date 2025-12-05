declare module 'web-push' {
  export interface PushSubscription {
    endpoint: string
    keys: {
      p256dh: string
      auth: string
    }
  }

  export interface VapidDetails {
    subject: string
    publicKey: string
    privateKey: string
  }

  export function setVapidDetails(
    subject: string,
    publicKey: string,
    privateKey: string
  ): void

  export function sendNotification(
    subscription: PushSubscription,
    payload: string | Buffer,
    options?: any
  ): Promise<void>

  export function generateVAPIDKeys(): {
    publicKey: string
    privateKey: string
  }
}

