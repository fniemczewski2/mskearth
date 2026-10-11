import { describe, expect, it } from 'vitest';

import { isAllowedAdminEmail, isGoogleSession } from './allowedDomains.js';

describe('isAllowedAdminEmail', () => {
  it('przepuszcza tylko dozwolone domeny', () => {
    expect(isAllowedAdminEmail('anna@msk.earth')).toBe(true);
    expect(isAllowedAdminEmail('Jan.Kowalski@FPMSK.org.pl')).toBe(true);
    expect(isAllowedAdminEmail('anna@gmail.com')).toBe(false);
  });

  it('odrzuca podobne domeny i subdomeny', () => {
    expect(isAllowedAdminEmail('x@evilmsk.earth')).toBe(false);
    expect(isAllowedAdminEmail('x@msk.earth.pl')).toBe(false);
    expect(isAllowedAdminEmail('x@sub.msk.earth')).toBe(false);
    expect(isAllowedAdminEmail('msk.earth@gmail.com')).toBe(false);
  });

  it('odrzuca niepoprawne wartosci', () => {
    expect(isAllowedAdminEmail('')).toBe(false);
    expect(isAllowedAdminEmail(null)).toBe(false);
    expect(isAllowedAdminEmail('@msk.earth')).toBe(false);
  });
});

describe('isGoogleSession', () => {
  const token = (claims) => `x.${btoa(JSON.stringify(claims)).replace(/=+$/, '')}.y`;

  it('rozpoznaje sesje OAuth po claimie amr', () => {
    const session = { access_token: token({ amr: [{ method: 'oauth', timestamp: 1 }] }), user: { app_metadata: { provider: 'email' } } };
    expect(isGoogleSession(session)).toBe(true);
    const pwd = { access_token: token({ amr: [{ method: 'password', timestamp: 1 }] }), user: { app_metadata: { provider: 'email' } } };
    expect(isGoogleSession(pwd)).toBe(false);
  });

  it('rozpoznaje sesje Google', () => {
    expect(isGoogleSession({ user: { app_metadata: { provider: 'google' } } })).toBe(true);
    expect(isGoogleSession({ user: { app_metadata: { provider: 'email' } } })).toBe(false);
    expect(isGoogleSession(null)).toBe(false);
  });
});
