import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CookieConsent from './cookies.jsx';

const STORAGE_KEY = 'msk-cookie-consent';

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <CookieConsent />
    </MemoryRouter>
  );
}

describe('CookieConsent', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the consent dialog when no choice has been stored yet', () => {
    renderWithRouter();
    expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument();
  });

  it('does not render when a choice was already stored', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ analytics: true }));
    renderWithRouter();
    expect(screen.queryByRole('dialog', { hidden: true })).not.toBeInTheDocument();
  });

  it('stores the decision and hides the dialog after accepting', async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await user.click(screen.getByRole('button', { name: /akceptuj/i }));

    expect(screen.queryByRole('dialog', { hidden: true })).not.toBeInTheDocument();
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.analytics).toBe(true);
  });

  it('stores a rejection when only essential cookies are accepted', async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await user.click(screen.getByRole('button', { name: /tylko niezbędne/i }));

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.analytics).toBe(false);
  });
});
