import { readFileSync } from 'fs'
import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import sirv from 'sirv'
import { viteStaticCopy } from 'vite-plugin-static-copy'

let latestCropVerifyResult: string | null = null

export default defineConfig({
    base: './',
    publicDir: false,
    plugins: [
        react(),
        {
            name: 'crop-verify-result-endpoint',
            configureServer(server) {
                const serveTestFixtures = sirv(path.join(process.cwd(), 'test-fixtures'), {
                    dev: true,
                    etag: true,
                })

                server.middlewares.use('/test-fixtures', (req, res, next) => {
                    serveTestFixtures(req, res, () => {
                        next()
                    })
                })

                server.middlewares.use('/crop-verify.html', (req, res, next) => {
                    if (req.method !== 'GET') {
                        next()
                        return
                    }

                    const html = readFileSync(path.join(process.cwd(), 'dev/crop-verify.html'), 'utf8')
                    res.statusCode = 200
                    res.setHeader('Content-Type', 'text/html; charset=utf-8')
                    res.end(html)
                })

                server.middlewares.use('/__crop_verify_result', (req, res, next) => {
                    if (req.method === 'POST') {
                        let body = ''
                        req.on('data', (chunk) => {
                            body += chunk
                        })
                        req.on('end', () => {
                            latestCropVerifyResult = body
                            res.statusCode = 204
                            res.end()
                        })
                        return
                    }

                    if (req.method === 'GET') {
                        res.setHeader('Content-Type', 'application/json')
                        res.end(latestCropVerifyResult ?? '{}')
                        return
                    }

                    next()
                })
            },
        },
        viteStaticCopy({
            targets: [
                {
                    src: 'src/chrome-extension/icons/*',
                    dest: 'icons',
                },
                {
                    src: 'src/chrome-extension/manifest.json',
                    dest: '',
                },
            ],
        }),
    ],
    build: {
        chunkSizeWarningLimit: 1024,
    },
})
