import { SCHEDULE } from './schedule';

// Send WhatsApp notification via wa.me redirect
// For server-side, we generate the message URL
// For a true push notification, you'd need WhatsApp Business API
export function buildWhatsAppMessage({ sessionType, clientName, clientPhone, clientEmail, slotStart, reason }) {
  const session = SCHEDULE.sessions[sessionType];
  const date = new Date(slotStart);
  const dateStr = date.toLocaleDateString('en-SG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: SCHEDULE.timezone,
  });
  const timeStr = date.toLocaleTimeString('en-SG', {
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: SCHEDULE.timezone,
  });

  const msg = [
    `📅 NEW BOOKING`,
    ``,
    `${session.label}`,
    `${dateStr} at ${timeStr}`,
    ``,
    `Client: ${clientName}`,
    `Phone: ${clientPhone}`,
    `Email: ${clientEmail}`,
    reason ? `Reason: ${reason}` : '',
    ``,
    `Deposit: SGD ${session.deposit.toFixed(2)} (paid via Stripe)`,
    `Balance: SGD ${(session.fee - session.deposit).toFixed(2)} due at session`,
  ].filter(Boolean).join('\n');

  return msg;
}

// Simple webhook call to notify via WhatsApp
// Uses CallMeBot free API (no setup needed) or you can swap for Twilio/WA Business API
export async function sendWhatsAppNotification(message) {
  const phone = process.env.WHATSAPP_NUMBER;
  
  // Option 1: Use CallMeBot (free, requires one-time setup)
  // Sign up at https://www.callmebot.com/blog/free-api-whatsapp-messages/
  // Then set CALLMEBOT_API_KEY in your .env
  if (process.env.CALLMEBOT_API_KEY) {
    try {
      const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(message)}&apikey=${process.env.CALLMEBOT_API_KEY}`;
      await fetch(url);
      return true;
    } catch (e) {
      console.error('WhatsApp notification failed:', e);
      return false;
    }
  }

  // Option 2: Log the message (fallback — you'll see it in Vercel logs)
  console.log('=== WHATSAPP NOTIFICATION ===');
  console.log(message);
  console.log('============================');
  return true;
}
