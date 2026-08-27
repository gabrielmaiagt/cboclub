import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // signInWithPopup (Google) precisa checar window.closed no popup
        // entre origens — COOP "same-origin" (padrao de alguns hosts)
        // bloqueia essa checagem e trava o login.
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
