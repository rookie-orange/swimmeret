const AUTH_STORAGE_KEY = 'swimmeret-auth-key'

export function hasAuthKey() {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    return Boolean(window.localStorage.getItem(AUTH_STORAGE_KEY))
  } catch {
    return false
  }
}

export function loginWithKey(key: string) {
  const normalizedKey = key.trim()

  if (!normalizedKey || typeof window === 'undefined') {
    return false
  }

  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, normalizedKey)
    return true
  } catch {
    return false
  }
}

export function logout() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
  } catch {
    // Ignore storage failures; the current session is still cleared in memory.
  }
}
