import { z } from 'zod';

import { applyCors } from './_lib/cors.js';
import { log, redact } from './_lib/log.js';
import { isLimited, clientIp } from './_lib/rateLimit.js';
import { subscribeToKit } from './_lib/kit.js';

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

  const ip = clientIp(req);
  if (await isLimited(`newsletter:${ip}`, { max: 3, windowSec: 3600 })) {
    return res.status(429).json({ error: 'Zbyt wiele prób. Spróbuj później.' });
  }

  const parsed = BodySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Nieprawidłowe dane formularza.' });
  }

  try {
    await subscribeToKit(parsed.data.email);
    return res.status(202).json({ ok: true });
  } catch (err) {
    log.error('newsletter.subscribe', err, { email: redact(parsed.data.email) });
    // 422 z Kit (adres odrzucony) nie zdradza, czy adres juz istnieje; inne bledy zglaszamy.
    if (err.code === 'kit_422') return res.status(202).json({ ok: true });
    return res.status(502).json({ error: 'Nie udało się zapisać do newslettera. Spróbuj później.' });
  }
}
