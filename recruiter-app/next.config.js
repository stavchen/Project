/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.onlyfans.com" },
      { protocol: "https", hostname: "public.onlyfans.com" },
    ],
  },
};

module.exports = nextConfig;
