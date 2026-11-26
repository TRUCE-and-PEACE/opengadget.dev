const ALLOWED_DOWNLOAD_HOSTS = new Set([
  'github.com',
  'api.github.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com',
  'codeload.github.com',
])

const REPO_RE = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*\/[a-zA-Z0-9][a-zA-Z0-9_.-]*$/
const TAG_RE = /^[a-zA-Z0-9._+-]{1,64}$/
const FETCH_TIMEOUT_MS = 8000

export function validateDownloadUrl(rawUrl) {
  let parsed
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new Error('Invalid download URL')
  }
  if (parsed.protocol !== 'https:' || !ALLOWED_DOWNLOAD_HOSTS.has(parsed.hostname)) {
    throw new Error(`Untrusted download host: ${parsed.hostname}`)
  }
  return parsed.toString()
}

function scoreAsset(name, { os, arch, formats }) {
  const lower = name.toLowerCase()
  if (/\.(sha256|sha512|sig|asc|minisig|sbom|json|txt)$/i.test(lower)) return -1

  const isZip = lower.endsWith('.zip')
  const isTarGz = lower.endsWith('.tar.gz') || lower.endsWith('.tgz')
  const isTarXz = lower.endsWith('.tar.xz') || lower.endsWith('.txz')

  if (!isZip && !isTarGz && !isTarXz) return -1
  if (isZip && !formats.includes('zip')) return -1
  if (isTarXz && !formats.includes('xz')) return -1
  if (isTarGz && !formats.includes('tar')) return -1

  const osTokens =
    os === 'macos'
      ? ['darwin', 'macos', 'osx', 'apple']
      : os === 'windows'
        ? ['windows', 'win64', 'win32', 'pc-windows']
        : ['linux', 'unknown-linux']
  const archTokens =
    arch === 'arm64'
      ? ['arm64', 'aarch64']
      : arch === 'x86'
        ? ['386', 'i386', 'i686', 'x86']
        : ['amd64', 'x86_64', 'x64']

  const osHit = osTokens.some((t) => lower.includes(t))
  const archHit = archTokens.some((t) => lower.includes(t))
  if (!osHit || !archHit) return -1

  return (os === 'windows' && isZip ? 10 : 5) + (archHit ? 5 : 0)
}

function selectAssetUrl(release, ownerRepo, capabilities, kind) {
  const assets = Array.isArray(release.assets) ? release.assets : []
  let best = null
  let bestScore = -1

  for (const asset of assets) {
    if (!asset || typeof asset.name !== 'string' || typeof asset.browser_download_url !== 'string') continue
    const s = scoreAsset(asset.name, capabilities)
    if (s > bestScore) {
      bestScore = s
      best = asset.browser_download_url
    }
  }

  if (best) return validateDownloadUrl(best)

  const tag = release.tag_name
  const ext = kind === 'ps1' ? 'zip' : 'tar.gz'
  return validateDownloadUrl(`https://github.com/${ownerRepo}/archive/refs/tags/${encodeURIComponent(tag)}.${ext}`)
}

async function fetchJsonCached(url, env, fetchImpl) {
  const headers = {
    'User-Agent': 'opengadget.dev/1.0',
    Accept: 'application/vnd.github+json',
  }
  if (env?.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`
  }

  let cache = null
  const cacheKey = new Request(url, { method: 'GET' })
  try {
    if (typeof caches !== 'undefined' && caches.default) {
      cache = caches.default
      const hit = await cache.match(cacheKey)
      if (hit) return { status: hit.status, data: await hit.json() }
    }
  } catch {
    cache = null
  }

  const fetchOpts = { headers }
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    fetchOpts.signal = AbortSignal.timeout(FETCH_TIMEOUT_MS)
  }

  const res = await fetchImpl(url, fetchOpts)
  if (!res.ok) {
    // Briefly cache 404s to prevent non-existent tag lookups from exhausting GitHub API rate limits
    if (res.status === 404 && cache) {
      try {
        await cache.put(
          cacheKey,
          new Response(JSON.stringify(null), {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=60',
            },
          }),
        )
      } catch {
        // Ignore cache write errors in non-edge or read-only contexts
      }
    }
    return { status: res.status, data: null }
  }
  const data = await res.json()

  if (cache) {
    try {
      const toCache = new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
        },
      })
      await cache.put(cacheKey, toCache)
    } catch {
      // Ignore cache write errors in non-edge or read-only contexts
    }
  }

  return { status: res.status, data }
}

export async function resolveRelease(releasesConf, requestedVersion, capabilities, kind, env = {}, fetchImpl = fetch) {
  const ownerRepo = releasesConf?.github_sources
  if (!ownerRepo || !REPO_RE.test(ownerRepo) || ownerRepo.includes('..')) {
    throw new Error('Invalid github_sources in releases.conf')
  }
  const tagPrefix = releasesConf?.tag_prefix ?? 'v'
  const baseApi = `https://api.github.com/repos/${ownerRepo}/releases`

  let release = null

  if (requestedVersion === 'stable' || requestedVersion === 'latest') {
    const latest = await fetchJsonCached(`${baseApi}/latest`, env, fetchImpl)
    if (latest.status === 200 && latest.data?.tag_name) {
      release = latest.data
    } else {
      const list = await fetchJsonCached(`${baseApi}?per_page=20`, env, fetchImpl)
      if (list.status === 200 && Array.isArray(list.data)) {
        release =
          list.data.find((r) => !r.draft && !r.prerelease) ||
          list.data.find((r) => !r.draft) ||
          null
      }
    }
  } else if (requestedVersion === 'beta') {
    const list = await fetchJsonCached(`${baseApi}?per_page=20`, env, fetchImpl)
    if (list.status === 200 && Array.isArray(list.data)) {
      release =
        list.data.find((r) => !r.draft && r.prerelease) ||
        list.data.find((r) => !r.draft) ||
        null
    }
  } else {
    const candidates = [requestedVersion]
    if (tagPrefix && !requestedVersion.startsWith(tagPrefix)) {
      candidates.push(`${tagPrefix}${requestedVersion}`)
    }
    for (const candidate of candidates) {
      const byTag = await fetchJsonCached(`${baseApi}/tags/${encodeURIComponent(candidate)}`, env, fetchImpl)
      if (byTag.status === 200 && byTag.data?.tag_name) {
        release = byTag.data
        break
      }
    }
  }

  if (!release || typeof release.tag_name !== 'string' || !TAG_RE.test(release.tag_name)) {
    const err = new Error(`Release not found for ${ownerRepo}@${requestedVersion}`)
    err.status = 404
    throw err
  }

  const tag = release.tag_name
  const version = tagPrefix && tag.startsWith(tagPrefix) ? tag.slice(tagPrefix.length) : tag
  const pkgUrl = selectAssetUrl(release, ownerRepo, capabilities, kind)

  return { tag, version, pkgUrl }
}

