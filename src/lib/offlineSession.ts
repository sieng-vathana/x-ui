import type { AuthenticatedSession } from '../features/auth/authApi'
import { offlineDb } from './offlineDb'

/**
 * The signed-in user and their stores, kept on this device so the POS still opens when the connection is gone.
 * Sign-out clears it. Requests made offline fail as usual; the session is checked again when the connection is back.
 */
const KEY = 'current'

export async function saveOfflineSession(session: AuthenticatedSession): Promise<void> {
  try {
    await offlineDb.put('session', KEY, { ...session, savedAt: Date.now() })
  } catch {
    // Storage can be unavailable; the app then needs the connection, as before.
  }
}

export async function loadOfflineSession(): Promise<AuthenticatedSession | null> {
  try {
    const saved = await offlineDb.get<AuthenticatedSession & { savedAt: number }>('session', KEY)
    return saved ? { user: saved.user, stores: saved.stores } : null
  } catch {
    return null
  }
}

export async function clearOfflineSession(): Promise<void> {
  try {
    await offlineDb.remove('session', KEY)
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}
