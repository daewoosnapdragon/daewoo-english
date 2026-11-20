/** @type {import('next').NextConfig} */
const nextConfig = {
  // A separate build folder per dev server (NEXT_DIST_DIR=.next-3201), so two
  // running at once do not overwrite each other's files.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
}

module.exports = nextConfig
