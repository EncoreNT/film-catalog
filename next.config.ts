import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
    localPatterns: [
      {
        pathname: "/api/covers/**",
      },
      {
        pathname: "/api/franchises/*/cover",
      },
    ],
  },
};

export default nextConfig;
