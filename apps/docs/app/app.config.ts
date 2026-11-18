export default defineAppConfig({
  docus: {
    name: 'vue-route-query - Documentation',
    description:
      'Typed URL query state for Vue and vue-router. Bind a query key to a ref, with codecs, batched writes, and grouped or dynamic keys.',
    url: 'https://vue-route-query.vercel.app',
  },
  seo: {
    titleTemplate: '%s - vue-route-query',
    title: 'vue-route-query',
    description:
      'Typed URL query state for Vue and vue-router. Bind a query key to a ref, with codecs, batched writes, and grouped or dynamic keys.',
  },
  github: {
    owner: 'ChronicStone',
    name: 'vue-route-query',
    url: 'https://github.com/ChronicStone/vue-route-query',
    branch: 'main',
    rootDir: 'apps/docs',
  },
  header: {
    title: 'vue-route-query',
    logo: {
      alt: 'vue-route-query',
      light: '/logo-light.svg',
      dark: '/logo-dark.svg',
      class: 'h-6 w-auto',
      wordmark: {
        light: '/wordmark-light.svg',
        dark: '/wordmark-dark.svg',
      },
      display: 'wordmark',
      favicon: '/favicon.svg',
    },
  },
  ui: {
    icons: {
      arrowDown: 'i-pixelarticons-arrow-down',
      arrowLeft: 'i-pixelarticons-arrow-left',
      arrowRight: 'i-pixelarticons-arrow-right',
      arrowUp: 'i-pixelarticons-arrow-up',
      check: 'i-pixelarticons-check',
      chevronDown: 'i-pixelarticons-chevron-down',
      chevronLeft: 'i-pixelarticons-chevron-left',
      chevronRight: 'i-pixelarticons-chevron-right',
      chevronUp: 'i-pixelarticons-chevron-up',
      close: 'i-pixelarticons-close',
      copy: 'i-pixelarticons-copy',
      copyCheck: 'i-pixelarticons-check',
      dark: 'i-pixelarticons-moon',
      light: 'i-pixelarticons-sun',
      external: 'i-pixelarticons-external-link',
      hash: 'i-pixelarticons-hash',
      info: 'i-pixelarticons-info-box',
      loading: 'i-pixelarticons-loader',
      menu: 'i-pixelarticons-menu',
      minus: 'i-pixelarticons-minus',
      plus: 'i-pixelarticons-plus',
      search: 'i-pixelarticons-search',
      tip: 'i-pixelarticons-lightbulb',
      warning: 'i-pixelarticons-warning-box',
      caution: 'i-pixelarticons-alert',
      success: 'i-pixelarticons-check',
    },
    contentSurround: {
      slots: {
        linkLeading: 'rounded-none',
      },
    },
    colors: {
      primary: 'emerald',
      neutral: 'neutral',
    },
    contentNavigation: {
      slots: {
        linkLeadingIcon: 'size-4 mr-1.5',
        linkTrailing: 'hidden',
      },
      defaultVariants: {
        variant: 'link',
      },
    },
    switch: {
      slots: {
        base: 'rounded-none',
        thumb: 'rounded-none',
      },
    },
    badge: {
      slots: {
        base: 'rounded-none',
      },
    },
    container: {
      base: 'w-full max-w-(--ui-container) mx-auto px-4 sm:px-6 lg:px-0 lg:border-x lg:border-default',
    },
    header: {
      slots: {
        container: 'lg:px-6',
      },
    },
    footer: {
      slots: {
        container: 'lg:px-6',
      },
    },
    page: {
      slots: {
        root: 'flex flex-col lg:grid lg:grid-cols-10 lg:gap-0',
        left: 'lg:col-span-2 lg:border-r lg:border-default',
        center: 'lg:col-span-8 min-w-0',
        right: 'lg:col-span-2 order-first lg:order-last lg:border-l lg:border-default',
      },
    },
    pageAside: {
      slots: {
        root: 'hidden overflow-y-auto lg:block lg:max-h-[calc(100vh-var(--ui-header-height))] lg:sticky lg:top-(--ui-header-height) py-8 lg:px-6',
      },
    },
    pageHeader: {
      slots: {
        root: 'relative border-b border-default py-8 lg:py-10 vrq-grid-bg lg:-mx-10 lg:px-10',
        title: 'font-pixel font-normal tracking-tight text-3xl sm:text-4xl',
        headline: 'font-mono text-xs text-primary',
      },
    },
    pageBody: {
      base: 'mt-8 pb-24 space-y-12',
    },
    pageHero: {
      slots: {
        title: 'max-w-4xl text-balance text-5xl font-semibold sm:text-6xl',
        description: 'max-w-3xl text-pretty text-lg text-toned sm:text-xl',
      },
    },
    pageCard: {
      slots: {
        root: 'rounded-2xl',
        title: 'text-balance text-lg font-semibold',
        description: 'text-pretty',
      },
    },
  },
  socials: {},
})
