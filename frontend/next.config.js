/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      {
        source: '/:all*(svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
  // Прокси: браузер ходит на свой домен, Next.js серверно проксирует на бэкенд.
  // Убирает кросс-доменные блокировки браузера. При переезде в РФ меняем
  // destination на https://api.cplbox.ru/api/v1/:path*
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'https://compliance-box-backend.onrender.com/api/v1/:path*',
      },
    ];
  },
}

module.exports = nextConfig