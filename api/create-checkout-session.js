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
    'https://sites.google.com'
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
    const { amount, name, email, locale } = req.body || {};
    const parsed = Number(amount);
    
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return res.status(400).json({ error: "Nieprawidłowa kwota." });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Nieprawidłowy adres email." });
    }

    const unitAmount = Math.round(parsed * 100);

    console.log(`Creating Stripe session: ${amount} PLN for ${email}`);

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
      success_url: `${process.env.SITE_URL || 'https://www.msk.earth'}/donate/success`,
      cancel_url: `${process.env.SITE_URL || 'https://www.msk.earth'}/donate/cancel`,
      metadata: { 
        donor_name: name || "", 
        donor_email: email, 
        source: "mskearth-iframe" 
      },
    });

    console.log(`✅ Session created: ${session.id}`);

    return res.status(200).json({ 
      url: session.url,
      sessionId: session.id
    });

  } catch (err) {
    console.error("❌ Stripe error:", err);
    
    return res.status(500).json({ 
      error: "Błąd serwera podczas tworzenia płatności.",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}