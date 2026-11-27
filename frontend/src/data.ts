import generatedCatalog from './catalog.generated.json'

export type Os = 'macos' | 'linux' | 'windows'
export type CrossOsMethod = 'npm' | 'pip' | 'uv' | 'cargo' | 'go'
export type Block = { h?: string; p?: string; code?: string }
export type Tool = {
  name: string
  title?: string
  tagline: string
  version: string
  tags: string[]
  homepage: string
  npm?: string
  pip?: string
  uv?: string
  cargo?: string
  go?: string
  brew?: string
  listedAt?: string
  updatedAt?: string
  updates?: number
  cheat?: Block[]
}

export const SITE = 'https://opengadget.dev'
export const HOST = 'opengadget.dev'
export const REPO = 'https://github.com/TRUCE-and-PEACE/opengadget.dev'
export const TOOLS_REPO = 'https://github.com/TRUCE-and-PEACE/og-tools'

export const safeUrl = (url: string): string => (/^https?:\/\//i.test(url) ? url : REPO)

export const TOOLS: Tool[] = (generatedCatalog as Tool[]).map((t) => ({
  ...t,
  homepage: safeUrl(t.homepage),
}))

export const findTool = (name: string) => TOOLS.find((t) => t.name === name)

export const installCmd = (tool: string, os: Os, version = '') => {
  const t = version && version !== 'stable' ? `${tool}@${version}` : tool
  return os === 'windows' ? `irm ${HOST}/${t} | iex` : `curl -sSL ${HOST}/${t} | sh`
}

export function getCrossOsMethods(tool: Tool): { id: CrossOsMethod; label: string; cmd: (ver?: string) => string }[] {
  const list: { id: CrossOsMethod; label: string; cmd: (ver?: string) => string }[] = []
  if (tool.npm) {
    list.push({
      id: 'npm',
      label: 'npm',
      cmd: (v) => `npm install -g ${tool.npm}${v ? '@' + v.replace(/^v/, '') : ''}`,
    })
  }
  if (tool.pip) {
    list.push({
      id: 'pip',
      label: 'pip',
      cmd: (v) => `pip install ${tool.pip}${v ? '==' + v.replace(/^v/, '') : ''}`,
    })
  }
  if (tool.uv) {
    list.push({
      id: 'uv',
      label: 'uv',
      cmd: (v) => `uv tool install ${tool.uv}${v ? '==' + v.replace(/^v/, '') : ''}`,
    })
  }
  if (tool.cargo) {
    list.push({
      id: 'cargo',
      label: 'cargo',
      cmd: (v) => `cargo install ${tool.cargo}${v ? ' --version ' + v.replace(/^v/, '') : ''}`,
    })
  }
  if (tool.go) {
    list.push({
      id: 'go',
      label: 'go',
      cmd: (v) => `go install ${tool.go}@${v || 'latest'}`,
    })
  }
  return list
}

export function primaryInstallCmd(tool: Tool, os: Os): string {
  const cross = getCrossOsMethods(tool)
  return cross.length ? cross[0].cmd() : installCmd(tool.name, os)
}
