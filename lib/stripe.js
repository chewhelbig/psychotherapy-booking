import Stripe from 'stripe';
import { SCHEDULE } from './schedule';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function createCheckoutSession({ sessionType, slotStart, slotEnd, clientName, clientEmail, clientPhone, reason }) {
  const session = SCHEDULE.sessions[sessionType];
  if (!session) throw new Error('Invalid session type');

  const depositCents = Math.round(session.deposit * 100);

  const checkout = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: clientEmail,
    line_items: [
      {
        price_data: {
          currency: 'sgd',
          product_data: {
            name: session.stripePriceLabel,
            description: `${session.label} — ${new Date(slotStart).toLocaleDateString('en-SG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: SCHEDULE.timezone })} at ${new Date(slotStart).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: SCHEDULE.timezone })}`,
          },
          unit_amount: depositCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      sessionType,
      slotStart,
      slotEnd,
      clientName,
      clientPhone,
      reason: reason || '',
    },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/?cancelled=true`,
  });

  return checkout;
}

export async function getCheckoutSession(sessionId) {
  return stripe.checkout.sessions.retrieve(sessionId);
}
