/**
 * Build-time patch for Next.js 15.x:
 * Fixes sporadic production crash:
 *   TypeError: Cannot read properties of undefined (reading 'require')
 * coming from wrapClientComponentLoader reading ComponentMod.__next_app__ multiple times
 * (can be unstable / getter-like under some bundling scenarios).
 *
 * We patch Next's runtime sources BEFORE `next build` so the generated `.next/server`
 * output and `.next/standalone` copy contain the fix.
 *
 * This is intentionally NOT a postinstall hook; it runs as `prebuild`.
 */

/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')

function patchFile(filePath, patchFn) {
  if (!fs.existsSync(filePath)) return { filePath, changed: false, skipped: true }
  const before = fs.readFileSync(filePath, 'utf8')
  const after = patchFn(before)
  if (after === before) return { filePath, changed: false, skipped: false }
  fs.writeFileSync(filePath, after, 'utf8')
  return { filePath, changed: true, skipped: false }
}

function patchClientComponentRendererLogger(content) {
  // Already patched (idempotent)
  if (content.includes('const nextApp = ComponentMod.__next_app__')) return content

  // Snapshot `__next_app__` once
  content = content.replace(
    'function wrapClientComponentLoader(ComponentMod) {',
    "function wrapClientComponentLoader(ComponentMod) {\n    const nextApp = ComponentMod.__next_app__;"
  )

  // Prefer snapshot everywhere
  content = content.replace('return ComponentMod.__next_app__;', 'return nextApp;')
  content = content.replace(/ComponentMod\\.__next_app__\\.require/g, 'nextApp.require')
  content = content.replace(/ComponentMod\\.__next_app__\\.loadChunk/g, 'nextApp.loadChunk')

  // Hard guard: don't create wrapper around undefined
  if (!content.includes('if (!nextApp) {')) {
    content = content.replace(
      "if (!('performance' in globalThis)) {",
      "if (!nextApp) {\n        return nextApp;\n    }\n    if (!('performance' in globalThis)) {"
    )
  }

  return content
}

function patchAppRender(content) {
  if (content.includes('const __next_app__ = ComponentMod.__next_app__')) return content

  // Snapshot __next_app__ once and pass stable wrapper into wrapClientComponentLoader
  content = content.replace(
    'if (ComponentMod.__next_app__) {',
    'const __next_app__ = ComponentMod.__next_app__;\n    if (__next_app__) {'
  )

  content = content.replace(
    '(0, _clientcomponentrendererlogger.wrapClientComponentLoader)(ComponentMod);',
    '(0, _clientcomponentrendererlogger.wrapClientComponentLoader)({ __next_app__ });'
  )

  // Safety for minor formatting differences
  content = content.replace(
    '(0, _clientcomponentrendererlogger.wrapClientComponentLoader)(ComponentMod)',
    '(0, _clientcomponentrendererlogger.wrapClientComponentLoader)({ __next_app__ })'
  )

  return content
}

function main() {
  const projectRoot = process.cwd()
  const targets = [
    { rel: 'node_modules/next/dist/server/client-component-renderer-logger.js', patch: patchClientComponentRendererLogger },
    { rel: 'node_modules/next/dist/server/app-render/app-render.js', patch: patchAppRender },
    { rel: 'node_modules/next/dist/esm/server/client-component-renderer-logger.js', patch: patchClientComponentRendererLogger },
    { rel: 'node_modules/next/dist/esm/server/app-render/app-render.js', patch: patchAppRender },
  ]

  const results = targets.map((t) => patchFile(path.join(projectRoot, t.rel), t.patch))
  const changed = results.filter((r) => r.changed)
  const skipped = results.filter((r) => r.skipped)

  if (changed.length > 0) {
    console.log(
      `[prebuild] Patched Next.js client component loader (__next_app__ snapshot):\n` +
        changed.map((r) => `- ${r.filePath}`).join('\n')
    )
  } else {
    console.log('[prebuild] Next.js patch not applied (already patched or files missing).')
  }

  if (skipped.length > 0) {
    console.log(
      `[prebuild] Skipped missing files:\n` + skipped.map((r) => `- ${r.filePath}`).join('\n')
    )
  }
}

main()

