import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 5173,
        host: '0.0.0.0', // Escucha en todas las interfaces
        strictPort: true,
        watch: {
            usePolling: true,
        },
        proxy: {
            '/api': {
                target: process.env.VITE_API_URL || 'http://localhost:8080',
                changeOrigin: true,
            },
        },
    },
});
