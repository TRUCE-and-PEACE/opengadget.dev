import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { injectOgTags } from '../functions/_lib/og.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DEFAULT_TOOLS_REPO = 'https://github.com/TRUCE-and-PEACE/og-tools.git'
const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/
const REPO_RE = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/
const RESERVED_DIRS = new Set(['node_modules', 'dist', 'frontend', 'functions', 'scripts'])

function parseYamlValue(raw) {
  const val = raw.trim()
  if (val.startsWith('[') && val.endsWith(']')) {
    return val
      .slice(1, -1)
      .split(',')
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean)
  }
  return val.replace(/^['"]|['"]$/g, '')
}

function parseFrontmatter(content) {
  const normalized = content.replace(/\r\n/g, '\n')
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) {
    throw new Error('Missing YAML frontmatter delimited by ---')
  }

  const meta = {}
  let activeListKey = null
  for (const line of match[1].split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const listMatch = line.match(/^\s*-\s+(.+)$/)
    if (listMatch && activeListKey) {
      meta[activeListKey].push(listMatch[1].trim().replace(/^['"]|['"]$/g, ''))
      continue
    }

    const kv = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/)
    if (!kv) continue

    const [, key, rawVal] = kv
    if (!rawVal.trim()) {
      meta[key] = []
      activeListKey = key
    } else {
      meta[key] = parseYamlValue(rawVal)
      activeListKey = null
    }
  }

  return { meta, body: match[2] }
}

function parseCheatMarkdown(body) {
  const blocks = []
  const lines = body.replace(/\r\n/g, '\n').split('\n')

  let current = {}
  let paragraphLines = []
  let inCode = false
  let codeLines = []

  const flushParagraph = () => {
    if (!paragraphLines.length) return
    const text = paragraphLines.join(' ').trim()
    paragraphLines = []
    if (!text) return
    if (current.p || current.code) {
      blocks.push(current)
      current = {}
    }
    current.p = text
  }

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCode) {
        inCode = false
        current.code = codeLines.join('\n')
        codeLines = []
        blocks.push(current)
        current = {}
      } else {
        flushParagraph()
        inCode = true
        codeLines = []
      }
      continue
    }

    if (inCode) {
      codeLines.push(line)
      continue
    }

    const heading = line.match(/^#{1,6}\s+(.+)$/)
    if (heading) {
      flushParagraph()
      if (current.h || current.p || current.code) {
        blocks.push(current)
        current = {}
      }
      current.h = heading[1].trim()
      continue
    }

    if (!line.trim()) {
      flushParagraph()
      continue
    }

    paragraphLines.push(line.trim())
  }

  flushParagraph()
  if (current.h || current.p || current.code) {
    blocks.push(current)
  }
  return blocks
}

function parseReleasesConf(content) {
  const conf = {}
  for (const rawLine of content.replace(/\r\n/g, '\n').split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    const val = line.slice(eq + 1).trim()
    conf[key] = val
  }
  if (!conf.github_sources || !REPO_RE.test(conf.github_sources)) {
    throw new Error(`Invalid github_sources in releases.conf: ${conf.github_sources}`)
  }
  if (!conf.tag_prefix) conf.tag_prefix = 'v'
  return conf
}

function resolveToolsSource() {
  const localDir = process.env.OG_TOOLS_DIR?.trim()
  if (localDir) {
    return { dir: path.resolve(localDir), cleanup: () => {} }
  }

  const repoUrl = process.env.OG_TOOLS_REPO?.trim() || DEFAULT_TOOLS_REPO
  if (!/^https:\/\//i.test(repoUrl)) {
    throw new Error(`OG_TOOLS_REPO must be an https:// URL (got: ${repoUrl})`)
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'og-tools-'))
  try {
    execFileSync('git', ['clone', '--depth', '1', '--branch', 'main', repoUrl, tmpDir], {
      stdio: 'pipe',
    })
  } catch (err) {
    fs.rmSync(tmpDir, { recursive: true, force: true })
    throw err
  }

  return {
    dir: tmpDir,
    cleanup: () => fs.rmSync(tmpDir, { recursive: true, force: true }),
  }
}

function collectTools(toolsRoot) {
  const entries = fs.readdirSync(toolsRoot, { withFileTypes: true })
  const tools = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const slug = entry.name
    if (!SLUG_RE.test(slug) || RESERVED_DIRS.has(slug)) continue

    const dir = path.join(toolsRoot, slug)
    const readmePath = path.join(dir, 'README.md')
    const confPath = path.join(dir, 'releases.conf')
    if (!fs.existsSync(readmePath) || !fs.existsSync(confPath)) continue

    const { meta, body } = parseFrontmatter(fs.readFileSync(readmePath, 'utf8'))
    const releasesConf = parseReleasesConf(fs.readFileSync(confPath, 'utf8'))

    const homepage = String(meta.homepage || '')
    if (!/^https?:\/\//i.test(homepage)) {
      throw new Error(`${slug}/README.md: homepage must start with http:// or https://`)
    }

    const tags = Array.isArray(meta.tags)
      ? meta.tags
      : typeof meta.tags === 'string'
        ? [meta.tags]
        : []

    const catalogEntry = {
      name: slug,
      title: String(meta.title || slug),
      tagline: String(meta.tagline || ''),
      version: String(meta.version || 'v1.0.0'),
      tags,
      homepage,
      ...(meta.npm ? { npm: String(meta.npm) } : {}),
      ...(meta.pip ? { pip: String(meta.pip) } : {}),
      ...(meta.uv ? { uv: String(meta.uv) } : {}),
      ...(meta.cargo ? { cargo: String(meta.cargo) } : {}),
      ...(meta.go ? { go: String(meta.go) } : {}),
      ...(meta.brew ? { brew: String(meta.brew) } : {}),
      cheat: parseCheatMarkdown(body),
    }

    const installShPath = path.join(dir, 'install.sh')
    const installPs1Path = path.join(dir, 'install.ps1')
    const installSh = fs.existsSync(installShPath)
      ? fs.readFileSync(installShPath, 'utf8').replace(/\r\n/g, '\n')
      : ''
    const installPs1 = fs.existsSync(installPs1Path)
      ? fs.readFileSync(installPs1Path, 'utf8').replace(/\r\n/g, '\n')
      : ''

    tools.push({ slug, catalogEntry, releasesConf, installSh, installPs1 })
  }

  tools.sort((a, b) => a.slug.localeCompare(b.slug))
  return tools
}

function buildCatalog() {
  const source = resolveToolsSource()
  let tools
  try {
    tools = collectTools(source.dir)
  } finally {
    source.cleanup()
  }

  const catalog = tools.map((t) => t.catalogEntry)

  const publicDir = path.join(ROOT, 'frontend', 'public')
  const srcDir = path.join(ROOT, 'frontend', 'src')
  const fnLibDir = path.join(ROOT, 'functions', '_lib')
  fs.mkdirSync(publicDir, { recursive: true })
  fs.mkdirSync(srcDir, { recursive: true })
  fs.mkdirSync(fnLibDir, { recursive: true })

  const catalogJson = JSON.stringify(catalog, null, 2) + '\n'
  fs.writeFileSync(path.join(publicDir, 'catalog.json'), catalogJson, 'utf8')
  fs.writeFileSync(path.join(srcDir, 'catalog.generated.json'), catalogJson, 'utf8')

  const readWebi = (file) =>
    fs.readFileSync(path.join(ROOT, '_webi', file), 'utf8').replace(/\r\n/g, '\n')

  const templates = {
    bootstrapSh: readWebi('bootstrap.sh'),
    bootstrapPs1: readWebi('bootstrap.ps1'),
    templateSh: readWebi('template.sh'),
    templatePs1: readWebi('template.ps1'),
  }

  const registry = Object.fromEntries(
    tools.map((t) => [
      t.slug,
      {
        meta: t.catalogEntry,
        releasesConf: t.releasesConf,
        installSh: t.installSh,
        installPs1: t.installPs1,
      },
    ]),
  )

  const generatedModule = `// AUTO-GENERATED by scripts/build-catalog.js — DO NOT EDIT
export const WEBI_TEMPLATES = ${JSON.stringify(templates, null, 2)};

export const REGISTRY = ${JSON.stringify(registry, null, 2)};
`
  fs.writeFileSync(path.join(fnLibDir, 'generated-registry.js'), generatedModule, 'utf8')
  console.log(`Built catalog & registry for ${tools.length} tool(s): ${tools.map((t) => t.slug).join(', ')}`)
  return catalog
}

function buildOgPages(catalog) {
  const distDir = path.join(ROOT, 'dist')
  const indexPath = path.join(distDir, 'index.html')
  if (!fs.existsSync(indexPath)) {
    throw new Error('dist/index.html not found; run vite build before --og-only')
  }
  const baseHtml = fs.readFileSync(indexPath, 'utf8')

  for (const tool of catalog) {
    const toolDir = path.join(distDir, tool.name)
    fs.mkdirSync(toolDir, { recursive: true })
    const html = injectOgTags(baseHtml, tool, 'https://opengadget.dev')
    fs.writeFileSync(path.join(toolDir, 'index.html'), html, 'utf8')
  }
  console.log(`Generated static OG pages for ${catalog.length} tool(s) in dist/`)
}

const ogOnly = process.argv.includes('--og-only')
const catalog = ogOnly
  ? JSON.parse(fs.readFileSync(path.join(ROOT, 'frontend', 'public', 'catalog.json'), 'utf8'))
  : buildCatalog()

if (ogOnly) {
  buildOgPages(catalog)
}
