import { join } from 'node:path'

import { extendViteConfig, createResolver, useNuxt } from '@nuxt/kit'
// @ts-nocheck
import { defineNuxtConfig } from 'nuxt/config'

const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://vue-route-query.vercel.app'
const { resolve } = createResolver(import.meta.url)
const shikiOptimizeDeps = [
  '@shikijs/engine-javascript',
  '@shikijs/core',
  '@shikijs/transformers',
  '@shikijs/langs/shellscript',
  '@shikijs/langs/diff',
  '@shikijs/langs/json',
  '@shikijs/langs/javascript',
  '@shikijs/langs/typescript',
  '@shikijs/langs/html',
  '@shikijs/langs/css',
  '@shikijs/langs/vue',
  '@shikijs/langs/mdc',
  '@shikijs/langs/markdown',
  '@shikijs/langs/yaml',
  '@shikijs/langs/tsx',
  '@shikijs/themes/vitesse-light',
  '@shikijs/themes/vitesse-dark',
]

export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      siteUrl,
    },
  },
  alias: {},
  modules: [
    resolve('../../../node_modules/docus/modules/config.ts'),
    resolve('../../../node_modules/docus/modules/routing.ts'),
    resolve('../../../node_modules/docus/modules/markdown-rewrite.ts'),
    resolve('../../../node_modules/docus/modules/css.ts'),
    () => {
      const nuxt = useNuxt()
      const options = nuxt.options as typeof nuxt.options & {
        icon?: { customCollections?: Array<{ prefix: string; dir: string }> }
      }
      options.icon ||= {}
      options.icon.customCollections ||= []
      options.icon.customCollections.push({
        prefix: 'custom',
        dir: join(nuxt.options.srcDir, 'assets/icons'),
      })
    },
    '@nuxt/ui',
    'nuxt-content-twoslash',
    '@barzhsieh/nuxt-content-mermaid',
    '@nuxt/content',
    '@nuxt/image',
    '@nuxtjs/robots',
    '@nuxtjs/mcp-toolkit',
    'nuxt-og-image',
    'nuxt-llms',
    () => {
      extendViteConfig((config) => {
        config.optimizeDeps ||= {}
        config.optimizeDeps.include ||= []
        config.optimizeDeps.include.push('@nuxt/content > slugify')
        config.optimizeDeps.include.push(...shikiOptimizeDeps)
        config.optimizeDeps.include = config.optimizeDeps.include.map((id) =>
          id.replace(/^@nuxt\/content > /, 'docus > @nuxt/content > '),
        )

        if (process.env.AI_GATEWAY_API_KEY) {
          config.optimizeDeps.include.push('@vercel/oidc')
          config.optimizeDeps.include = config.optimizeDeps.include.map((id) =>
            id.replace(/^@vercel\/oidc$/, 'docus > @vercel/oidc'),
          )
        }
      })
    },
  ],
  css: [resolve('../app/assets/css/theme.css')],
  app: {
    head: {
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },
  content: {
    experimental: { sqliteConnector: 'native' },
    build: {
      markdown: {
        highlight: {
          langs: [
            'bash',
            'diff',
            'json',
            'js',
            'ts',
            'html',
            'css',
            'vue',
            'shell',
            'mdc',
            'md',
            'yaml',
          ],
        },
        remarkPlugins: {
          'remark-mdc': {
            options: {
              autoUnwrap: true,
            },
          },
        },
      },
    },
  },
  contentMermaid: {
    enabled: true,
    theme: {
      light: 'neutral',
      dark: 'dark',
    },
    toolbar: {
      buttons: {
        copy: true,
        expand: true,
        fullscreen: true,
      },
    },
  },
  mdc: {
    highlight: {
      shikiEngine: 'javascript',
      theme: {
        light: 'vitesse-light',
        default: 'vitesse-light',
        dark: 'vitesse-dark',
      },
      langs: ['ts', 'tsx', 'js', 'json', 'vue', 'bash', 'diff', 'html', 'css', 'md', 'yaml'],
    },
  },
  twoslash: {
    enableInDev: true,
    includeNuxtTypes: true,
    floatingVueOptions: {
      classCopyIgnore: 'vp-copy-ignore',
    },
    throws: false,
  },
  experimental: {
    asyncContext: true,
    // Nuxt 4.4 caches the home payload under the key "/", which unstorage rejects, so the
    // landing page fails to prerender. Inline payloads avoid that cache (fixed in Nuxt 4.6).
    payloadExtraction: false,
  },
  compatibilityDate: '2025-07-22',
  llms: {
    domain: siteUrl,
    title: 'vue-route-query',
    description:
      'Typed URL query state for Vue and vue-router. Bind a query key to a ref, with codecs, batched writes, and grouped or dynamic keys.',
  },
  nitro: {
    prerender: {
      crawlLinks: true,
      failOnError: false,
      autoSubfolderIndex: false,
    },
    compatibilityDate: {
      vercel: '2025-07-14',
    },
    preset: 'static',
  },
  hooks: {
    'nitro:config'(nitroConfig) {
      const nuxt = useNuxt()

      const i18nOptions = (
        nuxt.options as typeof nuxt.options & {
          i18n?: { locales?: Array<string | { code: string }> }
        }
      ).i18n
      const routes: string[] = []

      if (!i18nOptions) {
        routes.push('/')
      } else {
        routes.push(
          ...((i18nOptions.locales?.map((locale) =>
            typeof locale === 'string' ? `/${locale}` : `/${locale.code}`,
          ) || []) as string[]),
        )
      }

      nitroConfig.prerender ||= {}
      nitroConfig.prerender.routes ||= []
      nitroConfig.prerender.routes.push(...routes)
    },
  } as Record<string, (...args: any[]) => void>,
  icon: {
    customCollections: [
      {
        prefix: 'custom',
        dir: resolve('./app/assets/icons'),
      },
    ],
    clientBundle: {
      scan: true,
      includeCustomCollections: true,
    },
    provider: 'iconify',
  },
  robots: {
    groups: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemap: '/sitemap.xml',
  },
})
