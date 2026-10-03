/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**'
      }
    ]
  },
  outputFileTracingIncludes: {
    '/api/upscale-video': [
      './node_modules/ffmpeg-static/**/*'
    ]
  }
};

export default nextConfig;
