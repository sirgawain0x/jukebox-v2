import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
  turbopack: {
    resolveAlias: {
      "pino-pretty": "",
      "lokijs": "",
      "encoding": "",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.ipfs.dweb.link",
      },
      {
        protocol: "https",
        hostname: "**.ipfs.nftstorage.link",
      },
      {
        protocol: "https",
        hostname: "ipfs.io",
        pathname: "/ipfs/**",
      },
      {
        protocol: "https",
        hostname: "gateway.pinata.cloud",
        pathname: "/ipfs/**",
      },
      {
        protocol: "https",
        hostname: "**.arweave.net",
      },
      {
        protocol: "https",
        hostname: "arweave.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.spinamp.xyz",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "cdn.sound.xyz",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.mypinata.cloud",
        pathname: "/ipfs/**",
      },
      {
        protocol: "https",
        hostname: "catalogworks.b-cdn.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.b-cdn.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "spinamp.b-cdn.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "assets.spinamp.xyz",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.spinamp.xyz",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.cloudfront.net",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
