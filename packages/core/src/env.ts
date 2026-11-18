// Module-local so it never clashes with Node's global type. Bundlers replace the literal
// `process.env.NODE_ENV` at build time; without a bundler and without a `process` global
// (a plain browser), the reference throws and development checks stay off.
declare const process: { env: Record<string, string | undefined> }

/** Whether development-only checks and warnings run. */
export const isDev: boolean = (() => {
  try {
    return process.env.NODE_ENV !== 'production'
  } catch {
    return false
  }
})()
