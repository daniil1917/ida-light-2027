import { readPreference, writePreference } from './storage'
import type { TelegramUser } from './types'
import { publicAsset } from '../app/publicAsset'

export interface Greeting { id: string; title: string; text: string; artwork: string; alt: string }
// Add the remaining approved cards here. Only entries with finished artwork ship.
export const GREETINGS: readonly Greeting[] = [
  { id: 'reindeer', title: 'С Новым годом!', text: 'Счастливого Нового года! Ида Лайт.',
    artwork: publicAsset('postcards/reindeer.png'),
    alt: 'Счастливого Нового года. Бело-золотой олень на синей новогодней открытке.' },
  { id: 'paper-tree', title: 'Начало прекрасного', text: 'С Новым годом! 2027. Пусть новый год станет началом прекрасного.',
    artwork: publicAsset('postcards/paper-tree.png'),
    alt: 'Красно-синяя открытка с объёмной бумажной ёлкой. С Новым годом, 2027. Пусть новый год станет началом прекрасного.' },
]
export const findGreeting = (id: string | null): Greeting | undefined => GREETINGS.find(greeting => greeting.id === id)
let lastGreetingId: string | null = null

/** Draw once per completed house, excluding the previous win's card. */
export function selectGreeting(): Greeting {
  const previous = lastGreetingId ?? readPreference('last-greeting')
    ?? readPreference(`greeting:${GREETINGS.map(greeting => greeting.id).join(',')}`)
    ?? readPreference('greeting')
  const alternatives = GREETINGS.filter(greeting => greeting.id !== previous)
  const choices = alternatives.length ? alternatives : GREETINGS
  const selected = choices[Math.floor(Math.random() * choices.length)]
  lastGreetingId = selected.id
  writePreference('last-greeting', selected.id)
  return selected
}

export function greetingName(user: TelegramUser | null): string | null {
  const name = user?.firstName.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, '').trim()
  return name ? Array.from(name).slice(0, 32).join('') : null
}
