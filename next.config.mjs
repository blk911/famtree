/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["playwright", "playwright-core"],
  env: {
    NEXT_PUBLIC_ADMIN_TOOLS_FEATURES: "member-video-preview-v1",
  },
  async redirects() {
    return [
      { source: "/admin/studio", destination: "/admin/discovery", permanent: false },
      { source: "/vmb/dashboard", destination: "/vmb/today", permanent: false },
      { source: "/vmb/admin/templates", destination: "/admin/invites/offers", permanent: false },
      { source: "/admin/invites/templates", destination: "/admin/invites/offers", permanent: false },
      { source: "/vmb/admin/offers", destination: "/admin/invites/offers", permanent: false },
      { source: "/vmb/admin/services", destination: "/admin/invites/services", permanent: false },
    ];
  },
  experimental: {
    instrumentationHook: false,
    /** Route handlers still follow platform limits; this raises Server Actions caps if used later. */
    serverActions: {
      bodySizeLimit: "80mb",
    },
    /** Keep large /public/uploads assets out of serverless traces (Vercel 300MB limit). */
    outputFileTracingExcludes: {
      "*": ["public/uploads/**"],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};
export default nextConfig;
