import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
vi.mock('./_lib/supabaseAdmin.js', () => ({ getSupabaseAdmin: () => ({ rpc }) }));
vi.mock('./_lib/rateLimit.js', () => ({
  rejectIfLimited: vi.fn().mockResolvedValue(false),
}));
vi.mock('./_lib/captcha.js', () => ({ verifyCaptcha: vi.fn().mockResolvedValue(true) }));

import handler from './survey-book.js';

const SLOT = '11111111-1111-4111-8111-111111111111';
const good = { slug: 'abc', name: 'Ola', email: 'Ola@Example.com', slotIds: [SLOT], consent: true };

function call(body, method = 'POST') {
  const res = {
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(c) {
      this.code = c;
      return this;
    },
    json(b) {
      this.body = b;
      return this;
    },
    end() {
      return this;
    },
  };
  return handler({ method, headers: { origin: 'https://msk.earth' }, body }, res).then(() => res);
}

describe('/api/survey-book', () => {
  beforeEach(() => rpc.mockReset());

  it('zapisuje i normalizuje e-mail', async () => {
    rpc.mockResolvedValue({ data: 1, error: null });
    const res = await call(good);
    expect(res.code).toBe(201);
    expect(rpc).toHaveBeenCalledWith(
      'book_survey_slots',
      expect.objectContaining({ p_email: 'ola@example.com', p_slot_ids: [SLOT] })
    );
  });

  it('wymaga zgody, poprawnych id i pustego honeypota', async () => {
    expect((await call({ ...good, consent: false })).code).toBe(400);
    expect((await call({ ...good, slotIds: ['x'] })).code).toBe(400);
    expect((await call({ ...good, slotIds: [] })).code).toBe(400);
    expect((await call({ ...good, company: 'bot' })).code).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('mapuje błędy bazy na 409 z kodem i id slotu', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: `slot_full:${SLOT}` } });
    const res = await call(good);
    expect(res.code).toBe(409);
    expect(res.body).toMatchObject({ code: 'slot_full', slotId: SLOT });
  });

  it('nieznany błąd to 500 bez ujawniania szczegółów', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'relation x does not exist' } });
    const res = await call(good);
    expect(res.code).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('relation');
  });

  it('odrzuca GET', async () => {
    expect((await call(good, 'GET')).code).toBe(405);
  });
});
