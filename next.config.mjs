import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  // Recargaba la página entera al recuperar la señal. Un deportista cargando
  // sus series en el gimnasio perdía todo lo tipeado.
  reloadOnOnline: false,
  swcMinify: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: ({ request }) => request.mode === 'navigate',
        handler: 'NetworkOnly',
      },
      {
        // Nunca cachear la API: se llegaban a servir cupos y reservas de hasta
        // 24 h de antigüedad.
        urlPattern: /supabase\.co\/(rest|auth)\/v1/,
        handler: 'NetworkOnly',
      },
      {
        urlPattern: /^https?.*\.(?:js|css|woff2?|png|jpg|jpeg|webp|svg|ico)$/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'assets-cache',
          expiration: {
            maxEntries: 120,
            maxAgeSeconds: 7 * 24 * 60 * 60,
          },
        },
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. ESTO ES VITAL PARA DOCKER
  output: 'standalone',

  // 2. IMPORTANTE: Si usas <Image /> con fotos de Supabase, agrega esto:
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co', // Permite cargar imágenes desde Supabase
      },
    ],
  },
};

export default withPWA(nextConfig);
