import { readFile, readdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { basename, join } from 'node:path'

/** Emit exact notices for packages whose code survives Rollup tree shaking. */
export async function runtimeNotices(moduleIds) {
  const roots = new Set()
  for (const id of moduleIds) {
    const normalized = id.replaceAll('\0', '').replaceAll('\\', '/'), marker = '/node_modules/', index = normalized.lastIndexOf(marker)
    if (index < 0) continue
    const tail = normalized.slice(index + marker.length).split('/')
    roots.add(normalized.slice(0, index + marker.length) + tail.slice(0, tail[0].startsWith('@') ? 2 : 1).join('/'))
  }
  const records = [], sections = []
  for (const root of [...roots].sort()) {
    const metadata = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
    const files = (await readdir(root)).filter(file => /^(license|licence|copying|notice)([._-].*)?$/i.test(file))
    const fallback = join('licenses', `runtime-${metadata.name.replaceAll('/', '-').replace('@', '')}.txt`)
    const contents = files.length ? await Promise.all(files.map(file => readFile(join(root, file), 'utf8'))) : [await readFile(fallback, 'utf8').catch(() => { throw new Error(`Missing distribution notice: ${metadata.name}`) })]
    const notice = contents.join('\n\n')
    records.push({ name: metadata.name, version: metadata.version, license: metadata.license ?? 'see notice', files: files.length ? files : [basename(fallback)], sha256: createHash('sha256').update(notice).digest('hex') })
    sections.push(`${metadata.name} ${metadata.version}\n${'='.repeat(64)}\n${notice}`)
  }
  await writeFile('docs/research/runtime-notices.json', JSON.stringify(records, null, 2) + '\n')
  return `Построй 2027 · Runtime third-party notices\nGenerated from included production modules. Upstream source code is unchanged.\nAsset/source adaptations: ASSET_NOTICES.md and licenses/.\n\n${sections.join('\n\n')}`
}
