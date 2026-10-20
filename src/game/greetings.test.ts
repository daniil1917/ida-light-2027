import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GREETINGS, greetingName } from './greetings'

let values: Map<string, string>
beforeEach(() => {
  vi.resetModules()
  values = new Map()
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) })
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })
describe('postcard draws per victory', () => {
  it('can draw either approved artwork on a first win', async () => {
    expect(GREETINGS.map(greeting => greeting.artwork)).toEqual(['/postcards/reindeer.png', '/postcards/paper-tree.png'])
    const random = vi.spyOn(Math, 'random')
    for (const [sample, expected] of [[0, 'reindeer'], [.999, 'paper-tree']] as const) {
      values.clear(); vi.resetModules(); random.mockReturnValue(sample)
      expect((await import('./greetings')).selectGreeting().id).toBe(expected)
    }
  })
  it.each(['greeting', 'greeting:reindeer,paper-tree', 'last-greeting'])('does not pin a previous visitor to the saved %s card', async key => {
    values.set(`ida-2027:${key}`, 'reindeer')
    expect((await import('./greetings')).selectGreeting().id).toBe('paper-tree')
    expect(values.get('ida-2027:last-greeting')).toBe('paper-tree')
    vi.resetModules()
    expect((await import('./greetings')).selectGreeting().id).toBe('reindeer')
  })
  it('avoids consecutive repeats even with blocked storage and the same random sample', async () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { selectGreeting } = await import('./greetings')
    let previous = selectGreeting().id
    for (let win = 0; win < 20; win++) {
      const next = selectGreeting().id
      expect(next).not.toBe(previous)
      expect(GREETINGS.some(greeting => greeting.id === next)).toBe(true)
      previous = next
    }
  })
  it('ignores an unknown saved artwork instead of showing an empty finale', async () => {
    values.set('ida-2027:last-greeting', 'removed-card')
    const selected = (await import('./greetings')).selectGreeting()
    expect(GREETINGS).toContainEqual(selected)
  })
  it('uses a bounded, clean display name without control or direction characters', () => {
    expect(greetingName({ id: 1, firstName: '  Мария\u202e\u0000 ' })).toBe('Мария')
    expect(greetingName({ id: 1, firstName: '🙂'.repeat(100) })).toBe('🙂'.repeat(32))
    expect(greetingName(null)).toBeNull()
  })
})
