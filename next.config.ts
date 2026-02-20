import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
      },
      {
        protocol: "https",
        hostname: "dev.api.munchspace.io",
        port: "",
        pathname: "/storage/**",
      },
    ],
  },
};

export default nextConfig;
