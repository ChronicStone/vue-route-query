// Writes sitemap.xml from the prerendered pages, so it never drifts from the content.
import { readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const publicDir = new URL('../.output/public/', import.meta.url).pathname
const siteUrl = (process.env.NUXT_PUBLIC_SITE_URL || 'https://vue-route-query.vercel.app').replace(
  /\/$/,
  '',
)

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      return name.startsWith('_') ? [] : htmlFiles(path)
    }
    return name.endsWith('.html') ? [path] : []
  })
}

const routes = htmlFiles(publicDir)
  .map(
    (file) =>
      `/${relative(publicDir, file).replace(/(index)?\.html$/, '')}`.replace(/\/$/, '') || '/',
  )
  .filter((route) => !['/200', '/404'].includes(route))
  .sort()

const urls = routes.map(
  (route) => `  <url><loc>${siteUrl}${route === '/' ? '/' : route}</loc></url>`,
)
writeFileSync(
  join(publicDir, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
)
console.log(`sitemap.xml: ${routes.length} pages`)
