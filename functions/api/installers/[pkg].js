import { getTool, parseToolSpec } from '../../_lib/registry.js'
import { parseBootstrapCapabilities } from '../../_lib/ua.js'
import { resolveRelease } from '../../_lib/github.js'
import { renderErrorScript, renderInstaller } from '../../_lib/installer.js'

const TEXT_HEADERS = {
  'Content-Type': 'text/plain; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'public, max-age=300',
}

export async function onRequestGet(context, fetchImpl = fetch) {
  const { request, params, env } = context
  const rawPkg = Array.isArray(params?.pkg) ? params.pkg.join('/') : String(params?.pkg ?? '')

  const match = rawPkg.match(/^([^/]+)\.(sh|ps1)$/)
  if (!match) {
    return new Response(renderErrorScript('sh', 'invalid installer path'), {
      status: 400,
      headers: { ...TEXT_HEADERS, 'Cache-Control': 'no-store' },
    })
  }

  const [, specPart, kind] = match
  const parsed = parseToolSpec(specPart)
  if (!parsed) {
    return new Response(renderErrorScript(kind, `unknown tool or invalid version: ${specPart}`), {
      status: 404,
      headers: { ...TEXT_HEADERS, 'Cache-Control': 'no-store' },
    })
  }

  const toolEntry = getTool(parsed.slug)
  const capabilities = parseBootstrapCapabilities(request.headers.get('User-Agent'), kind)
  const origin = new URL(request.url).origin

  try {
    const release = await resolveRelease(
      toolEntry.releasesConf,
      parsed.version,
      capabilities,
      kind,
      env,
      fetchImpl,
    )

    const script = renderInstaller({
      host: origin,
      slug: parsed.slug,
      version: release.version,
      tag: release.tag,
      pkgUrl: release.pkgUrl,
      toolEntry,
      kind,
    })

    return new Response(script, { status: 200, headers: TEXT_HEADERS })
  } catch (err) {
    const isNotFound = err?.status === 404
    if (!isNotFound) {
      console.error('Installer resolution failed:', err)
    }
    const status = isNotFound ? 404 : 502
    const safeMsg = isNotFound ? err?.message || 'release not found' : 'failed to resolve release'
    return new Response(renderErrorScript(kind, safeMsg), {
      status,
      headers: { ...TEXT_HEADERS, 'Cache-Control': 'no-store' },
    })
  }
}

