import { createCheckoutSession } from '../../lib/stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { sessionType, slotStart, slotEnd, clientName, clientEmail, clientPhone, reason } = req.body;

  if (!sessionType || !slotStart || !slotEnd || !clientName || !clientEmail || !clientPhone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const checkout = await createCheckoutSession({
      sessionType, slotStart, slotEnd, clientName, clientEmail, clientPhone, reason,
    });
    res.status(200).json({ url: checkout.url });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
