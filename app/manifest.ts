import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Fotion',
    short_name: 'Fotion',
    description: 'Lightning-fast task triage.',
    display: 'standalone',
    // Must match viewport.themeColor in app/layout.tsx so installed PWAs on
    // iOS (which reads the manifest for the status bar when standalone) get
    // the same colors as browser tabs. Previously this said #191919 for both
    // modes, which is why the status bar was permanently near-black no
    // matter what theme or section you were in.
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