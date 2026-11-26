import { getTool, parseToolSpec } from './_lib/registry.js'
import { classifyClient } from './_lib/ua.js'
import { renderBootstrap, renderErrorScript } from './_lib/installer.js'
import { injectOgTags } from './_lib/og.js'

const PASSTHROUGH_PREFIXES = ['/assets/', '/api/', '/.well-known/']
const PASSTHROUGH_EXACT = new Set(['/favicon.png', '/catalog.json', '/robots.txt', '/sitemap.xml'])

const SCRIPT_HEADERS = {
  'Content-Type': 'text/plain; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'public, max-age=60',
  Vary: 'User-Agent',
}

export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const pathname = url.pathname

  if (
    PASSTHROUGH_EXACT.has(pathname) ||
    PASSTHROUGH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return context.next()
  }

  const clientKind = classifyClient(request.headers.get('User-Agent'))
  const stripped = pathname.replace(/^\/+|\/+$/g, '')

  // Terminal User-Agent routing (curl, wget, PowerShell / Invoke-WebRequest)
  if (clientKind !== 'browser' && (request.method === 'GET' || request.method === 'HEAD')) {
    const kind = clientKind === 'powershell' ? 'ps1' : 'sh'

    if (!stripped) {
      const msg =
        kind === 'ps1'
          ? 'Usage: irm https://opengadget.dev/<tool> | iex (try: bunpm)'
          : 'Usage: curl -sS https://opengadget.dev/<tool> | sh (try: bunpm)'
      return new Response(renderErrorScript(kind, msg), {
        status: 400,
        headers: { ...SCRIPT_HEADERS, 'Cache-Control': 'no-store' },
      })
    }

    const parsed = parseToolSpec(stripped)
    if (!parsed) {
      return new Response(renderErrorScript(kind, `'${stripped}' not found in catalog`), {
        status: 404,
        headers: { ...SCRIPT_HEADERS, 'Cache-Control': 'no-store' },
      })
    }

    const body = renderBootstrap({
      host: url.origin,
      slug: parsed.slug,
      version: parsed.version,
      kind,
    })

    return new Response(body, { status: 200, headers: SCRIPT_HEADERS })
  }

  // Browser routing: serve static SPA + inject per-tool OG meta tags
  let response = await context.next()
  if (response.status === 404 && env?.ASSETS && !pathname.includes('.')) {
    response = await env.ASSETS.fetch(new Request(new URL('/index.html', url.origin), request))
  }

  const contentType = response.headers.get('Content-Type') || ''
  if (!contentType.includes('text/html')) {
    return response
  }

  const parsed = stripped ? parseToolSpec(stripped) : null
  const toolEntry = parsed ? getTool(parsed.slug) : null
  if (!toolEntry) {
    return response
  }

  const html = await response.text()
  const updatedHtml = injectOgTags(html, toolEntry.meta, url.origin)
  const headers = new Headers(response.headers)
  headers.set('Vary', 'User-Agent')
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.delete('Content-Length')

  return new Response(updatedHtml, {
    status: response.status === 404 ? 200 : response.status,
    headers,
  })
}

