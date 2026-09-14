import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import {viteStaticCopy} from "vite-plugin-static-copy";

let latestCropVerifyResult: string | null = null;

// https://vite.dev/config/
export default defineConfig({
    base: './',
    plugins: [react(), {
        name: 'crop-verify-result-endpoint',
        configureServer(server) {
            server.middlewares.use('/__crop_verify_result', (req, res, next) => {
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', (chunk) => { body += chunk; });
                    req.on('end', () => {
                        latestCropVerifyResult = body;
                        res.statusCode = 204;
                        res.end();
                    });
                    return;
                }

                if (req.method === 'GET') {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(latestCropVerifyResult ?? '{}');
                    return;
                }

                next();
            });
        },
    }, viteStaticCopy({
        targets: [{
            src: 'src/chrome-extension/icon.png', dest: '',
        }, {
            src: 'src/chrome-extension/manifest.json', dest: '',
        }],
    })], build: {
        chunkSizeWarningLimit: 1024,
    },
});