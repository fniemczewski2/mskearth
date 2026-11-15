import { z } from 'zod';

import { EMAIL_MAX_LENGTH } from '../src/shared/config/site.js';
import { applyCors } from './_lib/cors.js';
import { verifyCaptcha } from './_lib/captcha.js';
import { log, redact } from './_lib/log.js';
import { msg } from './_lib/messages.js';
import { rejectIfLimited } from './_lib/rateLimit.js';
import { subscribeToNewsletter } from './_lib/getresponse.js';

const BodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(EMAIL_MAX_LENGTH),
  consent: z.literal(true),
  company: z.string().optional().default(''),
  captcha: z.string().optional(),
});

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (await rejectIfLimited(req, res, 'newsletter')) return;

  const parsed = BodySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ code: 'invalid', error: msg(req, 'invalid') });
  }

  if (parsed.data.company) {
    log.security('honeypot', req, { form: 'newsletter' });
    return res.status(400).json({ code: 'invalid', error: msg(req, 'invalid') });
  }
  if (!(await verifyCaptcha(parsed.data.captcha, req))) {
    log.security('captcha_failed', req, { form: 'newsletter' });
    return res.status(400).json({ code: 'captcha', error: msg(req, 'captcha') });
  }

  try {
    await subscribeToNewsletter(parsed.data.email);
    return res.status(202).json({ ok: true });
  } catch (err) {
    log.error('newsletter.subscribe', err, { email: redact(parsed.data.email) });
    // 400 z GetResponse (adres odrzucony, np. z listy zablokowanych) nie jest ujawniane uzytkownikowi.
    if (err.code === 'getresponse_400') return res.status(202).json({ ok: true });
    return res.status(502).json({ code: 'server', error: msg(req, 'newsletterFailed') });
  }
}
