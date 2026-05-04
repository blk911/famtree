/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [{ source: "/admin/studio", destination: "/admin/studios", permanent: false }];
  },
  experimental: {
    instrumentationHook: false,
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
