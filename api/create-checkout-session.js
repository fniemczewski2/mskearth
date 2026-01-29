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
    'http://localhost:5174',
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
      cancelUrl,
      payment_type = 'onetime' // NEW: 'onetime' or 'recurring'
    } = req.body || {};
    
    console.log('Payment request received:', { 
      amount, 
      email, 
      name, 
      newsletter,
      payment_type,
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

    // Validate payment_type
    if (!['onetime', 'recurring'].includes(payment_type)) {
      return res.status(400).json({ error: "Nieprawidłowy typ płatności." });
    }

    const unitAmount = Math.round(parsed * 100);
    const finalSuccessUrl = successUrl || `${process.env.SITE_URL || 'https://www.msk.earth'}/pl/dziekujemy`;
    const finalCancelUrl = cancelUrl || `${process.env.SITE_URL || 'https://www.msk.earth'}/pl/wesprzyj`;

    console.log('Creating Stripe session with URLs:', {
      success: finalSuccessUrl,
      cancel: finalCancelUrl,
      payment_type
    });

    // Common metadata
    const metadata = { 
      donor_name: name || "", 
      donor_email: email,
      newsletter: newsletter ? "true" : "false", 
      amount: parsed.toString(),
      source: "mskearth",
      payment_type
    };

    let session;

    if (payment_type === 'recurring') {
      // RECURRING PAYMENT (SUBSCRIPTION)
      console.log('Creating recurring payment session');

      // Create or get product for recurring donations
      let product;
      try {
        // Try to find existing product
        const products = await stripe.products.list({
          limit: 1,
          active: true,
        });
        
        const existingProduct = products.data.find(
          p => p.metadata?.type === 'recurring_donation'
        );

        if (existingProduct) {
          product = existingProduct;
        } else {
          // Create new product
          product = await stripe.products.create({
            name: 'Regularne wsparcie MSK',
            description: 'Miesięczna darowizna na cele statutowe',
            metadata: {
              type: 'recurring_donation'
            }
          });
        }
      } catch (err) {
        console.error('Error finding/creating product:', err);
        // Fallback: create new product
        product = await stripe.products.create({
          name: 'Regularne wsparcie MSK',
          description: 'Miesięczna darowizna na cele statutowe',
          metadata: {
            type: 'recurring_donation'
          }
        });
      }

      // Create price for this specific amount
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: unitAmount,
        currency: 'pln',
        recurring: {
          interval: 'month',
          interval_count: 1
        },
        metadata: {
          amount: parsed.toString(),
          created_for: email
        }
      });

      // Create subscription checkout session
      session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        currency: 'pln',
        line_items: [{
          price: price.id,
          quantity: 1,
        }],
        customer_email: email,
        locale: locale || 'auto',
        success_url: finalSuccessUrl,
        cancel_url: finalCancelUrl,
        subscription_data: {
          metadata,
          description: name ? `Regularna darowizna od ${name}` : 'Regularna darowizna',
        },
        metadata,
        // Allow customers to update their payment method
        customer_update: {
          address: 'auto',
        },
        // Collect billing address
        billing_address_collection: 'auto',
      });

    } else {
      // ONE-TIME PAYMENT
      console.log('Creating one-time payment session');

      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        currency: 'pln',
        line_items: [{
          price_data: {
            currency: 'pln',
            product_data: { 
              name: 'Darowizna na cele statutowe MSK', 
              description: name ? `Darowizna od ${name}` : 'Darowizna' 
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        }],
        customer_email: email,
        locale: locale || 'auto',
        success_url: finalSuccessUrl,
        cancel_url: finalCancelUrl,
        payment_intent_data: {
          metadata
        },
        metadata,
        // Collect billing address for one-time payments too
        billing_address_collection: 'auto',
      });
    }

    console.log('Stripe session created:', session.id, 'Type:', payment_type);

    return res.status(200).json({ 
      url: session.url,
      sessionId: session.id,
      payment_type
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