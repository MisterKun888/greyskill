/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  i18n: {
    locales: ['fr', 'en', 'es', 'de'],
    defaultLocale: 'fr',
  },
  images: {
    domains: ['openstreetmap.org', 'tile.openstreetmap.org'],
  },
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false }
    return config
  },
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    NEXT_PUBLIC_MAP_PROVIDER: 'leaflet',
    NEXT_PUBLIC_STRIPE_MODE: process.env.STRIPE_SECRET_KEY ? 'live' : 'simulation',
  },
}
module.exports = nextConfig
