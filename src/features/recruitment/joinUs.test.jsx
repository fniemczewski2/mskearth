import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => ({
          limit: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: { id: 1, instagram: 'https://instagram.com/msk', form: 'https://forms.example/ankieta', steps: [] },
                error: null,
              }),
          }),
        }),
      }),
    }),
  },
}));

import JoinUs from './joinUs.jsx';

describe('JoinUs', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('puts the survey link on the survey step, not on the video step', async () => {
    render(
      <MemoryRouter initialEntries={['/pl']}>
        <JoinUs />
      </MemoryRouter>
    );

    const survey = await screen.findByRole('link', { name: /wypełnij/i });
    expect(survey).toHaveAttribute('href', 'https://forms.example/ankieta');
    expect(screen.queryByRole('link', { name: /obejrzyj/i })).not.toBeInTheDocument();
  });
});
