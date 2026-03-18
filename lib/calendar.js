import { google } from 'googleapis';
import { SCHEDULE } from './schedule';

function getAuth() {
  let key = process.env.GOOGLE_PRIVATE_KEY || '';
  key = key.replace(/^"/, '').replace(/"$/, '');
  if (key.includes('\\n')) {
    key = key.replace(/\\n/g, '\n');
  }

  return new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    key,
    ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events']
  );
}

export async function getBusyTimes(timeMin, timeMax) {
  const auth = getAuth();
  const calendar = google.calendar({ version: 'v3', auth });

  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      timeZone: SCHEDULE.timezone,
      items: [{ id: process.env.GOOGLE_CALENDAR_ID }],
    },
  });

  return res.data.calendars[process.env.GOOGLE_CALENDAR_ID]?.busy || [];
}

export async function createEvent({ summary, description, startTime, endTime, attendeeEmail }) {
  const auth = getAuth();
  const calendar = google.calendar({ version: 'v3', auth });

  const event = await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    requestBody: {
      summary,
      description,
      start: { dateTime: startTime, timeZone: SCHEDULE.timezone },
      end: { dateTime: endTime, timeZone: SCHEDULE.timezone },
      attendees: attendeeEmail ? [{ email: attendeeEmail }] : [],
      reminders: { useDefault: true },
    },
  });

  return event.data;
}

// Build an ISO string in Singapore time (UTC+8)
function sgtISO(year, month, day, hour, minute) {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const hh = String(hour).padStart(2, '0');
  const mi = String(minute).padStart(2, '0');
  return `${year}-${mm}-${dd}T${hh}:${mi}:00+08:00`;
}

// Parse an ISO string to epoch ms
function toMs(iso) {
  return new Date(iso).getTime();
}

export async function getAvailableSlots(year, month, day, sessionType) {
  const session = SCHEDULE.sessions[sessionType];
  if (!session) return [];

  // Determine day of week in SGT
  const refDate = new Date(`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}T12:00:00+08:00`);
  const dayOfWeek = new Date(year, month - 1, day).getDay();
  // Adjust: since noon SGT = 04:00 UTC, getUTCDay gives correct SGT day
  const dayHours = SCHEDULE.hours[dayOfWeek];
  console.log('DEBUG:', JSON.stringify({ year, month, day, dayOfWeek, dayHours }));
  if (!dayHours) return [];

  const dayStartISO = sgtISO(year, month, day, dayHours.start, 0);
  const dayEndISO = sgtISO(year, month, day, dayHours.end, 0);
  const dayStartMs = toMs(dayStartISO);
  const dayEndMs = toMs(dayEndISO);

  // Minimum notice check
  const nowMs = Date.now();
  const minNoticeMs = nowMs + SCHEDULE.minNoticeHours * 3600000;
  if (dayEndMs <= minNoticeMs) return [];

  // Get busy times from Google Calendar
  const busyTimes = await getBusyTimes(dayStartISO, dayEndISO);
  const busyRanges = busyTimes.map(b => ({ start: toMs(b.start), end: toMs(b.end) }));

  // Generate slots
  const slotDurationMs = (session.duration + SCHEDULE.buffer) * 60000;
  const sessionMs = session.duration * 60000;
  const slots = [];
  let cursor = dayStartMs;

  while (cursor + sessionMs <= dayEndMs) {
    const slotStartMs = cursor;
    const slotEndMs = cursor + sessionMs;

    if (slotStartMs >= minNoticeMs) {
      const isBusy = busyRanges.some(b => slotStartMs < b.end && slotEndMs > b.start);

      if (!isBusy) {
        // Format time label in SGT
        const slotDate = new Date(slotStartMs);
        const label = slotDate.toLocaleTimeString('en-SG', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Singapore'
        });

        // Build proper SGT ISO strings for the slot
        const startHour = Math.floor((slotStartMs - dayStartMs) / 3600000) + dayHours.start;
        const startMin = Math.floor(((slotStartMs - dayStartMs) % 3600000) / 60000);
        const endHour = Math.floor((slotEndMs - dayStartMs) / 3600000) + dayHours.start;
        const endMin = Math.floor(((slotEndMs - dayStartMs) % 3600000) / 60000);

        slots.push({
          start: sgtISO(year, month, day, startHour, startMin),
          end: sgtISO(year, month, day, endHour, endMin),
          label,
        });
      }
    }

    cursor += slotDurationMs;
  }

  return slots;
}
