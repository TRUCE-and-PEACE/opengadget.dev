import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { onRequest as handleRoute } from '../functions/[[path]].js'
import { onRequestGet as handleInstaller } from '../functions/api/installers/[pkg].js'
import { parseToolSpec, validateSlug, validateVersion } from '../functions/_lib/registry.js'
import { resolveRelease, validateDownloadUrl } from '../functions/_lib/github.js'
import { renderBootstrap, renderInstaller } from '../functions/_lib/installer.js'
import { parseBootstrapCapabilities } from '../functions/_lib/ua.js'
import { injectOgTags } from '../functions/_lib/og.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// 1. Validate build-time catalog.json (no _example, _webi, or folders with spaces)
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'frontend', 'public', 'catalog.json'), 'utf8'))
assert.ok(Array.isArray(catalog), 'catalog.json must be an array')
assert.equal(
  catalog.some((t) => t.name.startsWith('_') || t.name.includes(' ')),
  false,
  'underscore and invalid folders must be excluded',
)

// 2. Validate dist artifacts
const distIndex = fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8')
assert.ok(fs.existsSync(path.join(ROOT, 'dist', 'catalog.json')), 'dist/catalog.json must exist')
assert.match(distIndex, /<title>opengadget\.dev/)

// 3. Validate dual-routing in functions/[[path]].js
{
  const res = await handleRoute({
    request: new Request('https://opengadget.dev/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15' },
    }),
    env: {},
    next: async () => new Response(distIndex, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
  })
  assert.equal(res.status, 200)
  assert.match(await res.text(), /<title>opengadget\.dev/)
}

{
  const res = await handleRoute({
    request: new Request('https://opengadget.dev/', {
      headers: { 'User-Agent': 'curl/8.5.0' },
    }),
    env: {},
    next: async () => new Response('should not reach static', { status: 500 }),
  })
  assert.equal(res.status, 400)
  assert.match(await res.text(), /Usage: curl -sS https:\/\/opengadget\.dev\/<tool> \| sh/)
}

{
  const res = await handleRoute({
    request: new Request('https://opengadget.dev/nonexistent', {
      headers: { 'User-Agent': 'curl/8.5.0' },
    }),
    env: {},
    next: async () => new Response('not found', { status: 404 }),
  })
  assert.equal(res.status, 404)
  assert.match(await res.text(), /not found in catalog/)
}

{
  const res = await handleRoute({
    request: new Request('https://opengadget.dev/nonexistent', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.19041' },
    }),
    env: {},
    next: async () => new Response('not found', { status: 404 }),
  })
  assert.equal(res.status, 404)
  assert.match(await res.text(), /Write-Error/)
}

{
  // Unknown tool installer endpoint returns 404 script
  const res = await handleInstaller({
    request: new Request('https://opengadget.dev/api/installers/nonexistent@stable.sh', {
      headers: { 'User-Agent': 'curl/8.5.0' },
    }),
    params: { pkg: 'nonexistent@stable.sh' },
    env: {},
  })
  assert.equal(res.status, 404)
  assert.match(await res.text(), /unknown tool/)
}

// 4. Validate Stage 1 & Stage 2 template rendering + GitHub release resolution (mocked)
{
  const bootSh = renderBootstrap({ host: 'https://opengadget.dev', slug: 'mytool', version: 'stable', kind: 'sh' })
  assert.match(bootSh, /WEBI_PKG='mytool'/)
  assert.match(bootSh, /WEBI_VER='stable'/)
  assert.match(bootSh, /\/api\/installers\/\$\{WEBI_PKG\}@\$\{WEBI_VER\}\.sh/)

  const bootPs1 = renderBootstrap({ host: 'https://opengadget.dev', slug: 'mytool', version: 'v1.2.3', kind: 'ps1' })
  assert.match(bootPs1, /\$WEBI_PKG = 'mytool'/)
  assert.match(bootPs1, /\$WEBI_VER = 'v1\.2\.3'/)
  assert.match(bootPs1, /Invoke-RestMethod/)
}

{
  const mockGithubFetch = async (url) => {
    if (url.endsWith('/releases/latest')) {
      return new Response(
        JSON.stringify({ tag_name: 'v2.3.9', draft: false, prerelease: false, assets: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    return new Response('Not Found', { status: 404 })
  }

  const capsSh = parseBootstrapCapabilities('curl/opengadget-bootstrap (os=linux; arch=arm64; formats=tar,zip)', 'sh')
  const relSh = await resolveRelease({ github_sources: 'yv3000/bunpm', tag_prefix: 'v' }, 'stable', capsSh, 'sh', {}, mockGithubFetch)
  assert.equal(relSh.tag, 'v2.3.9')
  assert.equal(relSh.version, '2.3.9')
  assert.equal(relSh.pkgUrl, 'https://github.com/yv3000/bunpm/archive/refs/tags/v2.3.9.tar.gz')

  const sampleSh = `pkg_install() {\n  webi_extract\n  rm -rf "$WEBI_OPT_DIR"\n}\npkg_post_install() {\n  webi_path_add\n}\n`
  const fullSh = renderInstaller({
    host: 'https://opengadget.dev',
    slug: 'mytool',
    version: relSh.version,
    tag: relSh.tag,
    pkgUrl: relSh.pkgUrl,
    toolEntry: { installSh: sampleSh, installPs1: '' },
    kind: 'sh',
  })
  assert.match(fullSh, /WEBI_TAG='v2\.3\.9'/)
  assert.match(fullSh, /\.local\/opt\/\$\{WEBI_PKG\}-\$\{WEBI_TAG\}/)
  assert.match(fullSh, /webi_path_add/)

  const capsPs1 = parseBootstrapCapabilities('PowerShell/opengadget-bootstrap (os=windows; arch=amd64; formats=zip)', 'ps1')
  const relPs1 = await resolveRelease({ github_sources: 'yv3000/bunpm', tag_prefix: 'v' }, 'stable', capsPs1, 'ps1', {}, mockGithubFetch)
  assert.equal(relPs1.pkgUrl, 'https://github.com/yv3000/bunpm/archive/refs/tags/v2.3.9.zip')
}

// 5. Security boundary checks
assert.equal(validateSlug('__proto__'), false, 'prototype pollution slug must be rejected')
assert.equal(validateSlug('constructor'), false, 'prototype property slug must be rejected')
assert.equal(parseToolSpec('../etc/passwd'), null, 'path traversal must be rejected')
assert.equal(validateVersion("v1';id;"), false, 'shell metacharacters in version must be rejected')
assert.equal(validateVersion('$(whoami)'), false, 'command substitution in version must be rejected')

assert.throws(() => validateDownloadUrl('https://evil.example/payload.tar.gz'), /Untrusted download host/)
assert.throws(() => validateDownloadUrl('http://github.com/a/b.tar.gz'), /Untrusted download host/)

await assert.rejects(
  () =>
    resolveRelease(
      { github_sources: 'yv3000/bunpm', tag_prefix: 'v' },
      'stable',
      { os: 'linux', arch: 'amd64', formats: ['tar'] },
      'sh',
      {},
      async () =>
        new Response(
          JSON.stringify({
            tag_name: 'v2.3.9',
            assets: [{ name: 'bunpm-linux-amd64.tar.gz', browser_download_url: 'https://evil.example/bad.tar.gz' }],
          }),
          { status: 200 },
        ),
    ),
  /Untrusted download host/,
)

const xssHtml = injectOgTags(
  '<title>x</title><meta name="description" content="x" /><meta property="og:title" content="x" /><meta property="og:description" content="x" /><meta property="og:url" content="x" />',
  { name: 'mytool', tagline: '"><script>alert(1)</script>' },
  'https://opengadget.dev',
)
assert.equal(xssHtml.includes('<script>alert(1)</script>'), false, 'OG tags must escape HTML')
assert.match(xssHtml, /&quot;&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;/)

console.log('ALL VERIFICATION CHECKS PASSED')
