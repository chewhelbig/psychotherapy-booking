import Stripe from 'stripe';
import { SCHEDULE } from '../../lib/schedule';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  var sessionId = req.query.session_id;
  if (!sessionId) return res.status(400).json({ error: 'Missing session_id' });

  try {
    var checkout = await stripe.checkout.sessions.retrieve(sessionId);
    var meta = checkout.metadata || {};
    var sessionType = meta.sessionType;
    var sessionConfig = SCHEDULE.sessions[sessionType];

    var slotStart = meta.slotStart || '';
    var slotEnd = meta.slotEnd || '';

    var startDate = new Date(slotStart);
    var dateFormatted = startDate.toLocaleDateString('en-SG', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Singapore'
    });

    var timeFormatted = startDate.toLocaleTimeString('en-SG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Singapore'
    });

    var depositPaid = sessionConfig ? sessionConfig.deposit : (checkout.amount_total / 100);
    var fullFee = sessionConfig ? sessionConfig.fee : 0;
    var balanceDue = fullFee - depositPaid;

    res.status(200).json({
      sessionLabel: sessionConfig ? sessionConfig.label : 'Psychotherapy Session',
      slotStart: slotStart,
      slotEnd: slotEnd,
      dateFormatted: dateFormatted,
      timeFormatted: timeFormatted,
      depositPaid: depositPaid,
      balanceDue: balanceDue,
      clientName: meta.clientName || '',
    });
  } catch (err) {
    console.error('Booking details error:', err.message);
    res.status(500).json({ error: 'Failed to load booking details' });
  }
}
