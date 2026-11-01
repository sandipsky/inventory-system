import { AuthUser } from './auth.model';

/** A signed-in user for specs; pass the operations the test needs. */
export function testUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return { id: 1, username: 'admin', masterModules: [], operations: [], ...overrides };
}

/** A JWT whose payload has `exp` seconds from now (negative for an expired one). The signature is fake. */
export function testToken(expiresInSeconds = 3600): string {
  const payload = btoa(JSON.stringify({ sub: 'admin', exp: Math.floor(Date.now() / 1000) + expiresInSeconds }));
  return `header.${payload.replace(/=+$/, '')}.signature`;
}
