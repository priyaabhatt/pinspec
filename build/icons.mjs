// Renders build/icon.svg to the PNG sizes the manifest needs.
// Usage: node build/icons.mjs  (uses installed Chrome, or set CHROMIUM_PATH)
import { chromium } from 'playwright-core'
import { readFileSync } from 'node:fs'

const svg = readFileSync(new URL('./icon.svg', import.meta.url), 'utf8')
const path = process.env.CHROMIUM_PATH
const browser = await chromium.launch(path ? { executablePath: path } : { channel: 'chrome' })
const page = await browser.newPage()
for (const size of [16, 32, 48, 128]) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`)
  await page.screenshot({ path: `public/icons/${size}.png`, omitBackground: true })
}
await browser.close()
