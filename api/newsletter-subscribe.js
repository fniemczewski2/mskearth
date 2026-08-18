import { z } from 'zod';

import { applyCors } from './_lib/cors.js';
import { log, redact } from './_lib/log.js';
import { isLimited, clientIp } from './_lib/rateLimit.js';

const BodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  consent: z.literal(true),
  company: z.string().max(0).optional().default(''),
});

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = BodySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Nieprawidlowe dane formularza.' });
  }

  const ip = clientIp(req);
  if (await isLimited(`newsletter:${ip}`, { max: 3, windowSec: 3600 })) {
    return res.status(429).json({ error: 'Zbyt wiele prob. Sprobuj pozniej.' });
  }

  try {
    const r = await fetch(
      `https://api.kit.com/v4/forms/${process.env.KIT_FORM_ID}/subscribers`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Kit-Api-Key': process.env.KIT_API_KEY,
        },
        body: JSON.stringify({ email_address: parsed.data.email }),
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!r.ok) {
      log.error('newsletter.subscribe', new Error(`HTTP ${r.status}`), {
        email: redact(parsed.data.email),
      });
    }
  } catch (err) {
    log.error('newsletter.subscribe', err, { email: redact(parsed.data.email) });
  }

  return res.status(202).json({ ok: true });
}
