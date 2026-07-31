export function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  const prefix = `${encodeURIComponent(name)}=`
  const match = document.cookie.split('; ').find((entry) => entry.startsWith(prefix))
  return match ? decodeURIComponent(match.slice(prefix.length)) : undefined
}

export function writeCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === 'undefined') return
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`
}

export function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return
  document.cookie = `${encodeURIComponent(name)}=; Path=/; Max-Age=0; SameSite=Lax`
}
