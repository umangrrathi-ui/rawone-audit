/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone", // small Docker image, low RAM
  poweredByHeader: false,
  images: { unoptimized: true },
};
export default nextConfig;
