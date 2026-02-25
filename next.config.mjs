/** @type {import('next').NextConfig} */
// Static Export für Capacitor (Handy): Kein Node-Server auf dem Gerät – Next baut reines HTML/JS nach "out".
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true, // Image Optimization braucht Server; bei Static Export deaktiviert
  },
  output: 'export',
  trailingSlash: true,
  env: {
    // Supabase is now optional - app works with local storage if not configured
    // Set these environment variables only if you want to use Supabase cloud sync
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },
}

export default nextConfig
