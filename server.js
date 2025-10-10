// server.js
import express from 'express';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';

import { getPayUToken } from './getToken.js';

const app = express();
app.use(bodyParser.json());

// ---- CONFIG ----
const IS_SANDBOX = true;
const PAYU_BASE = IS_SANDBOX
  ? 'https://secure.snd.payu.com'
  : 'https://secure.payu.com';

const CLIENT_ID = process.env.PAYU_CLIENT_ID;         // from POS
const CLIENT_SECRET = process.env.PAYU_CLIENT_SECRET; // from POS
const POS_ID = process.env.PAYU_POS_ID;               // merchantPosId
const CURRENCY = 'PLN';

app.post('/api/payments/create-order', async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    const { total, email, firstName, orderId, description } = req.body;

    if (!total || !email) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Missing total or email.' });
    }

    const accessToken = await getPayUToken();
    console.log('PayU token prefix:', token.slice(0, 12));
    console.log('Orders URL:', PAYU_ORDERS_URL);

    const payload = {
      notifyUrl: `${process.env.PUBLIC_URL}/api/payments/notify`,
      continueUrl: `${process.env.PUBLIC_URL}/checkout/return`,
      customerIp: req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '127.0.0.1',
      merchantPosId: process.env.PAYU_POS_ID,
      description: description || 'Donation',
      currencyCode: 'PLN',
      totalAmount: String(Math.round(Number(total) * 100)), // grosze
      extOrderId: orderId || `ORD-${Date.now()}`,
      buyer: { email, firstName },
      products: [{
        name: description || 'Donation',
        unitPrice: String(Math.round(Number(total) * 100)),
        quantity: '1'
      }]
    };

    const resp = await fetch(`${PAYU_BASE}/api/v2_1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const raw = await resp.text();      // read body once
    let data = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { /* non-JSON */ }

    if (!resp.ok) {
      return res.status(400).json({
        error: data?.status?.statusCode || 'ORDER_CREATE_FAILED',
        details: data || raw || null,
      });
    }

    return res.status(200).json({
      redirectUri: data?.redirectUri,
      payuOrderId: data?.orderId,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'SERVER_ERROR', message: e.message });
  }
});

// (optional) global error handler, still JSON:
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'UNHANDLED', message: err?.message || 'Unknown error' });
});

// PayU server-to-server notification (IPN)
app.post('/api/payments/notify', async (req, res) => {
  try {
    // Verify and persist: req.body contains order status updates.
    // Typical statuses: NEW, PENDING, COMPLETED, CANCELED, WAITING_FOR_CONFIRMATION.
    // Update your DB here using req.body.order.orderId and req.body.order.status.
    // IMPORTANT: respond 200 OK quickly so PayU stops retrying.
    console.log('PayU notify:', JSON.stringify(req.body));
    res.status(200).send('OK');
  } catch (e) {
    console.error('Notify handler error', e);
    res.status(200).send('OK'); // still acknowledge to avoid retries storm; log for manual review
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`PayU server listening on :${port}`));
