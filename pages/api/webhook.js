import Stripe from 'stripe';
import { createEvent } from '../../lib/calendar';
import { buildWhatsAppMessage, sendWhatsAppNotification } from '../../lib/whatsapp';
import { SCHEDULE } from '../../lib/schedule';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Disable body parsing — Stripe needs raw body for webhook verification
export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { sessionType, slotStart, slotEnd, clientName, clientPhone, reason } = session.metadata;
    const clientEmail = session.customer_email;
    const sessionConfig = SCHEDULE.sessions[sessionType];

    // 1. Create Google Calendar event
    try {
      await createEvent({
        summary: `${sessionConfig.label} — ${clientName}`,
        description: [
          `Client: ${clientName}`,
          `Phone: ${clientPhone}`,
          `Email: ${clientEmail}`,
          reason ? `Reason: ${reason}` : '',
          ``,
          `Deposit paid: SGD ${sessionConfig.deposit.toFixed(2)}`,
          `Balance due: SGD ${(sessionConfig.fee - sessionConfig.deposit).toFixed(2)}`,
          `Stripe session: ${session.id}`,
        ].filter(Boolean).join('\n'),
        startTime: slotStart,
        endTime: slotEnd,
        attendeeEmail: clientEmail,
      });
    } catch (err) {
      console.error('Calendar event creation failed:', err);
    }

    // 2. Send WhatsApp notification
    try {
      const msg = buildWhatsAppMessage({ sessionType, clientName, clientPhone, clientEmail, slotStart, reason });
      await sendWhatsAppNotification(msg);
    } catch (err) {
      console.error('WhatsApp notification failed:', err);
    }
  }

  res.status(200).json({ received: true });
}
