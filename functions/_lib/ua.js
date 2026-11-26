const MAX_UA_LEN = 512

export function normalizeUa(raw) {
  return typeof raw === 'string' ? raw.slice(0, MAX_UA_LEN) : ''
}

export function classifyClient(rawUa) {
  const ua = normalizeUa(rawUa)
  if (/powershell|invoke-webrequest/i.test(ua)) return 'powershell'
  if (/^(curl|wget|httpie|fetch|libfetch|aria2|lwp-request)\b/i.test(ua)) return 'posix'
  return 'browser'
}

const ALLOWED_OS = new Set(['macos', 'linux', 'windows'])
const ALLOWED_ARCH = new Set(['amd64', 'arm64', 'x86'])
const ALLOWED_FORMATS = new Set(['tar', 'zip', 'xz'])

export function parseBootstrapCapabilities(rawUa, ext) {
  const ua = normalizeUa(rawUa)
  const defaultOs = ext === 'ps1' ? 'windows' : 'linux'
  const osMatch = ua.match(/\bos=(macos|linux|windows)\b/i)
  const archMatch = ua.match(/\barch=(amd64|arm64|x86)\b/i)
  const fmtMatch = ua.match(/\bformats=([a-z,]+)\b/i)

  const osRaw = osMatch ? osMatch[1].toLowerCase() : defaultOs
  const archRaw = archMatch ? archMatch[1].toLowerCase() : 'amd64'
  const formats = fmtMatch
    ? fmtMatch[1]
        .toLowerCase()
        .split(',')
        .filter((f) => ALLOWED_FORMATS.has(f))
    : ext === 'ps1'
      ? ['zip']
      : ['tar', 'zip']

  return {
    os: ALLOWED_OS.has(osRaw) ? osRaw : defaultOs,
    arch: ALLOWED_ARCH.has(archRaw) ? archRaw : 'amd64',
    formats: formats.length ? formats : ext === 'ps1' ? ['zip'] : ['tar'],
  }
}

