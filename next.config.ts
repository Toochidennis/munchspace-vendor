import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Where the API actually serves assets from. StorageService.getUrl builds
    // public URLs (menu images, logos, covers) as `${R2_PUBLIC_URL}/${key}`
    // whenever STORAGE_PROVIDER is r2 — which both the development and the
    // production API environments are.
    //
    // Neither previous entry matched that: res.cloudinary.com is not used by
    // anything, and dev.api.munchspace.io/storage/** described the local-disk
    // provider's route on a host the API never had (its APP_URL is
    // https://dev.munchspace.io). next/image would have rejected every real
    // asset URL.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.munchspace.io",
      },
      // STORAGE_PROVIDER=local serves those same assets off the API's own
      // /storage/ route at APP_URL instead. Only a local API runs that way.
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/storage/**",
      },
    ],
  },
};

export default nextConfig;
