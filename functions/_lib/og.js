export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function injectOgTags(html, tool, origin = 'https://opengadget.dev') {
  if (!tool || typeof tool.name !== 'string') return html

  const safeOrigin = String(origin).replace(/\/+$/, '')
  const title = escapeHtml(`${tool.name} · opengadget.dev`)
  const description = escapeHtml(tool.tagline || `${tool.name} one-line installer`)
  const url = escapeHtml(`${safeOrigin}/${tool.name}`)

  let out = html
  out = out.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${title}</title>`)
  out = out.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    () => `<meta name="description" content="${description}" />`,
  )
  out = out.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    () => `<meta property="og:title" content="${title}" />`,
  )
  out = out.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    () => `<meta property="og:description" content="${description}" />`,
  )
  out = out.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    () => `<meta property="og:url" content="${url}" />`,
  )
  return out
}

