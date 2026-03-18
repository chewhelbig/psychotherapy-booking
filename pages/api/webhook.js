import Stripe from 'stripe';
import { createEvent } from '../../lib/calendar';
import { buildWhatsAppMessage, sendWhatsAppNotification } from '../../lib/whatsapp';
import { SCHEDULE } from '../../lib/schedule';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  var chunks = [];
  for await (var chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  var rawBody = await getRawBody(req);
  var sig = req.headers['stripe-signature'];

  var event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send('Webhook Error: ' + err.message);
  }

  if (event.type === 'checkout.session.completed') {
    var session = event.data.object;
    var meta = session.metadata || {};
    var sessionType = meta.sessionType;
    var slotStart = meta.slotStart;
    var slotEnd = meta.slotEnd;
    var clientName = meta.clientName;
    var clientPhone = meta.clientPhone;
    var reason = meta.reason || '';
    var clientEmail = session.customer_email;
    var sessionConfig = SCHEDULE.sessions[sessionType];

    // 1. Create Google Calendar event
    try {
      await createEvent({
        summary: clientName + ' — ' + (sessionType === 'individual' ? 'Individual P' : 'Couples C'),
        description: [
          'Client: ' + clientName,
          'Phone: ' + clientPhone,
          'Email: ' + clientEmail,
          reason ? 'Reason: ' + reason : '',
          '',
          'Deposit paid: SGD ' + (sessionConfig ? sessionConfig.deposit.toFixed(2) : '0'),
          'Balance due: SGD ' + (sessionConfig ? (sessionConfig.fee - sessionConfig.deposit).toFixed(2) : '0'),
          'Stripe session: ' + session.id,
        ].filter(Boolean).join('\n'),
        startTime: slotStart,
        endTime: slotEnd,
        attendeeEmail: clientEmail,
      });
      console.log('Calendar event created successfully');
    } catch (err) {
      console.error('Calendar event creation failed:', err.message);
    }

    // 2. Send WhatsApp notification
    try {
      var msg = buildWhatsAppMessage({
        sessionType: sessionType,
        clientName: clientName,
        clientPhone: clientPhone,
        clientEmail: clientEmail,
        slotStart: slotStart,
        reason: reason,
      });
      await sendWhatsAppNotification(msg);
    } catch (err) {
      console.error('WhatsApp notification failed:', err.message);
    }
  }

  res.status(200).json({ received: true });
}
