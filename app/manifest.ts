import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Fotion',
    short_name: 'Fotion',
    description: 'Lightning-fast task triage.',
    start_url: '/',
    display: 'standalone', /* THIS IS CRITICAL for the native app feel */
    background_color: '#ffffff',
    theme_color: '#37352f',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      // Note: You will eventually want to drop a 192x192 and 512x512 png icon into your public folder!
    ],
  }
}