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
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the notice when it has not been dismissed yet', () => {
    renderWithRouter();
    expect(screen.getByRole('region', { name: /cookies/i })).toBeInTheDocument();
  });

  it('does not render when it was already dismissed', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ analytics: false }));
    renderWithRouter();
    expect(screen.queryByRole('region', { name: /cookies/i })).not.toBeInTheDocument();
  });

  it('is not a modal and does not ask for consent to tracking', () => {
    renderWithRouter();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /akceptuj/i })).not.toBeInTheDocument();
  });

  it('stores the dismissal and hides the notice', async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await user.click(screen.getByRole('button', { name: /rozumiem/i }));

    expect(screen.queryByRole('region', { name: /cookies/i })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).analytics).toBe(false);
  });
});
