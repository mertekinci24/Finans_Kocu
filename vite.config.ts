import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // loadEnv ile VITE_ prefix'li değişkenler vite.config.ts içinde de okunabilir
  const env = loadEnv(mode, process.cwd(), '');

  const supabaseUrl =
    env.VITE_SUPABASE_URL || 'https://utrurpsavmeirbuagcmb.supabase.co';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@hooks': path.resolve(__dirname, './src/hooks'),
        '@stores': path.resolve(__dirname, './src/stores'),
        '@services': path.resolve(__dirname, './src/services'),
        '@types': path.resolve(__dirname, './src/types/index.ts'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@constants': path.resolve(__dirname, './src/constants'),
        '@layouts': path.resolve(__dirname, './src/layouts'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        // /api/* → Supabase Edge Functions proxy
        '/api': {
          target: `${supabaseUrl}/functions/v1/api-gateway`,
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api/, ''),
        },
      },
    },
  };
});

