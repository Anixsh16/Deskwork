import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/courses",
        destination: "/dashboard#courses",
        permanent: false,
      },
      {
        source: "/exams",
        destination: "/dashboard",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
