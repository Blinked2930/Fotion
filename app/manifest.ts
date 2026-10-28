import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Fotion',
    short_name: 'Fotion',
    description: 'Lightning-fast task triage.',
    display: 'standalone',
    // Matches the Sanctuary palette so the initial PWA paint (before the
    // client-side ThemeColorSync runs) is never jarring, and so installed
    // PWAs that ignore dynamic theme-color updates still show a coherent
    // cream color rather than a hardcoded near-black.
    background_color: '#f6f2ea',
    theme_color: '#f6f2ea',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}