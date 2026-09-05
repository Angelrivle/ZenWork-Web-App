/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@zenwork/db",
    "@zenwork/shared",
    "@zenwork/auth",
    "@zenwork/middleware",
    "@zenwork/integrations",
  ],
  serverExternalPackages: [
    "@prisma/client",
    "prisma",
    "argon2",
    "jose",
    "otplib",
    "ioredis",
    "bullmq",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  headers: async () => [
    {
      source: "/api/:path*",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
  ],
};

export default nextConfig;
