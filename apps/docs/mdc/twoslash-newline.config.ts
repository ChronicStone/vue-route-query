import { defineConfig } from '@nuxtjs/mdc/config'
import type { Element, ElementContent, Text } from 'hast'

/**
 * Keeps Twoslash hovers on the last token of a line.
 *
 * MDC's `mdc:newline` transformer appends "\n" to the last text of every line during the
 * `line` hook. Twoslash runs in the later `code` hook and matches its hover targets by text
 * length, so a target at the end of a line ("page.value") no longer matches and its hover is
 * dropped ("Cannot find tokens for node"). This transformer runs its `code` hook first: it
 * takes the newline off, lets Twoslash run, then puts it back in the `pre` hook.
 */
let pending: Text[] = []

function lastText(node: ElementContent | undefined): Text | undefined {
  if (!node) {
    return undefined
  }
  if (node.type === 'text') {
    return node
  }
  if (node.type === 'element') {
    return lastText(node.children.at(-1))
  }
  return undefined
}

export default defineConfig({
  shiki: {
    transformers: [
      {
        name: 'vrq:twoslash-line-end',
        code(code: Element) {
          pending = []
          for (const line of code.children) {
            if (line.type !== 'element') {
              continue
            }
            const text = lastText(line.children.at(-1))
            if (text && text.value.length > 1 && text.value.endsWith('\n')) {
              text.value = text.value.slice(0, -1)
              pending.push(text)
            }
          }
        },
        pre() {
          for (const text of pending) {
            text.value += '\n'
          }
          pending = []
        },
      },
    ],
  },
})
