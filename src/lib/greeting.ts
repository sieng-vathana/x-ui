/** Time-based greeting helpers for top-left title UI */

export function getGreeting(date = new Date()): {
  text: string
  icon: string
} {
  const hour = date.getHours()
  if (hour < 12) return { text: 'Good morning', icon: 'sun-line' }
  if (hour < 17) return { text: 'Good afternoon', icon: 'sun-foggy-line' }
  if (hour < 21) return { text: 'Good evening', icon: 'moon-clear-line' }
  return { text: 'Good night', icon: 'moon-line' }
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName
}
