import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  fetchSurveys: vi.fn(),
  fetchSurveyDetails: vi.fn(),
  createSurvey: vi.fn(),
  updateSurvey: vi.fn(),
  deleteSurvey: vi.fn(),
  addWindow: vi.fn(),
  deleteWindow: vi.fn(),
  deleteBooking: vi.fn(),
}));
vi.mock('../../survey/db/surveys.js', () => db);

import SurveysCMS from './surveysCMS.jsx';

describe('SurveysCMS', () => {
  beforeEach(() => {
    Object.values(db).forEach((f) => f.mockReset());
    db.fetchSurveys.mockResolvedValue([]);
    db.fetchSurveyDetails.mockResolvedValue({ windows: [], slots: [], bookings: [] });
    db.createSurvey.mockResolvedValue({
      id: 's1',
      slug: 'abc',
      title: 'Dyżury',
      capacity: 2,
      max_slots_per_user: 2,
    });
    db.addWindow.mockResolvedValue();
  });

  it('tworzy ankietę z oknem dzielonym na fragmenty', async () => {
    const user = userEvent.setup();
    render(<SurveysCMS />);
    await user.click(await screen.findByRole('button', { name: 'Nowa ankieta' }));

    await user.type(screen.getByLabelText('Tytuł'), 'Dyżury');
    await user.clear(screen.getByLabelText('Miejsc w jednym slocie'));
    await user.type(screen.getByLabelText('Miejsc w jednym slocie'), '2');
    await user.clear(screen.getByLabelText('Max slotów na osobę'));
    await user.type(screen.getByLabelText('Max slotów na osobę'), '2');

    // Bez terminu nie da się utworzyć ankiety.
    await user.click(screen.getByRole('button', { name: 'Utwórz ankietę' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('co najmniej jeden termin');
    expect(db.createSurvey).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Dzień'), '2026-10-27');
    await user.selectOptions(screen.getByLabelText('Zapis na'), 'part');
    expect(screen.getByText('Powstanie slotów: 4')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Dodaj termin' }));

    await user.click(screen.getByRole('button', { name: 'Utwórz ankietę' }));
    await waitFor(() => expect(db.createSurvey).toHaveBeenCalled());
    expect(db.createSurvey).toHaveBeenCalledWith({
      title: 'Dyżury',
      description: null,
      capacity: 2,
      max_slots_per_user: 2,
    });
    expect(db.addWindow).toHaveBeenCalledTimes(1);
    const [id, win, slots] = db.addWindow.mock.calls[0];
    expect(id).toBe('s1');
    expect(win).toMatchObject({ date: '2026-10-27', start: '12:00', end: '16:00', slotMinutes: 60 });
    expect(slots).toHaveLength(4);
    // Po utworzeniu pokazuje się publiczny adres.
    expect(await screen.findByLabelText('Publiczny adres ankiety')).toHaveValue(
      `${window.location.origin}/pl/ankieta/abc`
    );
  });

  it('odrzuca okno z nieprawidłowym zakresem godzin', async () => {
    const user = userEvent.setup();
    render(<SurveysCMS />);
    await user.click(await screen.findByRole('button', { name: 'Nowa ankieta' }));
    await user.type(screen.getByLabelText('Dzień'), '2026-10-27');
    await user.clear(screen.getByLabelText('Do'));
    await user.type(screen.getByLabelText('Do'), '11:00');
    await user.click(screen.getByRole('button', { name: 'Dodaj termin' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('późniejsza');
  });
});
