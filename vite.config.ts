import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import {viteStaticCopy} from "vite-plugin-static-copy";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), viteStaticCopy({
        targets: [{
            src: 'src/chrome-extension/content.js', dest: '',
        }, {
            src: 'src/chrome-extension/icon.png', dest: '',
        }, {
            src: 'src/chrome-extension/manifest.json', dest: '',
        }],
    })], build: {
        chunkSizeWarningLimit: 1024,
    },
});