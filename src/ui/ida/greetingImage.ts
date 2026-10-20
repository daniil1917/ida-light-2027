import type { Greeting } from '../../game/greetings'

/** Export the actual supplied artwork, at its original resolution. */
export async function greetingImage(greeting: Greeting): Promise<Blob> {
  const response = await fetch(greeting.artwork)
  if (!response.ok) throw new Error('Postcard unavailable')
  return response.blob()
}

export const postcardFilename = (greeting: Greeting) => `ida-light-2027-${greeting.id}.png`

export async function downloadGreeting(greeting: Greeting): Promise<void> {
  const url = URL.createObjectURL(await greetingImage(greeting))
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = postcardFilename(greeting)
  document.body.append(anchor); anchor.click(); anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
