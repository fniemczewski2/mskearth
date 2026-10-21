import { describe, expect, it } from 'vitest';

import { formatDay, generateSlots, groupByDate, isSelectable, toMinutes } from './slots.js';

describe('generateSlots', () => {
  it('bez dlugosci daje jeden slot na cale okno', () => {
    const { slots, error } = generateSlots({ date: '2026-10-27', start: '12:00', end: '16:00' });
    expect(error).toBeNull();
    expect(slots).toEqual([{ slot_date: '2026-10-27', start_time: '12:00', end_time: '16:00' }]);
  });

  it('dzieli okno na fragmenty i pomija niepelny koniec', () => {
    const { slots } = generateSlots({ date: '2026-10-28', start: '13:00', end: '17:30', slotMinutes: 60 });
    expect(slots.map((s) => s.start_time)).toEqual(['13:00', '14:00', '15:00', '16:00']);
    expect(slots.at(-1).end_time).toBe('17:00');
  });

  it('zwraca kody bledow', () => {
    expect(generateSlots({ date: 'x', start: '10:00', end: '11:00' }).error).toBe('date');
    expect(generateSlots({ date: '2026-10-27', start: '', end: '11:00' }).error).toBe('time');
    expect(generateSlots({ date: '2026-10-27', start: '12:00', end: '12:00' }).error).toBe('range');
    expect(generateSlots({ date: '2026-10-27', start: '10:00', end: '11:00', slotMinutes: 90 }).error).toBe('length');
    expect(generateSlots({ date: '2026-10-27', start: '00:00', end: '23:00', slotMinutes: 5 }).error).toBe('tooMany');
  });
});

describe('pomocnicze', () => {
  it('toMinutes odrzuca zle godziny', () => {
    expect(toMinutes('09:30')).toBe(570);
    expect(toMinutes('24:00')).toBeNaN();
    expect(toMinutes('')).toBeNaN();
  });

  it('groupByDate sortuje dni i sloty', () => {
    const g = groupByDate([
      { id: 3, date: '2026-10-28', start: '13:00' },
      { id: 2, date: '2026-10-27', start: '14:00' },
      { id: 1, date: '2026-10-27', start: '12:00' },
    ]);
    expect(g.map((d) => d.date)).toEqual(['2026-10-27', '2026-10-28']);
    expect(g[0].slots.map((s) => s.id)).toEqual([1, 2]);
  });

  it('isSelectable blokuje pelne, miniete i ponad limit', () => {
    const sel = new Set(['a']);
    expect(isSelectable({ id: 'b', free: 0 }, { selected: sel, max: 2 })).toBe(false);
    expect(isSelectable({ id: 'b', free: 1, past: true }, { selected: sel, max: 2 })).toBe(false);
    expect(isSelectable({ id: 'b', free: 1 }, { selected: sel, max: 2 })).toBe(true);
    expect(isSelectable({ id: 'c', free: 1 }, { selected: new Set(['a', 'b']), max: 2 })).toBe(false);
    expect(isSelectable({ id: 'a', free: 1 }, { selected: new Set(['a', 'b']), max: 2 })).toBe(true);
  });

  it('formatDay nie zalezy od strefy', () => {
    expect(formatDay('2026-10-27', 'pl')).toContain('wtorek');
  });
});
