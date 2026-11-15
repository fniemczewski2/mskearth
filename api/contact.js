import { z } from 'zod';

import { CONTACT_EMAIL, CONTACT_LIMITS, EMAIL_MAX_LENGTH } from '../src/shared/config/site.js';
import { applyCors } from './_lib/cors.js';
import { verifyCaptcha } from './_lib/captcha.js';
import { sendMail } from './_lib/gmail.js';
import { log, redact } from './_lib/log.js';
import { msg } from './_lib/messages.js';
import { rejectIfLimited } from './_lib/rateLimit.js';

const BodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(EMAIL_MAX_LENGTH),
  subject: z.string().trim().min(1).max(CONTACT_LIMITS.subject),
  message: z.string().trim().min(1).max(CONTACT_LIMITS.message),
  company: z.string().optional().default(''),
  captcha: z.string().optional(),
});

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (await rejectIfLimited(req, res, 'contact')) return;

  const parsed = BodySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ code: 'invalid', error: msg(req, 'invalid') });
  }
  const { email, subject, message, company, captcha } = parsed.data;

  if (company) {
    log.security('honeypot', req, { form: 'contact' });
    // Bot dostaje odpowiedz jak po udanej wysylce.
    return res.status(202).json({ ok: true });
  }
  if (!(await verifyCaptcha(captcha, req))) {
    log.security('captcha_failed', req, { form: 'contact' });
    return res.status(400).json({ code: 'captcha', error: msg(req, 'captcha') });
  }

  try {
    await sendMail({
      to: process.env.CONTACT_RECIPIENT ?? CONTACT_EMAIL,
      replyTo: email,
      subject: `[msk.earth] ${subject}`,
      text: `Od: ${email}\n\n${message}`,
    });
    return res.status(202).json({ ok: true });
  } catch (err) {
    log.error('contact.send', err, { email: redact(email) });
    return res.status(502).json({ code: 'server', error: msg(req, 'contactFailed') });
  }
}
