import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Fotion',
    short_name: 'Fotion',
    description: 'Lightning-fast task triage.',
    display: 'standalone',
    // These paint the PWA status bar and splash screen. They were #191919
    // (dark) even in light mode, which is why the installed app showed a
    // black status bar over the Sanctuary's cream background. Now they
    // match the task UI's --background so the seam disappears. The Sanctuary
    // overlay overrides this at runtime via data-sanctuary="open".
    background_color: '#ffffff',
    theme_color: '#ffffff',
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