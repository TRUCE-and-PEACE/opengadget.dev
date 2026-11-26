import { useEffect, useRef, useState, type ReactNode } from 'react'
import { TOOLS_REPO, installCmd, type Os, type Tool } from './data'

export const go = (path: string) => {
  history.pushState(null, '', path)
  dispatchEvent(new PopStateEvent('popstate'))
  scrollTo(0, 0)
}

export function Link({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  return (
    <a
      href={to}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return
        e.preventDefault()
        go(to)
      }}
    >
      {children}
    </a>
  )
}

const svg = (d: ReactNode, size = 16) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
)
export const Icon = {
  copy: svg(<><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></>),
  check: svg(<path d="M20 6 9 17l-5-5" />),
  search: svg(<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>),
  sun: svg(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>),
  moon: svg(<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />),
  plus: svg(<path d="M12 5v14M5 12h14" />),
  arrow: svg(<path d="M5 12h14M13 6l6 6-6 6" />),
  external: svg(<path d="M7 17 17 7M8 7h9v9" />, 14),
  github: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .5z" />
    </svg>
  ),
  linktree: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.5 2h-3v4.8L7.1 3.4 5 5.5l3.5 3.4H3v3h5.5L5 15.3l2.1 2.1 3.4-3.4V22h3v-8l3.4 3.4 2.1-2.1-3.5-3.4H21v-3h-5.5L19 5.5l-2.1-2.1-3.4 3.4V2z" />
    </svg>
  ),
}

export function useCopy() {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const copy = (text: string) => {
    // shortcut: no execCommand fallback, clipboard API needs a secure context (fine on https/localhost)
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 1600)
  }
  return { copied, copy }
}

export function CopyButton({ text, forced, label = 'Copy', compact }: { text: string; forced?: boolean; label?: string; compact?: boolean }) {
  const { copied: c, copy } = useCopy()
  const copied = forced ?? c
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        copy(text)
      }}
      aria-label={copied ? 'Copied' : `Copy: ${text}`}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border font-mono text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        compact ? 'h-7 px-2' : 'h-8 px-3'
      } ${copied ? 'border-accent bg-accent text-accent-fg' : 'border-line-strong bg-panel text-fg hover:border-fg'}`}
    >
      {copied ? Icon.check : Icon.copy}
      <span aria-live="polite">{copied ? 'Copied!' : label}</span>
    </button>
  )
}

export function Tabs<T extends string>({ value, onChange, options, size = 'md' }: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[]; size?: 'sm' | 'md' }) {
  return (
    <div role="tablist" className="inline-flex rounded-lg border border-line bg-raised p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          role="tab"
          type="button"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={`rounded-md font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent ${size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'} ${
            value === o.id ? 'bg-panel text-fg shadow-[0_0_0_1px_var(--line-strong)]' : 'text-muted hover:text-fg'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Chip({ selected, onClick, children }: { selected?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`h-8 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        selected ? 'border-fg bg-fg text-bg' : 'border-line bg-panel text-muted hover:border-line-strong hover:text-fg'
      }`}
    >
      {children}
    </button>
  )
}

export const Tag = ({ children }: { children: ReactNode }) => (
  <span className="rounded border border-line px-1.5 py-0.5 font-mono text-[11px] text-muted">{children}</span>
)

export const Monogram = ({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) => (
  <span
    aria-hidden="true"
    className={`grid shrink-0 place-items-center rounded-lg border border-line-strong bg-raised font-mono font-semibold text-fg ${size === 'lg' ? 'size-14 text-xl' : 'size-10 text-sm'}`}
  >
    {name.slice(0, 2)}
  </span>
)

export function CommandLine({ cmd, compact }: { cmd: string; compact?: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-lg border border-line bg-bg ${compact ? 'py-1 pr-1 pl-3' : 'py-2 pr-2 pl-4'}`}>
      <code className={`min-w-0 flex-1 overflow-x-auto font-mono whitespace-nowrap text-fg ${compact ? 'text-xs' : 'text-sm sm:text-base'}`}>
        <span className="text-accent select-none">$ </span>
        {cmd}
      </code>
      <CopyButton text={cmd} compact={compact} />
    </div>
  )
}

export function ToolCard({ tool, os, hover }: { tool: Tool; os: Os; hover?: boolean }) {
  const cmd = installCmd(tool.name, os)
  return (
    <div className={`relative flex flex-col gap-4 rounded-xl border bg-panel p-4 transition-colors has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-accent ${hover ? 'border-fg' : 'border-line hover:border-fg'}`}>
      <div className="flex items-start gap-3">
        <Monogram name={tool.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate font-mono font-semibold">
              {/* stretched link: whole card navigates, copy button stays a separate control */}
              <Link to={`/${tool.name}`} className="outline-none after:absolute after:inset-0 after:rounded-xl">
                {tool.name}
              </Link>
            </h3>
            <span className="shrink-0 font-mono text-xs text-faint">{tool.version}</span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted">{tool.tagline}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tool.tags.map((t) => (
          <Tag key={t}>{t}</Tag>
        ))}
      </div>
      <div className="relative z-[1] mt-auto">
        <CommandLine cmd={cmd} compact />
      </div>
    </div>
  )
}

export function Empty({ query, onReset }: { query: string; onReset?: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong px-6 py-14 text-center">
      <p className="font-mono text-sm text-faint">0 results</p>
      <p className="mt-2 text-lg font-semibold">{query ? `No tool matches "${query}"` : 'No tools published yet'}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
        {query ? 'Check the spelling, or add it yourself. Every tool is one folder in the repo.' : 'Every tool is one folder in the repo. Open a PR to add the first one.'}
      </p>
      <div className="mt-5 flex justify-center gap-2">
        {onReset && (
          <button type="button" onClick={onReset} className="h-9 rounded-md border border-line-strong px-3 text-sm font-medium hover:border-fg">
            Clear search
          </button>
        )}
        <a href={TOOLS_REPO} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-md bg-fg px-3 text-sm font-medium text-bg">
          {Icon.plus} Add a tool
        </a>
      </div>
    </div>
  )
}

