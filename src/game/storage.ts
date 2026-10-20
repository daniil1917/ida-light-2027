export function readPreference(key: string): string | null {
  try { return localStorage.getItem(`ida-2027:${key}`) } catch { return null }
}
export function writePreference(key: string, value: string): void {
  try { localStorage.setItem(`ida-2027:${key}`, value) } catch { /* Private-mode storage is optional. */ }
}
