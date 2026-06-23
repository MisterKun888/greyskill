/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // ==================== MULTILINGUE ====================
  i18n: {
    locales: [
      'fr', 'en', 'es', 'de', 'it', 'pt', 'ru', 'zh',
      'ja', 'ar', 'ko', 'vi', 'tr', 'ms', 'id', 'fil',
      'km', 'hi', 'ta', 'pt-BR'
    ],
    defaultLocale: 'fr',
    localeDetection: true, // Détection automatique par navigateur
  },

  // ==================== SEO IMAGES ====================
  images: {
    domains: ['greyskill.net', 'greyskill.app', 'storage.googleapis.com', 'res.cloudinary.com'],
    formats: ['image/avif', 'image/webp'], // WebP auto pour Core Web Vitals
    deviceSizes: [640, 750, 828, 1080, 1200],
  },

  // ==================== HEADERS SEO ====================
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },

  // ==================== REDIRECTIONS ====================
  async redirects() {
    return [
      // Anciennes URLs → nouvelles
      { source: '/seniors', destination: '/pour-les-seniors', permanent: true },
      { source: '/clients', destination: '/pour-les-clients', permanent: true },
      // HTTP → HTTPS géré par Vercel automatiquement
    ]
  },

  // ==================== REWRITES SEO PROGRAMMATIQUE ====================
  async rewrites() {
    return [
      // Pattern : /[locale]/[categorie]/[ville]
      // Ex: /fr/plomberie/paris → page dynamique avec SEO
      {
        source: '/:locale/:categorie/:ville',
        destination: '/metier/:locale/:categorie/:ville',
      },
    ]
  },

  // ==================== WEBPACK ====================
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname),
    }
    return config
  },

  // Stripe webhook nécessite body brut
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },
}

module.exports = nextConfig
