import { z } from 'zod';

import { EMAIL_MAX_LENGTH, NAME_MAX_LENGTH } from '../src/shared/config/site.js';
import { applyCors } from './_lib/cors.js';
import { verifyCaptcha } from './_lib/captcha.js';
import { SURVEY_CONSENT_VERSION } from './_lib/config.js';
import { log, redact } from './_lib/log.js';
import { msg } from './_lib/messages.js';
import { rejectIfLimited } from './_lib/rateLimit.js';
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';

const BodySchema = z.object({
  slug: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(NAME_MAX_LENGTH),
  email: z.string().trim().toLowerCase().email().max(EMAIL_MAX_LENGTH),
  slotIds: z.array(z.string().uuid()).min(1).max(50),
  consent: z.literal(true),
  company: z.string().optional().default(''),
  captcha: z.string().optional(),
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
  if (await rejectIfLimited(req, res, 'survey')) return;

  const parsed = BodySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ code: 'invalid', error: msg(req, 'invalid') });
  }
  const { slug, name, email, slotIds, company, captcha } = parsed.data;

  if (company) {
    log.security('honeypot', req, { form: 'survey' });
    return res.status(400).json({ code: 'invalid', error: msg(req, 'invalid') });
  }
  if (!(await verifyCaptcha(captcha, req))) {
    log.security('captcha_failed', req, { form: 'survey' });
    return res.status(400).json({ code: 'captcha', error: msg(req, 'captcha') });
  }

  const db = getSupabaseAdmin();
  if (!db) return res.status(500).json({ code: 'server', error: msg(req, 'server') });

  const { data, error } = await db.rpc('book_survey_slots', {
    p_slug: slug,
    p_name: name,
    p_email: email,
    p_slot_ids: slotIds,
    p_consent_version: SURVEY_CONSENT_VERSION,
  });

  if (error) {
    const [code, slotId] = String(error.message ?? '').split(':');
    if (KNOWN[code]) {
      return res.status(KNOWN[code]).json({ code, slotId: slotId ?? null, error: code });
    }
    log.error('survey.book', error, { email: redact(email) });
    return res.status(500).json({ code: 'server', error: msg(req, 'surveyFailed') });
  }

  return res.status(201).json({ ok: true, booked: data });
}
