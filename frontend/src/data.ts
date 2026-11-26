import generatedCatalog from './catalog.generated.json'

export type Os = 'macos' | 'linux' | 'windows'
export type Block = { h?: string; p?: string; code?: string }
export type Tool = {
  name: string
  title?: string
  tagline: string
  version: string
  tags: string[]
  homepage: string
  npm?: string
  brew?: string
  cheat?: Block[]
}

export const SITE = 'https://opengadget.dev'
export const REPO = 'https://github.com/yv3000/opengadget.dev'
export const TOOLS_REPO = 'https://github.com/yv3000/og-tools'

export const safeUrl = (url: string): string => (/^https?:\/\//i.test(url) ? url : REPO)

export const TOOLS: Tool[] = (generatedCatalog as Tool[]).map((t) => ({
  ...t,
  homepage: safeUrl(t.homepage),
}))

export const CATEGORIES: string[] = [
  'All',
  ...Array.from(new Set(TOOLS.flatMap((t) => t.tags))),
]

export const findTool = (name: string) => TOOLS.find((t) => t.name === name)

export const installCmd = (tool: string, os: Os, version = '') => {
  const t = version && version !== 'stable' ? `${tool}@${version}` : tool
  return os === 'windows' ? `irm ${SITE}/${t} | iex` : `curl -sS ${SITE}/${t} | sh`
}
