import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/supabaseClient.js', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => ({
          limit: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
    }),
  },
}));

vi.mock('./cities.jsx', () => ({
  default: ({ selectedRegion }) => (
    <div data-testid="cities-stub">
      <h2 className="voivodeshipName" id={`region-${selectedRegion}`}>
        Województwo {selectedRegion}
      </h2>
    </div>
  ),
}));

import MapElement from './map.jsx';

const LOCALE_PAYLOAD = {
  cities: { h1: 'Wybierz województwo', cta: 'Załóż nową grupę' },
  paths: [{ voivodeship: 'mazowieckie', ariaLabel: 'mazowieckie', d: 'M0 0 L10 0 L10 10 Z' }],
};

function mockMatchMedia(matches) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

function renderMap() {
  return render(
    <MemoryRouter initialEntries={['/pl/miasta']}>
      <MapElement />
    </MemoryRouter>
  );
}

async function selectRegion(user) {
  const region = await screen.findByRole('button', { name: 'mazowieckie' });
  await user.click(region);
}

describe('MapElement auto-scroll', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => LOCALE_PAYLOAD })
    );
    vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('scrolls to the selected region on small screens (<=768px)', async () => {
    mockMatchMedia(true);
    const user = userEvent.setup();
    renderMap();

    await selectRegion(user);

    await waitFor(() => {
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    });
    const scrolledEl = Element.prototype.scrollIntoView.mock.instances[0];
    expect(scrolledEl.tagName).toBe('H2');
    expect(scrolledEl.id).toBe('region-mazowieckie');
  });

  it('does not scroll when selecting a region on larger screens', async () => {
    mockMatchMedia(false);
    const user = userEvent.setup();
    renderMap();

    await selectRegion(user);
    await screen.findByTestId('cities-stub');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});
