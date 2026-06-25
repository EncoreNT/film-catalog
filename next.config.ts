import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
    localPatterns: [
      {
        pathname: "/api/covers/**",
      },
    ],
  },
};

export default nextConfig;
