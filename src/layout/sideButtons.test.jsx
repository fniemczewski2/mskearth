import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../features/recruitment/joinUs.jsx', () => ({ default: () => <p>join content</p> }));
vi.mock('../features/donate/donate.jsx', () => ({ default: () => <p>donate content</p> }));

import SideButtons from './sideButtons.jsx';

describe('SideButtons', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('are real buttons that open a named dialog with a labelled close button', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/pl']}>
        <SideButtons />
      </MemoryRouter>
    );

    const opener = screen.getByRole('button', { name: /dołącz do nas/i });
    await user.click(opener);

    expect(screen.getByText('join content')).toBeInTheDocument();
    const close = screen.getByRole('button', { name: 'Zamknij' });
    await user.click(close);

    expect(screen.queryByText('join content')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
