import nodemailer from 'nodemailer';
import { SCHEDULE } from './schedule';

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

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
    '<strong>73 Eng Watt Street</strong><br>Tiong Bahru Estate, Singapore 160073<br>',
    '<span style="color:#8a8478; font-size:0.9em;">Tiong Bahru MRT (EW17) · 8 min walk</span>',
    '</div>',
    '<p style="font-size:0.9em; color:#8a8478;">Please arrive 5–10 minutes early. Cancellations less than 48 hours before the session are charged in full.</p>',
    '<p style="margin-top:1.5rem;"><a href="https://wa.me/6587978848" style="color:#3d6b50;">WhatsApp</a> · <a href="https://psychotherapist.sg" style="color:#3d6b50;">psychotherapist.sg</a></p>',
    '<p style="color:#8a8478; font-size:0.85em; margin-top:1rem;">Nicole Chew-Helbig, PhD<br>Integrative Gestalt Psychotherapist</p>',
    '</div>',
    '<div style="background:#3d6b50; height:3px;"></div>',
    '</div>',
  ].join('\n');

  // Email to Nicole
  var nicoleHtml = [
    '<div style="font-family:sans-serif; color:#2a2822;">',
    '<h3>New Booking</h3>',
    '<p><strong>' + clientName + '</strong> — ' + sessionLabel + '</p>',
    '<p>' + dateFormatted + ' at ' + timeFormatted + '</p>',
    '<p>Phone: ' + clientPhone + '<br>Email: ' + clientEmail + '</p>',
    reason ? '<p>Reason: ' + reason + '</p>' : '',
    '<p>Deposit: SGD ' + deposit.toFixed(2) + ' (paid)<br>Balance: SGD ' + balance.toFixed(2) + '</p>',
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
      subject: 'New Booking: ' + clientName + ' — ' + dateFormatted + ' ' + timeFormatted,
      html: nicoleHtml,
    });
    console.log('Nicole email sent');
  } catch (err) {
    console.error('Nicole email failed:', err.message);
  }
}
