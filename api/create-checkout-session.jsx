// /api/create-checkout-session.js (ESM)
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  try {
    const { amount, name, email, locale } = req.body || {};
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) return res.status(400).json({ error: "Nieprawidłowa kwota." });

    const unitAmount = Math.round(parsed * 100); // PLN → grosze

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "pln",
      line_items: [{
        price_data: {
          currency: "pln",
          product_data: { name: "Darowizna na cele statutowe", description: name ? `${name}` : "" },
          unit_amount: unitAmount,
        },
        quantity: 1,
      }],
      customer_email: email || undefined,
      locale: locale || "auto",
      success_url: `${process.env.SITE_URL}/donate/success`,
      cancel_url: `${process.env.SITE_URL}/donate/cancel`,
      metadata: { donor_name: name || "", donor_email: email || "", source: "mskearth-prod" },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Błąd serwera podczas tworzenia płatności." });
  }
}
