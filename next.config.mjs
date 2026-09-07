/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: "standalone",
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
  images: {
    // Serve R2/CDN URLs as-is — uploads are already compressed client-side.
    // Disables Vercel Image Optimization (/_next/image) billing & CPU.
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 320, 384, 400],
    remotePatterns: [
      // Demo images (HiyoRi default S3)
      {
        protocol: "https",
        hostname: "hiyori-backpack.s3.us-west-2.amazonaws.com",
      },
      // Your S3 bucket when configured in .env.local
      ...(process.env.NEXT_PUBLIC_S3_BUCKET &&
      process.env.NEXT_PUBLIC_S3_BUCKET !== "placeholder"
        ? [
            {
              protocol: "https",
              hostname: `${process.env.NEXT_PUBLIC_S3_BUCKET}.s3.${process.env.NEXT_PUBLIC_S3_REGION || "ap-south-1"}.amazonaws.com`,
            },
          ]
        : []),
      ...(process.env.NEXT_PUBLIC_SUPABASE_URL
        ? [
            {
              protocol: "https",
              hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
      ...(process.env.NEXT_PUBLIC_CDN_URL
        ? [
            {
              protocol: "https",
              hostname: new URL(process.env.NEXT_PUBLIC_CDN_URL).hostname,
            },
          ]
        : []),
      // Cloudflare Images resize via media-proxy Worker
      {
        protocol: "https",
        hostname: "sakthi-textile-media-proxy.stsareess.workers.dev",
      },
      ...(process.env.NEXT_PUBLIC_MEDIA_CDN_ORIGIN
        ? [
            {
              protocol: "https",
              hostname: new URL(process.env.NEXT_PUBLIC_MEDIA_CDN_ORIGIN)
                .hostname,
            },
          ]
        : []),
      // Shop saree model photography (shared public storage)
      {
        protocol: "https",
        hostname: "qhtwwyqlsnckorndmhmt.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "source.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "https",
        hostname: "vumbnail.com",
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["@aws-sdk/client-s3", "sharp"],
    // Always refetch dynamic routes (e.g. admin dashboard) when navigating
    // back to them, instead of replaying the stale client Router Cache.
    staleTimes: {
      dynamic: 0,
      static: 180,
    },
  },
}

export default nextConfig
