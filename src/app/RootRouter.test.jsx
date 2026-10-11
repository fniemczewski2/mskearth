import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./App.jsx', () => ({
  default: function MockApp() {
    const { pathname } = useLocation();
    return <div data-testid="app">{pathname}</div>;
  },
}));

vi.mock('../features/admin/adminPanel.jsx', () => ({
  default: () => <div data-testid="admin-panel">admin</div>,
}));

vi.mock('../features/admin/RequireAdmin.jsx', () => ({
  default: ({ children }) => children,
}));

import RootRouter from './RootRouter.jsx';

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RootRouter />
    </MemoryRouter>
  );
}

describe('RootRouter language redirects', () => {
  it('redirects the bare root to the default language', () => {
    renderAt('/');
    expect(screen.getByTestId('app')).toHaveTextContent('/pl');
  });

  it('redirects an un-prefixed path to the default language, preserving the rest of the path', () => {
    renderAt('/fundacja');
    expect(screen.getByTestId('app')).toHaveTextContent('/pl/fundacja');
  });

  it('preserves query strings when redirecting', () => {
    renderAt('/kontakt?ref=newsletter');
    expect(screen.getByTestId('app')).toHaveTextContent('/pl/kontakt');
  });

  it('renders the app directly when a supported language prefix is present', () => {
    renderAt('/en/o-nas');
    expect(screen.getByTestId('app')).toHaveTextContent('/en/o-nas');
  });

  it('treats an unsupported language segment the same as a missing one', () => {
    renderAt('/de/aktualnosci');
    expect(screen.getByTestId('app')).toHaveTextContent('/pl/de/aktualnosci');
  });

  it('routes /admin paths to the admin panel instead of the language gate', async () => {
    renderAt('/admin/login');
    expect(await screen.findByTestId('admin-panel')).toBeInTheDocument();
  });
});
