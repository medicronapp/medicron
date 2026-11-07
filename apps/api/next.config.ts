import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O app se chamava "gatos"; mantém atalhos do PWA e links salvos funcionando.
  async redirects() {
    return [
      { source: "/gatos", destination: "/pacientes", permanent: true },
      { source: "/gatos/:path*", destination: "/pacientes/:path*", permanent: true },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
