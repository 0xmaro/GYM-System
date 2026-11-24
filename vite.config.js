import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        tailwindcss(),
        laravel({
            input: ['resources/js/app.jsx', 'resources/css/app.css'],
            refresh: [                          // ✅ مش true
                { paths: ['resources/views/**'] },
            ],
        }),
        react(),
    ],
    server: {
        host: 'localhost',
        port: 5173,
        hmr: {
            overlay: false,
        },
        watch: {
            ignored: [
                '**/storage/**',
                '**/bootstrap/cache/**',
                '**/.git/**',
                '**/vendor/**',
            ],
        },
    },
});
