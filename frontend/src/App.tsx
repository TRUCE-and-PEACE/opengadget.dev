import { useEffect, useRef, useState } from 'react'
import { REPO, TOOLS_REPO, findTool } from './data'
import { Detail, Home, NotFound } from './pages'
import { Icon, Link, go } from './ui'

export default function App() {
  const [path, setPath] = useState(location.pathname)
  const [dark, setDark] = useState(() => localStorage.theme !== 'light')
  const [q, setQ] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const on = () => setPath(location.pathname)
    addEventListener('popstate', on)
    return () => removeEventListener('popstate', on)
  }, [])
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.theme = dark ? 'dark' : 'light'
  }, [dark])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key === 'Escape' && document.activeElement === searchRef.current) {
        if (q) setQ('')
        else searchRef.current?.blur()
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [q])

  const slug = path.replace(/^\/+|\/+$/g, '')
  const [toolSlug, rawVer] = slug.split('@')
  const tool = findTool(toolSlug)
  const page = !slug
    ? <Home q={q} onResetSearch={() => setQ('')} />
    : tool
      ? <Detail key={`${tool.name}@${rawVer || 'stable'}`} tool={tool} initialVersion={rawVer} />
      : <NotFound path={path} />

  useEffect(() => {
    document.title = tool ? `${tool.name} · OG` : 'OG'
  }, [tool])

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-bg/85 backdrop-blur">
        <nav className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-5">
          <Link to="/" className="mr-auto flex items-center gap-2 font-mono text-[15px] font-semibold">
            <span className="grid size-7 place-items-center rounded-md bg-fg text-bg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="8" cy="12" r="4" />
                <path d="M19 9.5a4 4 0 1 0 0 5h-3v-2h3" />
                <path d="M3 18.5C7 16 17 8 21 5.5" />
              </svg>
            </span>
            opengadget<span className="text-faint">.dev</span>
          </Link>
          <label className="relative flex items-center">
            <span className="sr-only">Search tools</span>
            <span className="pointer-events-none absolute left-2.5 text-faint">{Icon.search}</span>
            <input
              ref={searchRef}
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                if (slug) go('/')
              }}
              placeholder="Search tools..."
              className="h-9 w-36 rounded-md border border-line bg-panel pr-7 pl-8 text-sm outline-none placeholder:text-faint focus:border-fg sm:w-56"
            />
            <kbd className="pointer-events-none absolute right-2 rounded border border-line px-1 font-mono text-xs text-faint">/</kbd>
          </label>
          <a
            href={TOOLS_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-fg px-3 text-sm font-medium text-bg"
            aria-label="Add a tool on GitHub"
          >
            {Icon.github} <span className="hidden sm:inline">Add a Tool</span>
          </a>
          <button
            type="button"
            onClick={() => setDark(!dark)}
            aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`}
            className="grid size-9 place-items-center rounded-md border border-line text-muted hover:border-line-strong hover:text-fg"
          >
            {dark ? Icon.sun : Icon.moon}
          </button>
        </nav>
      </header>
      <main className="flex-1">{page}</main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 font-mono text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <a href={REPO} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-fg">
            {Icon.github} github.com/TRUCE-and-PEACE/opengadget.dev
          </a>
          <div className="flex items-center gap-5">
            <a href="https://linktr.ee/yv_3000" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-fg">
              {Icon.linktree} by @yv_3000
            </a>
            <span>MIT License</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
