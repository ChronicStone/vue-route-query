/**
 * Persistent Twoslash queries (`// ^?`) render as floating popups teleported to `<body>`,
 * so they would cover whatever follows their code block. Each docs block keeps its query on
 * its last line; this plugin pads that block by the popup's height so the popup sits inside
 * the block instead of over the next paragraph.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const GAP = 12
  let repositioning = false

  function fit() {
    const triggers = [
      ...document.querySelectorAll<HTMLElement>('main .v-popper--theme-twoslash-query'),
    ]
    // Floating Vue mounts the shown poppers in the same order as their triggers.
    const poppers = [
      ...document.querySelectorAll<HTMLElement>('.v-popper__popper.v-popper--theme-twoslash-query'),
    ]
    const blocks = new Set(triggers.map((trigger) => trigger.closest('pre')))
    for (const block of blocks) {
      block?.style.removeProperty('padding-bottom')
    }

    // Top to bottom, measuring from the trigger: padding one block moves the next ones.
    triggers.forEach((trigger, index) => {
      const popper = poppers[index]
      const block = trigger.closest('pre')
      // Not open yet: a later pass measures it.
      if (!popper || !block || !popper.offsetHeight) {
        return
      }
      const needed =
        trigger.getBoundingClientRect().bottom +
        popper.offsetHeight +
        GAP -
        block.getBoundingClientRect().bottom
      if (needed > 0) {
        const current = Number.parseFloat(getComputedStyle(block).paddingBottom) || 0
        block.style.paddingBottom = `${current + needed}px`
      }
    })

    // Let Floating Vue place the poppers again under their moved triggers.
    repositioning = true
    window.dispatchEvent(new Event('resize'))
    repositioning = false
  }

  let timers: ReturnType<typeof setTimeout>[] = []
  const schedule = () => {
    if (repositioning) {
      return
    }
    for (const timer of timers) {
      clearTimeout(timer)
    }
    // Floating Vue opens persistent queries a moment after the page mounts, and fonts can
    // still change line heights, so measure a few times while the page settles.
    timers = [150, 600, 1500, 3000].map((delay) => setTimeout(fit, delay))
  }

  nuxtApp.hook('page:finish', schedule)
  nuxtApp.hook('app:mounted', schedule)
  window.addEventListener('resize', schedule, { passive: true })
})
