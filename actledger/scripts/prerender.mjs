/**
 * Post-build prerender script.
 * Launches vite preview, navigates to the landing page with Puppeteer,
 * captures the rendered HTML, and writes it into dist/index.html.
 */
import { spawn } from 'child_process'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import puppeteer from 'puppeteer'
import { POSTS } from '../src/content/blog.js'

const ROUTES = ['/', '/blog', '/lead-listesi', ...POSTS.map(p => `/blog/${p.slug}`)]
const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, '..', 'dist')
const PORT = 4174

async function waitForServer(port, timeout = 15000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(`http://localhost:${port}/`)
      if (res.ok) return
    } catch {}
    await new Promise(r => setTimeout(r, 300))
  }
  throw new Error('Server start timeout')
}

async function main() {
  // Start vite preview server
  const viteBin = join(__dirname, '..', 'node_modules', 'vite', 'bin', 'vite.js')
  const server = spawn(process.execPath, [viteBin, 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: 'ignore',
    shell: false,
    detached: false,
  })

  server.on('error', (err) => {
    console.error('Failed to start preview server:', err)
    process.exit(1)
  })

  await waitForServer(PORT)
  console.log('Preview server running on port', PORT)

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })

  try {
    for (const route of ROUTES) {
      const page = await browser.newPage()
      const url = `http://localhost:${PORT}${route}`
      console.log(`Prerendering ${route}...`)

      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })

      // Wait for React to render content inside #root
      await page.waitForSelector('#root h1', { timeout: 10000 })

      // Get the full rendered HTML
      const html = await page.content()

      // Determine output path
      const outFile = route === '/'
        ? join(DIST, 'index.html')
        : join(DIST, route, 'index.html')

      mkdirSync(dirname(outFile), { recursive: true })
      writeFileSync(outFile, html, 'utf-8')
      console.log(`  Wrote ${outFile}`)

      await page.close()
    }
  } finally {
    await browser.close()
    server.kill()
  }

  console.log('Prerender complete.')
}

main().catch((err) => {
  console.error('Prerender failed:', err)
  process.exit(1)
})
