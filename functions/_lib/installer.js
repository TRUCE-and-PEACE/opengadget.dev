import { WEBI_TEMPLATES } from './registry.js'

const CONTROL_CHARS = /[\0\r\n]/

export function quoteSh(value) {
  const s = String(value)
  if (CONTROL_CHARS.test(s)) throw new Error('Unsafe control character in shell value')
  return `'${s.replace(/'/g, `'\\''`)}'`
}

export function quotePs1(value) {
  const s = String(value)
  if (CONTROL_CHARS.test(s)) throw new Error('Unsafe control character in PowerShell value')
  return `'${s.replace(/'/g, `''`)}'`
}

function replacePlaceholders(template, vars) {
  let out = template
  for (const [key, val] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, () => val)
  }
  return out
}

export function renderBootstrap({ host, slug, version, kind }) {
  const q = kind === 'ps1' ? quotePs1 : quoteSh
  const tpl = kind === 'ps1' ? WEBI_TEMPLATES.bootstrapPs1 : WEBI_TEMPLATES.bootstrapSh
  return replacePlaceholders(tpl, {
    WEBI_HOST: q(host),
    WEBI_PKG: q(slug),
    WEBI_VER: q(version),
  })
}

export function renderInstaller({ host, slug, version, tag, pkgUrl, toolEntry, kind }) {
  const q = kind === 'ps1' ? quotePs1 : quoteSh
  const tpl = kind === 'ps1' ? WEBI_TEMPLATES.templatePs1 : WEBI_TEMPLATES.templateSh
  const pkgScript = kind === 'ps1' ? toolEntry.installPs1 : toolEntry.installSh

  return replacePlaceholders(tpl, {
    WEBI_HOST: q(host),
    WEBI_PKG: q(slug),
    WEBI_VERSION: q(version),
    WEBI_TAG: q(tag),
    WEBI_PKG_URL: q(pkgUrl),
    PKG_INSTALL_SCRIPT: pkgScript || '',
  })
}

export function renderErrorScript(kind, message) {
  if (kind === 'ps1') {
    return `Write-Error ${quotePs1(message)}\nexit 1\n`
  }
  return `printf '%s\\n' ${quoteSh(`error: ${message}`)} >&2\nexit 1\n`
}

