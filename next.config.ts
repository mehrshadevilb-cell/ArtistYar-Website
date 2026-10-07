import type { NextConfig } from "next";

const longCache = {
  key: "Cache-Control",
  value: "public, max-age=2592000, stale-while-revalidate=86400",
} as const;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  // Avoid source-map generation memory pressure on small build agents
  productionBrowserSourceMaps: false,
  // Smaller deploy + faster cold start on Render
  output: "standalone",
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.instagram.com" },
      { protocol: "https", hostname: "**.cdninstagram.com" },
      { protocol: "https", hostname: "trustseal.enamad.ir" },
    ],
  },
  async redirects() {
    return [
      {
        source: "/amoozesh-mix-mastering",
        destination: "/amoozesh-tanzim-mix-mastering",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://cdn.kavenegar.com https://www.googletagmanager.com https://www.google-analytics.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.supabase.co https://*.instagram.com https://*.cdninstagram.com https://www.google-analytics.com https://www.googletagmanager.com https://trustseal.enamad.ir",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://www.google-analytics.com https://www.googletagmanager.com https://cdn.kavenegar.com https://*.onrender.com https://artistyaar.ir wss://*.supabase.co",
              "media-src 'self' blob: data: https://*.supabase.co",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/artistyar-studio-hero.webp",
        headers: [longCache],
      },
      {
        source: "/instagram-covers/:path*",
        headers: [longCache],
      },
      {
        source: "/separator/:path*",
        headers: [longCache],
      },
      {
        source: "/llms.txt",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600" }],
      },
      {
        source: "/43325481.txt",
        headers: [
          { key: "Content-Type", value: "text/plain; charset=utf-8" },
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
    ];
  },
};

export default nextConfig;
