// End-to-end tests: load the built extension into Chromium and drive it on
// the dev pages. Run with `npm run test:e2e` (builds first).
//
// Uses the Chromium that Playwright installs (`npx playwright-core install
// chromium`), or the one at PINSPEC_CHROMIUM if set.

import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const root = fileURLToPath(new URL('..', import.meta.url))
let server, origin, ctx, worker, tmp

before(async () => {
  // Serve dev/ over http.
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' }
  server = createServer((req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '') || 'index.html'
    try {
      const body = readFileSync(join(root, 'dev', path))
      res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' })
      res.end(body)
    } catch {
      res.writeHead(404).end()
    }
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  origin = `http://127.0.0.1:${server.address().port}`

  // A copy of the build with host access, so tests can inject without
  // clicking the toolbar icon (which activeTab needs).
  tmp = mkdtempSync(join(tmpdir(), 'pinspec-e2e-'))
  const ext = join(tmp, 'ext')
  cpSync(join(root, 'dist'), ext, { recursive: true })
  const manifest = JSON.parse(readFileSync(join(ext, 'manifest.json'), 'utf8'))
  manifest.host_permissions = ['<all_urls>']
  writeFileSync(join(ext, 'manifest.json'), JSON.stringify(manifest))

  const exe = process.env.PINSPEC_CHROMIUM
  ctx = await chromium.launchPersistentContext(join(tmp, 'profile'), {
    ...(exe ? { executablePath: exe } : { channel: 'chromium' }),
    headless: true,
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, '--headless=new'],
    viewport: { width: 1100, height: 700 },
  })
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin })
  worker = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent('serviceworker'))
})

after(async () => {
  await ctx?.close()
  server?.close()
  if (tmp) rmSync(tmp, { recursive: true, force: true })
})

async function open(path = '/') {
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('dialog', (d) => {
    errors.push(`page dialog: ${d.message()}`)
    d.dismiss()
  })
  await page.goto(origin + path)
  // Inject into this page's tab: the newest one on the test server.
  await worker.evaluate(async (url) => {
    const tabs = await chrome.tabs.query({ url: url + '/*' })
    const tab = tabs.sort((a, b) => b.id - a.id)[0]
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] })
  }, origin)
  await page.waitForTimeout(300)
  const ui = (sel) => page.locator('pinspec-ui').locator(sel)
  return { page, ui, errors }
}

async function hoverAt(page, x, y) {
  await page.mouse.move(x - 4, y - 4)
  await page.mouse.move(x, y)
  await page.waitForTimeout(120)
}

async function pick(page, ui, selector, dx = 0.5, dy = 0.5) {
  const b = await page.locator(selector).first().boundingBox()
  const x = b.x + b.width * dx
  const y = b.y + b.height * dy
  await hoverAt(page, x, y)
  await page.mouse.click(x, y)
  await ui('img[alt=Before]').waitFor({ timeout: 20_000 })
}

/** Tick a property in the { } picker, close it, and type its after value. */
async function addRow(page, ui, prop, value) {
  await ui('button[aria-label="Add CSS property"]').click()
  await page.waitForTimeout(200)
  await page.keyboard.type(prop)
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(150)
  await page.keyboard.type(value)
  await page.waitForTimeout(100)
}

async function key(page, k) {
  await page.keyboard.press(k)
  await page.waitForTimeout(120)
}

/** The selected element in the hover label's breadcrumb, e.g. "button.btn". */
async function selected(page) {
  return page.evaluate(() => document.querySelector('pinspec-ui').shadowRoot.querySelector('.font-mono .font-semibold')?.textContent)
}

describe('pin flow', () => {
  test('select, annotate, add CSS, copy, and restore the page', async () => {
    const { page, ui, errors } = await open('/')
    await pick(page, ui, 'button.btn', 0.25)
    await page.keyboard.type('make it wider')

    await addRow(page, ui, 'width', '350px')
    await addRow(page, ui, 'border-radius', '8px')
    await addRow(page, ui, 'color', '#6b7280')

    // Tailwind and shadcn tokens read from the page.
    assert.deepEqual(await ui('.text-highlight').allTextContents(), ['w-88 (352px)', 'rounded-lg', 'text-muted-foreground'])
    // Before values are written the way the image writes them: the element's
    // class for its radius, the token class for its colour, raw for a width
    // no class sets.
    const befores = await ui('input[placeholder=after]').evaluateAll((inputs) =>
      inputs.map((i) => i.parentElement.querySelectorAll('span')[1].textContent),
    )
    assert.deepEqual(befores, ['232px', 'rounded-sm', 'text-background'])
    // Live preview applies the snapped value.
    assert.equal(await page.locator('button.btn').evaluate((e) => getComputedStyle(e).width), '352px')

    await ui('button[aria-label="Copy"]').click()
    await page.waitForTimeout(2500)
    const png = await page.evaluate(async () => {
      const [item] = await navigator.clipboard.read()
      const bytes = new Uint8Array(await (await item.getType('image/png')).arrayBuffer())
      return Array.from(bytes.slice(0, 24))
    })
    assert.deepEqual(png.slice(0, 8), [137, 80, 78, 71, 13, 10, 26, 10], 'clipboard holds a PNG')
    const width = (png[16] << 24) | (png[17] << 16) | (png[18] << 8) | png[19]
    assert.equal(width, 2400, 'composed image is 1200px at 2x')

    // The pin is gone and the page is back as it was.
    assert.equal(await ui('textarea').count(), 0)
    assert.equal(await page.locator('button.btn').evaluate((e) => getComputedStyle(e).width), '232px')
    assert.equal(await page.locator('button.btn').getAttribute('style'), null)
    assert.deepEqual(errors, [])
    await page.close()
  })

  test('picker lists non-default styles with token names and the class list', async () => {
    const { page, ui } = await open('/')
    await pick(page, ui, 'button.btn', 0.25)
    await ui('button[aria-label="Add CSS property"]').click()
    await page.waitForTimeout(300)
    const entries = await ui('[role=checkbox]').allTextContents()
    assert.ok(entries.includes('width232px'))
    assert.ok(entries.includes('background-color' + 'bg-primary'), 'colour shown as its class, same as the image')
    assert.ok(entries.includes('border-radius' + 'rounded-sm'), "the element's own class names its radius")
    assert.ok(!entries.some((e) => e.startsWith('outline-color')), 'outline colour hidden without an outline')
    assert.deepEqual(await ui('.rounded.bg-muted').allTextContents(), ['btn', 'inline-flex', 'items-center', 'rounded-sm'])
    await page.close()
  })

  test('copy stays disabled until there is a comment', async () => {
    const { page, ui } = await open('/')
    await pick(page, ui, 'button.btn', 0.25)
    assert.equal(await ui('button[aria-label="Copy"]').isDisabled(), true)
    await page.keyboard.type('x')
    assert.equal(await ui('button[aria-label="Copy"]').isDisabled(), false)
    await page.close()
  })
})

describe('selection', () => {
  test('icons select as one svg, overlays are skipped, ↑ and ↓ move through the tree', async () => {
    const { page } = await open('/')
    const icon = await page.locator('.icon-btn svg').boundingBox()
    await hoverAt(page, icon.x + icon.width / 2, icon.y + icon.height / 2)
    assert.equal(await selected(page), 'svg')

    const title = await page.locator('h1.title').boundingBox()
    await hoverAt(page, title.x + 40, title.y + title.height / 2)
    assert.equal(await selected(page), 'h1.title', 'the invisible overlay above the heading is skipped')

    await key(page, 'ArrowUp')
    assert.equal(await selected(page), 'div.card')
    await key(page, 'ArrowDown')
    assert.equal(await selected(page), 'h1.title')

    const btn = await page.locator('button.btn').boundingBox()
    await hoverAt(page, btn.x + btn.width + 4, btn.y + btn.height / 2)
    assert.equal(await selected(page), 'div.row')
    await key(page, 'ArrowDown')
    assert.equal(await selected(page), 'button.btn')
    await page.close()
  })
})

describe('capture', () => {
  test('elements taller than the viewport are stitched in full and scroll is restored', async () => {
    const { page, ui } = await open('/')
    await page.evaluate(() => window.scrollTo(0, 300))
    const li = await page.locator('.activity li').nth(3).boundingBox()
    await hoverAt(page, li.x + 40, li.y + 10)
    await key(page, 'ArrowUp')
    await key(page, 'ArrowUp')
    const cssHeight = await page.locator('.activity').evaluate((e) => e.getBoundingClientRect().height)
    await page.mouse.click(li.x + 40, li.y + 10)
    await ui('img[alt=Before]').waitFor({ timeout: 20_000 })
    const [, h] = await ui('img[alt=Before]').evaluate((i) => [i.naturalWidth, i.naturalHeight])
    const dpr = await page.evaluate(() => devicePixelRatio)
    assert.ok(Math.abs(h - (cssHeight + 32) * dpr) <= 2 * dpr, `stitched height ${h} for a ${cssHeight}px element`)
    assert.equal(await page.evaluate(() => window.scrollY), 300)
    assert.equal(await page.locator('.topbar').getAttribute('style'), null, 'sticky header restored')
    await page.close()
  })
})

describe('custom tokens', () => {
  test('a non-Tailwind site snaps to its own token names', async () => {
    const { page, ui } = await open('/custom-tokens.html')
    await pick(page, ui, '.cta', 0.2)
    await page.keyboard.type('more padding')
    await addRow(page, ui, 'padding-left', '18px')
    await addRow(page, ui, 'border-radius', '7px')
    await addRow(page, ui, 'background-color', '#2563eb')
    assert.deepEqual(await ui('.text-highlight').allTextContents(), ['var(--space-4) (16px)', 'var(--rounded-md) (8px)', 'var(--brand-primary)'])
    await page.close()
  })
})
