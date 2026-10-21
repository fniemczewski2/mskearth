import { z } from 'zod';

import { applyCors } from './_lib/cors.js';
import { log, redact } from './_lib/log.js';
import { isLimited, clientIp } from './_lib/rateLimit.js';
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';

// Zmien wersje, gdy zmieni sie tresc zgody/klauzuli na stronie ankiety.
const CONSENT_VERSION = 'survey-2026-10';

const BodySchema = z.object({
  slug: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  slotIds: z.array(z.string().uuid()).min(1).max(50),
  consent: z.literal(true),
  company: z.string().max(0).optional().default(''),
});

// Kody bledow z funkcji SQL book_survey_slots -> status HTTP.
const KNOWN = {
  survey_not_found: 404,
  survey_closed: 409,
  invalid_slots: 400,
  too_many_slots: 409,
  slot_past: 409,
  slot_full: 409,
  already_booked: 409,
};

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = clientIp(req);
  if (await isLimited(`survey:${ip}`, { max: 10, windowSec: 3600 })) {
    return res.status(429).json({ code: 'rate_limited', error: 'Zbyt wiele prób. Spróbuj później.' });
  }

  const parsed = BodySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ code: 'invalid', error: 'Nieprawidłowe dane formularza.' });
  }
  const { slug, name, email, slotIds } = parsed.data;

  const db = getSupabaseAdmin();
  if (!db) return res.status(500).json({ code: 'server', error: 'Błąd konfiguracji serwera.' });

  const { data, error } = await db.rpc('book_survey_slots', {
    p_slug: slug,
    p_name: name,
    p_email: email,
    p_slot_ids: slotIds,
    p_consent_version: CONSENT_VERSION,
  });

  if (error) {
    const [code, slotId] = String(error.message ?? '').split(':');
    if (KNOWN[code]) {
      return res.status(KNOWN[code]).json({ code, slotId: slotId ?? null, error: code });
    }
    log.error('survey.book', error, { email: redact(email) });
    return res.status(500).json({ code: 'server', error: 'Nie udało się zapisać. Spróbuj później.' });
  }

  return res.status(201).json({ ok: true, booked: data });
}
