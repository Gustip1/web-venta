import { existsSync, readFileSync } from 'node:fs';

// Next.js no pisa variables que ya existen, aunque estén vacías. Si en Vercel
// quedaron cargadas sin valor, se completan con las del .env.local del repo.
if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && match[1] !== 'NODE_ENV' && match[2] && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
}

// Si tampoco hay .env.local (Vercel no siempre lo incluye en el build), se usan
// estos. Son valores públicos: igual viajan al navegador de cada visitante.
const publicDefaults = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://ssgojvhhbhzbnjhyasoi.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzZ29qdmhoYmh6Ym5qaHlhc29pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwMjYzNjYsImV4cCI6MjEwNTYwMjM2Nn0.H-Hp4J51rcoOqX9XY_SE6lfA3Zk762chKH5-WkXhuyk',
};
for (const [key, value] of Object.entries(publicDefaults)) {
  if (!process.env[key]) process.env[key] = value;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // afip solo corre en Linux (Vercel). Excluido del bundle de webpack.
  serverExternalPackages: ['soap', 'node-forge'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        'soap',
        'node-forge',
      ];
    }
    return config;
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb'
    }
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [390, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Fotos del feed de Instagram
      { protocol: 'https', hostname: '**.cdninstagram.com' },
      { protocol: 'https', hostname: '**.fbcdn.net' }
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  compress: true,
  poweredByHeader: false,
  swcMinify: true,
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://apis.google.com https://connect.facebook.net",
              "style-src 'self' 'unsafe-inline' https://accounts.google.com https://fonts.googleapis.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com https://dolarapi.com",
              "frame-src https://accounts.google.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              // En local el server es http: forzar https rompe CSS/JS (Safari lo aplica incluso en localhost)
              ...(process.env.NODE_ENV === 'production' ? ['upgrade-insecure-requests'] : [])
            ].join('; ')
          }
        ]
      }
    ];
  }
};

export default nextConfig;



