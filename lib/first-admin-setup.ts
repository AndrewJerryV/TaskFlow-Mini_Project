export type FirstAdminProvider = 'email' | 'google' | 'github';

export type PendingFirstAdminSetup = {
  provider: FirstAdminProvider;
  email: string;
  name: string;
  createdAt: string;
};

const FIRST_ADMIN_SETUP_KEY = 'taskflow.pending.first-admin.v1';

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? '';
}

export function savePendingFirstAdminSetup(setup: Omit<PendingFirstAdminSetup, 'email' | 'createdAt'> & { email: string }) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    FIRST_ADMIN_SETUP_KEY,
    JSON.stringify({
      ...setup,
      email: normalizeEmail(setup.email),
      name: setup.name.trim(),
      createdAt: new Date().toISOString(),
    } satisfies PendingFirstAdminSetup)
  );
}

export function getPendingFirstAdminSetup(): PendingFirstAdminSetup | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(FIRST_ADMIN_SETUP_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as PendingFirstAdminSetup;
    if (!parsed.provider || !parsed.email || !parsed.name) {
      return null;
    }

    return {
      ...parsed,
      email: normalizeEmail(parsed.email),
    };
  } catch {
    return null;
  }
}

export function clearPendingFirstAdminSetup() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(FIRST_ADMIN_SETUP_KEY);
}

export function pendingFirstAdminMatches(
  setup: PendingFirstAdminSetup | null,
  provider: string | undefined,
  email: string | null
) {
  if (!setup) {
    return false;
  }

  return setup.provider === provider && setup.email === normalizeEmail(email);
}
