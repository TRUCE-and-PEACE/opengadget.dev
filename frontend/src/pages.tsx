import { useMemo, useState, type ReactNode } from 'react'
import { CATEGORIES, REPO, TOOLS, installCmd, type Os, type Tool } from './data'
import { Chip, CommandLine, CopyButton, Empty, Icon, Link, Monogram, Tabs, Tag, ToolCard } from './ui'

const OS2 = [
  { id: 'macos' as Os, label: 'macOS / Linux' },
  { id: 'windows' as Os, label: 'Windows' },
]
const guessOs = (): Os => (navigator.userAgent.includes('Win') ? 'windows' : 'macos')

export function Home({ q, onResetSearch }: { q: string; onResetSearch: () => void }) {
  const [os, setOs] = useState<Os>(guessOs)
  const [cat, setCat] = useState('All')

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return TOOLS.filter((t) => (cat === 'All' || t.tags.includes(cat)) && (!s || t.name.includes(s) || t.tagline.toLowerCase().includes(s)))
  }, [q, cat])

  const heroTool = TOOLS[0]?.name ?? '<tool>'
  const heroHint = TOOLS[0] ? `replace ${heroTool} with any tool` : 'replace <tool> with any tool name'

  return (
    <>
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-5 pt-16 pb-14 sm:pt-24 sm:pb-20">
          <p className="font-mono text-xs tracking-wider text-accent uppercase">No sudo · No package manager bloat · One command</p>
          <h1 className="mt-4 max-w-3xl text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
            Install any dev tool with one line.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            Every tool lands in your home folder at <code className="font-mono text-fg">~/.local/bin</code>. No root, no daemons, nothing to uninstall but a folder.
          </p>
          <div className="mt-10 max-w-2xl rounded-xl border border-line bg-panel p-3">
            <div className="flex items-center justify-between gap-3 px-1 pb-3">
              <Tabs value={os === 'linux' ? 'macos' : os} onChange={setOs} options={OS2} size="sm" />
              <span className="hidden font-mono text-xs text-faint sm:inline">{heroHint}</span>
            </div>
            <CommandLine cmd={installCmd(heroTool, os)} />
          </div>
        </div>
      </section>

      <section id="tools" className="mx-auto max-w-6xl px-5 py-14">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
            {CATEGORIES.map((c) => (
              <Chip key={c} selected={cat === c} onClick={() => setCat(c)}>
                {c}
              </Chip>
            ))}
          </div>
          <p className="font-mono text-xs text-faint">
            {list.length} of {TOOLS.length} tools
          </p>
        </div>
        <div className="mt-4">
          {list.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((t) => (
                <ToolCard key={t.name} tool={t} os={os} />
              ))}
            </div>
          ) : (
            <Empty
              query={q}
              onReset={
                q || cat !== 'All'
                  ? () => {
                      onResetSearch()
                      setCat('All')
                    }
                  : undefined
              }
            />
          )}
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
          <ol className="mt-8 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
            {[
              ['Pick a tool', 'Browse or search the catalog above.'],
              ['Run one command', 'curl on macOS and Linux, irm on Windows.'],
              ['It lands in ~/.local/bin', 'Added to your PATH. No sudo, ever.'],
            ].map(([t, d], i) => (
              <li key={t} className="bg-panel p-6">
                <span className="font-mono text-sm text-accent">0{i + 1}</span>
                <p className="mt-3 font-semibold">{t}</p>
                <p className="mt-1 text-sm text-muted">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  )
}

const OS3 = [
  { id: 'macos' as Os, label: 'macOS' },
  { id: 'linux' as Os, label: 'Linux' },
  { id: 'windows' as Os, label: 'Windows' },
]

export function Detail({ tool, initialVersion }: { tool: Tool; initialVersion?: string }) {
  const [os, setOs] = useState<Os>(guessOs)
  const [method, setMethod] = useState<'shell' | 'npm' | 'brew'>('shell')
  const [version, setVersion] = useState(initialVersion || 'stable')

  const versionOptions = Array.from(new Set(['stable', tool.version, ...(initialVersion && initialVersion !== 'stable' ? [initialVersion] : []), 'beta']))

  const methods = [
    { id: 'shell' as const, label: os === 'windows' ? 'PowerShell' : 'curl' },
    ...(tool.npm ? [{ id: 'npm' as const, label: 'npm' }] : []),
    ...(tool.brew && os !== 'windows' ? [{ id: 'brew' as const, label: 'brew' }] : []),
  ]
  const m = methods.some((x) => x.id === method) ? method : 'shell'
  const v = version === 'stable' ? '' : version
  const cmd =
    m === 'npm' ? `npm install -g ${tool.npm}${v ? '@' + v.replace(/^v/, '') : ''}` : m === 'brew' ? `brew install ${tool.brew}` : installCmd(tool.name, os, version)
  const win = os === 'windows'
  const verSuffix = version === 'stable' || version === 'beta' ? tool.version : version
  const paths = win
    ? [`%USERPROFILE%\\.local\\bin\\${tool.name}.cmd`, `%USERPROFILE%\\.local\\opt\\${tool.name}-${verSuffix}\\`, '%USERPROFILE%\\.config\\envman\\PATH.env']
    : [`~/.local/bin/${tool.name}`, `~/.local/opt/${tool.name}-${verSuffix}/`, '~/.config/envman/PATH.env']
  const cheat = tool.cheat ?? [
    { p: `${tool.name} is installed as a single binary. Check it works:` },
    { h: 'Verify', code: `${tool.name} --version` },
    { h: 'Update to latest', code: installCmd(tool.name, os) },
  ]

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      <Link to="/" className="font-mono text-sm text-muted hover:text-fg">
        ← all tools
      </Link>
      <header className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-4">
          <Monogram name={tool.name} size="lg" />
          <div>
            <h1 className="font-mono text-3xl font-semibold tracking-tight sm:text-4xl">{tool.name}</h1>
            <p className="mt-1.5 text-muted">{tool.tagline}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tool.tags.map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="ver">
            Version
          </label>
          <select
            id="ver"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            className="h-9 rounded-md border border-line-strong bg-panel px-2.5 font-mono text-sm outline-none focus:border-fg"
          >
            {versionOptions.map((opt) => (
              <option key={opt} value={opt}>
                @{opt}
              </option>
            ))}
          </select>
          <a href={tool.homepage} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-strong px-3 text-sm font-medium hover:border-fg">
            {tool.homepage.includes('github.com') ? Icon.github : null} Homepage {Icon.external}
          </a>
        </div>
      </header>

      <section aria-label="Install" className="mt-10 rounded-xl border border-line bg-panel p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
          <Tabs value={os} onChange={setOs} options={OS3} size="sm" />
          <Tabs value={m} onChange={setMethod} options={methods} size="sm" />
        </div>
        <CommandLine cmd={cmd} />
        {m === 'shell' && <p className="mt-3 px-1 text-xs text-muted">Installs {version === 'stable' ? 'the latest stable release' : `@${version}`} to your home folder. No sudo prompt.</p>}
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
        <article>
          <h2 className="text-xl font-semibold tracking-tight">Cheat sheet &amp; usage</h2>
          <div className="mt-5 space-y-6">
            {cheat.map((b, i) => (
              <div key={i}>
                {b.h && <h3 className="mb-2 font-semibold">{b.h}</h3>}
                {b.p && <p className="mb-3 text-muted">{b.p}</p>}
                {b.code && <CodeBlock code={b.code} />}
              </div>
            ))}
          </div>
        </article>
        <aside className="h-fit rounded-xl border border-line bg-panel p-5 lg:sticky lg:top-20">
          <h2 className="font-semibold">What gets installed</h2>
          <ul className="mt-4 space-y-3">
            {paths.map((p, i) => (
              <li key={p}>
                <p className="text-xs text-faint">{['Binary', 'Versioned files', 'PATH entry'][i]}</p>
                <code className="mt-0.5 block font-mono text-sm break-all">{p}</code>
              </li>
            ))}
          </ul>
          <div className="mt-5 border-t border-line pt-4">
            <p className="text-xs text-faint">Uninstall</p>
            <p className="mt-1 text-sm text-muted">
              Delete the paths above. <code className="font-mono text-fg">{win ? `rm -r ~\\.local\\opt\\${tool.name}-${verSuffix}` : `rm -rf ~/.local/opt/${tool.name}-${verSuffix}`}</code>
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative rounded-lg border border-line bg-panel">
      <pre className="overflow-x-auto p-4 pr-24 font-mono text-sm leading-relaxed">
        {code.split('\n').map((l, i) => (
          <div key={i}>
            <span className="text-faint select-none">$ </span>
            {l}
          </div>
        ))}
      </pre>
      <div className="absolute top-2.5 right-2.5">
        <CopyButton text={code} compact />
      </div>
    </div>
  )
}

export function NotFound({ path }: { path: string }) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-24 text-center">
      <p className="font-mono text-sm text-accent">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">No tool at {path}</h1>
      <div className="mx-auto mt-6 max-w-md rounded-lg border border-line bg-panel p-4 text-left font-mono text-sm">
        <p className="text-muted">$ curl -sS opengadget.dev{path} | sh</p>
        <p className="mt-1 text-red-500">error: '{path.slice(1)}' not found in catalog</p>
      </div>
      <div className="mt-8 flex justify-center gap-2">
        <Link to="/" className="inline-flex h-10 items-center rounded-md bg-fg px-4 text-sm font-medium text-bg">
          Browse all tools
        </Link>
        <a href={REPO} className="inline-flex h-10 items-center gap-1.5 rounded-md border border-line-strong px-4 text-sm font-medium hover:border-fg">
          {Icon.github} Add it
        </a>
      </div>
    </div>
  )
}

export function States() {
  const t = TOOLS[0]
  const [s1, setS1] = useState<Os>('macos')
  const row = (label: string, children: ReactNode) => (
    <div className="grid gap-3 border-t border-line py-8 md:grid-cols-[200px_1fr]">
      <p className="font-mono text-sm text-muted">{label}</p>
      <div className="flex flex-wrap items-start gap-6">{children}</div>
    </div>
  )
  const cap = (s: string, c: ReactNode) => (
    <div className="min-w-0 flex-1 basis-72">
      <p className="mb-2 font-mono text-xs text-faint">{s}</p>
      {c}
    </div>
  )
  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <h1 className="text-3xl font-semibold tracking-tight">States &amp; components</h1>
      <p className="mt-2 text-muted">Every interactive piece of opengadget.dev, in each state. Toggle the theme to see both modes.</p>
      <div className="mt-10">
        {t && row('Tool card', <>{cap('default', <ToolCard tool={t} os="macos" />)}{cap('hover', <ToolCard tool={t} os="macos" hover />)}</>)}
        {row('Copy button', <>{cap('default', <CopyButton text="x" forced={false} />)}{cap('copied', <CopyButton text="x" forced />)}</>)}
        {row(
          'OS tabs',
          <>
            {cap('macOS active', <Tabs value="macos" onChange={() => {}} options={OS3} />)}
            {cap('interactive', <Tabs value={s1} onChange={setS1} options={OS3} />)}
          </>,
        )}
        {row('Tag chips', <>{cap('default', <Chip>DevTools</Chip>)}{cap('selected', <Chip selected>DevTools</Chip>)}</>)}
        {row('Empty search', <div className="w-full">{<Empty query="kubectl-ultra" />}</div>)}
        {row(
          '404 page',
          <div className="w-full overflow-hidden rounded-xl border border-line">
            <NotFound path="/kubectl-ultra" />
          </div>,
        )}
      </div>
    </div>
  )
}

