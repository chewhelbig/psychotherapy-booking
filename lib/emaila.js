import nodemailer from 'nodemailer';
import { SCHEDULE } from './schedule';

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// ─────────────────────────────────────────────────────────────
// Practice address — office moves to Tiong Bahru on 1 July 2026.
// Sessions on/after that date show the new address.
// ─────────────────────────────────────────────────────────────
function getPracticeAddress(sessionDate) {
  var moveDate = new Date('2026-07-01T00:00:00+08:00');
  var date = sessionDate instanceof Date ? sessionDate : new Date(sessionDate);

  if (!isNaN(date.getTime()) && date >= moveDate) {
    return {
      html: '<strong>65 Tiong Poh Road, #02-26</strong><br>Tiong Bahru Estate, Singapore 160065',
      text: '65 Tiong Poh Road, #02-26, Tiong Bahru Estate, Singapore 160065',
    };
  }

  return {
    html: '<strong>20 Upper Circular Road #01-12</strong><br>The Riverwalk, Singapore 058416',
    text: '20 Upper Circular Road #01-12, The Riverwalk, Singapore 058416',
  };
}

function buildWhatsAppLink(phone, message) {
  if (!phone) return '';
  var cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  if (cleanPhone.indexOf('+') !== 0) cleanPhone = '+65' + cleanPhone;
  cleanPhone = cleanPhone.replace('+', '');
  return 'https://wa.me/' + cleanPhone + '?text=' + encodeURIComponent(message);
}

export async function sendBookingEmails({ clientName, clientEmail, clientPhone, sessionType, slotStart, slotEnd, reason }) {
  var sessionConfig = SCHEDULE.sessions[sessionType];
  var startDate = new Date(slotStart);

  var dateFormatted = startDate.toLocaleDateString('en-SG', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'Asia/Singapore'
  });

  var timeFormatted = startDate.toLocaleTimeString('en-SG', {
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: 'Asia/Singapore'
  });

  var sessionLabel = sessionConfig ? sessionConfig.label : 'Psychotherapy Session';
  var deposit = sessionConfig ? sessionConfig.deposit : 0;
  var balance = sessionConfig ? (sessionConfig.fee - sessionConfig.deposit) : 0;

  // Address depends on session date (office move: 1 July 2026)
  var address = getPracticeAddress(startDate);

  // WhatsApp confirmation message for client
  var firstName = clientName ? clientName.split(' ')[0] : '';
  var waMessage = 'Hi ' + firstName + ', your session is confirmed for ' + dateFormatted + ' at ' + timeFormatted + '.\n\n' + address.text + '\n\nSee you then!\n— Nicole';
  var waLink = buildWhatsAppLink(clientPhone, waMessage);

  // Email to client
  var clientHtml = [
    '<div style="font-family:sans-serif; max-width:500px; margin:0 auto; color:#2a2822;">',
    '<div style="background:#3d6b50; height:4px;"></div>',
    '<div style="padding:2rem;">',
    '<h2 style="font-family:Georgia,serif; color:#1a1a18; margin-bottom:1.5rem;">Your Session is Confirmed</h2>',
    '<table style="width:100%; border-collapse:collapse; margin-bottom:1.5rem;">',
    '<tr><td style="padding:0.5rem 0; color:#8a8478; width:120px;">Session</td><td style="padding:0.5rem 0; font-weight:500;">' + sessionLabel + '</td></tr>',
    '<tr><td style="padding:0.5rem 0; color:#8a8478;">Date</td><td style="padding:0.5rem 0; font-weight:500;">' + dateFormatted + '</td></tr>',
    '<tr><td style="padding:0.5rem 0; color:#8a8478;">Time</td><td style="padding:0.5rem 0; font-weight:500;">' + timeFormatted + '</td></tr>',
    '<tr><td style="padding:0.5rem 0; color:#8a8478;">Deposit paid</td><td style="padding:0.5rem 0;">SGD ' + deposit.toFixed(2) + '</td></tr>',
    '<tr style="border-top:1px solid #e0dbd4;"><td style="padding:0.5rem 0; color:#8a8478;">Balance due</td><td style="padding:0.5rem 0; font-weight:500; color:#3d6b50;">SGD ' + balance.toFixed(2) + '</td></tr>',
    '</table>',
    '<div style="background:#f0e8c8; border-left:3px solid #3d6b50; padding:1rem; margin-bottom:1.5rem;">',
    address.html,
    '</div>',
    '<p style="font-size:0.9em; color:#8a8478;">Please arrive 5–10 minutes early. Cancellations more than 48 hours before the session are refunded minus Stripe fees.</p>',
    '<p style="margin-top:1.5rem;"><a href="https://wa.me/6587978848" style="color:#3d6b50;">WhatsApp</a> · <a href="https://psychotherapist.sg" style="color:#3d6b50;">psychotherapist.sg</a></p>',
    '<p style="color:#8a8478; font-size:0.85em; margin-top:1rem;">Nicole Chew-Helbig, PhD<br>Integrative Gestalt Psychotherapist</p>',
    '</div>',
    '<div style="background:#3d6b50; height:3px;"></div>',
    '</div>',
  ].join('\n');

  // Email to Nicole — with WhatsApp click-to-send link
  var nicoleHtml = [
    '<div style="font-family:sans-serif; max-width:500px; margin:0 auto; color:#2a2822;">',
    '<div style="background:#3d6b50; height:4px;"></div>',
    '<div style="padding:1.5rem;">',
    '<h2 style="font-family:Georgia,serif; color:#1a1a18; margin-bottom:0.3rem;">New Booking</h2>',
    '<p style="color:#8a8478; margin-bottom:1.5rem;">' + dateFormatted + ' at ' + timeFormatted + '</p>',
    '<div style="background:#fdf6e3; border-left:3px solid #3d6b50; padding:1rem; margin-bottom:1rem; border-radius:2px;">',
    '<div style="font-weight:600; font-size:16px; margin-bottom:0.3rem;">' + clientName + '</div>',
    '<div style="font-size:14px; color:#8a8478;">' + sessionLabel + '</div>',
    '<div style="font-size:14px; margin-top:0.5rem;">Phone: ' + clientPhone + '</div>',
    '<div style="font-size:14px;">Email: ' + clientEmail + '</div>',
    reason ? '<div style="font-size:14px; margin-top:0.5rem; color:#8a8478;">Reason: ' + reason + '</div>' : '',
    '<div style="font-size:14px; margin-top:0.5rem;">Deposit: SGD ' + deposit.toFixed(2) + ' (paid) · Balance: SGD ' + balance.toFixed(2) + '</div>',
    '</div>',
    waLink ? '<a href="' + waLink + '" style="display:block; background:#3d6b50; color:white; text-align:center; padding:12px 20px; border-radius:3px; text-decoration:none; font-size:15px; margin-bottom:1rem;">💬 WhatsApp ' + firstName + '</a>' : '',
    '</div>',
    '<div style="background:#3d6b50; height:3px;"></div>',
    '</div>',
  ].filter(Boolean).join('\n');

  // Send to client
  try {
    await transporter.sendMail({
      from: '"Nicole Chew-Helbig" <' + process.env.GMAIL_USER + '>',
      to: clientEmail,
      subject: 'Session Confirmed — ' + dateFormatted + ' at ' + timeFormatted,
      html: clientHtml,
    });
    console.log('Client email sent to ' + clientEmail);
  } catch (err) {
    console.error('Client email failed:', err.message);
  }

  // Send to Nicole
  try {
    await transporter.sendMail({
      from: '"Booking System" <' + process.env.GMAIL_USER + '>',
      to: process.env.GMAIL_USER,
      subject: '📅 New Booking: ' + clientName + ' — ' + dateFormatted + ' ' + timeFormatted,
      html: nicoleHtml,
    });
    console.log('Nicole email sent');
  } catch (err) {
    console.error('Nicole email failed:', err.message);
  }
}
