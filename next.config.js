/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // i18n de base — extensible
  i18n: {
    locales: ['fr', 'en', 'es', 'de'],
    defaultLocale: 'fr',
    localeDetection: true,
  },
  images: {
    domains: ['openstreetmap.org', 'tile.openstreetmap.org'],
  },
  webpack: (config) => {
    // Fix Leaflet avec Next.js (SSR)
    config.resolve.fallback = { ...config.resolve.fallback, fs: false }
    return config
  },
  // Variables publiques exposées au client — toutes optionnelles
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    NEXT_PUBLIC_MAP_PROVIDER: 'leaflet', // Toujours Leaflet — gratuit
    NEXT_PUBLIC_STRIPE_MODE: process.env.STRIPE_SECRET_KEY ? 'live' : 'simulation',
  },
}
module.exports = nextConfig
