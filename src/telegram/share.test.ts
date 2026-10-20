import { afterEach, describe, expect, it, vi } from 'vitest'
import { GREETINGS } from '../game/greetings'
import { buildGreetingShare, copyGreeting, publicShareURL, shareGreeting, shareText } from './share'
afterEach(() => vi.unstubAllGlobals())
describe('explicit greeting sharing', () => {
  it('never includes development URLs or Telegram launch data in fallback links', () => {
    for (const url of ['http://127.0.0.1:4173/', 'https://localhost/', 'https://192.168.1.1/', 'https://[::1]/', 'javascript:alert(1)', 'https://user:pass@example.com/']) expect(publicShareURL(url, 'https://example.com/')).toBeUndefined()
    expect(publicShareURL('', 'https://example.com/game?tgWebAppData=secret#tgWebAppVersion=8')).toBe('https://example.com/game')
    expect(publicShareURL('https://t.me/ida_bot/game?startapp=2027', 'http://localhost')).toBe('https://t.me/ida_bot/game?startapp=2027')
    expect(publicShareURL('broken-url', 'https://example.com/')).toBeUndefined()
  })
  it('copies only the wish and optional public campaign link', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const payload = buildGreetingShare(GREETINGS[0], 'https://example.com/')
    expect(await copyGreeting(payload)).toBe('copied')
    expect(writeText).toHaveBeenCalledWith(shareText(payload))
    expect(shareText(payload)).toContain(GREETINGS[0].text)
    expect(payload.text).toContain('Дом из 15 этажей готов!')
    expect(shareText(payload)).not.toContain('firstName')
  })
  it('does not open native sharing for a local result, and offers manual text when clipboard fails', async () => {
    const share = vi.fn()
    vi.stubGlobal('navigator', { share, clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    expect(await shareGreeting(buildGreetingShare(GREETINGS[0]))).toBe('manual')
    expect(share).not.toHaveBeenCalled()
  })
  it('treats cancelling a native share as cancellation without copying', async () => {
    const writeText = vi.fn()
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(Object.assign(new Error('cancel'), { name: 'AbortError' })), clipboard: { writeText } })
    expect(await shareGreeting(buildGreetingShare(GREETINGS[0], 'https://example.com/'))).toBe('cancelled')
    expect(writeText).not.toHaveBeenCalled()
  })
})
