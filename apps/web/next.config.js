const withMDX = require("@next/mdx")();
const withPWA = require("next-pwa")({
  dest: "public",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/ui"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.convex.cloud",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.convex.site",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "openroleplay.ai",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "r2.openroleplay.ai",
        port: "",
        pathname: "/**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/shop",
        destination: "/crystals",
        permanent: true,
      },
      {
        source: "/empty-canvas",
        destination: "https://emptycanvas.art/",
        permanent: true,
      },
      {
        source: "/star",
        destination:
          "https://github.com/open-roleplay-ai/openroleplay.ai/stargazers",
        permanent: true,
      },
      {
        source: "/github",
        destination: "https://github.com/open-roleplay-ai/openroleplay.ai",
        permanent: true,
      },
      {
        source: "/discord",
        destination: "https://discord.gg/bM5zzMEtdW",
        permanent: true,
      },
      {
        source: "/docs",
        destination: "https://docs.openroleplay.ai",
        permanent: true,
      },
      {
        source: "/affiliate",
        destination: "https://tally.so/r/3jPAVR",
        permanent: true,
      },
      {
        source: "/content-rules",
        destination: "/safety",
        permanent: true,
      },
    ];
  },
  pageExtensions: ["js", "jsx", "mdx", "ts", "tsx"],
};

module.exports = withPWA(withMDX(nextConfig));
