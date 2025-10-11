import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { amount, name, email, locale } = body;

    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return res.status(400).json({ error: "Nieprawidłowa kwota." });
    }

    const unitAmount = Math.round(parsed * 100);
    if (unitAmount < 100) {
      return res.status(400).json({ error: "Minimalna kwota to 1,00 zł." });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "pln",
            product_data: {
              name: "Darowizna na cele statutowe",
              description: name ? `${name}` : "Darowizna",
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      customer_email: email || undefined,
      locale: locale || "auto",

      metadata: {
        donor_name: name || "",
        donor_email: email || "",
        source: "mskearth",
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("[create-checkout-session] error:", err);
    return res.status(500).json({ error: "Błąd serwera podczas tworzenia płatności." });
  }
}
