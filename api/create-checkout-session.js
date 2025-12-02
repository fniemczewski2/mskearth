import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20"
});

export default async function handler(req, res) {
  // CORS Headers - Support both www and non-www
  const allowedOrigins = [
    'https://msk.earth',
    'https://www.msk.earth',
    'https://fpmsk.org.pl',
    'https://www.fpmsk.org.pl',
    'https://sites.google.com',
    'http://localhost:5173',
    'http://localhost:3000',
  ];

  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin) || origin?.includes('google.com')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://www.msk.earth');
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      amount, 
      name, 
      email, 
      locale, 
      newsletter,
      successUrl, 
      cancelUrl 
    } = req.body || {};
    
    console.log('Payment request received:', { 
      amount, 
      email, 
      name, 
      newsletter,
      successUrl, 
      cancelUrl 
    });

    const parsed = Number(amount);
    
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return res.status(400).json({ error: "Nieprawidłowa kwota." });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Nieprawidłowy adres email." });
    }

    const unitAmount = Math.round(parsed * 100);
    const finalSuccessUrl = successUrl || `${process.env.SITE_URL || 'https://www.msk.earth'}/pl/dziekujemy`;
    const finalCancelUrl = cancelUrl || `${process.env.SITE_URL || 'https://www.msk.earth'}/pl/wesprzyj`;

    console.log('Creating Stripe session with URLs:', {
      success: finalSuccessUrl,
      cancel: finalCancelUrl
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "pln",
      line_items: [{
        price_data: {
          currency: "pln",
          product_data: { 
            name: "Darowizna na cele statutowe MSK", 
            description: name ? `Darowizna od ${name}` : "Darowizna" 
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      }],
      customer_email: email,
      locale: locale || "auto",
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      metadata: { 
        donor_name: name || "", 
        donor_email: email,
        newsletter: newsletter ? "true" : "false", 
        amount: parsed.toString(),
        source: "mskearth" 
      },
    });

    console.log('Stripe session created:', session.id);

    return res.status(200).json({ 
      url: session.url,
      sessionId: session.id
    });

  } catch (err) {
    console.error("Stripe error:", err);
    
    return res.status(500).json({ 
      error: "Błąd serwera podczas tworzenia płatności.",
      message: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}