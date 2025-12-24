import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
    css: {
        preprocessorOptions: {
            scss: {
                api: 'modern-compiler',
                quietDeps: true,
            },
        },
    },
    plugins: [react()],
    base: '/AdvancedManager/',
    optimizeDeps: {
        include: ['firebase/app', 'firebase/firestore'],
    },
})
