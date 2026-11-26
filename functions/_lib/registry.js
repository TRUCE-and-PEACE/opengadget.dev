import { REGISTRY, WEBI_TEMPLATES } from './generated-registry.js'

const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/
const VERSION_RE = /^(stable|latest|beta|[vV]?[0-9]+(\.[0-9]+){0,3}(-[a-zA-Z0-9._-]+)?)$/

export function validateSlug(slug) {
  return (
    typeof slug === 'string' &&
    SLUG_RE.test(slug) &&
    Object.prototype.hasOwnProperty.call(REGISTRY, slug)
  )
}

export function validateVersion(ver) {
  return (
    typeof ver === 'string' &&
    ver.length > 0 &&
    ver.length <= 64 &&
    VERSION_RE.test(ver)
  )
}

export function parseToolSpec(raw) {
  if (typeof raw !== 'string') return null
  const trimmed = raw.replace(/^\/+|\/+$/g, '')
  if (!trimmed || trimmed.includes('/')) return null

  const parts = trimmed.split('@')
  if (parts.length > 2) return null

  const slug = parts[0]
  const version = parts[1] ?? 'stable'

  if (!validateSlug(slug) || !validateVersion(version)) return null
  return { slug, version }
}

export function getTool(slug) {
  return validateSlug(slug) ? REGISTRY[slug] : null
}

export { REGISTRY, WEBI_TEMPLATES }

