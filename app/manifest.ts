import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Jukebox',
    short_name: 'Jukebox',
    description: 'On-chain music. Tip artists directly. AI-powered playlists.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/splash.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    categories: ['music', 'entertainment'],
    screenshots: [
      {
        src: '/screenshot.png',
        sizes: '1280x720',
        type: 'image/png',
      },
      {
        src: '/screenshot-2.png',
        sizes: '1280x720',
        type: 'image/png',
      },
    ],
  }
}

