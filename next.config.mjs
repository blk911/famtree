/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [{ source: "/admin/studio", destination: "/admin/studios", permanent: false }];
  },
  experimental: {
    instrumentationHook: false,
    /** Route handlers still follow platform limits; this raises Server Actions caps if used later. */
    serverActions: {
      bodySizeLimit: "80mb",
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
