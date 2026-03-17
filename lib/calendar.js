import { google } from 'googleapis';
import { SCHEDULE } from './schedule';

function getAuth() {
  let key = process.env.GOOGLE_PRIVATE_KEY || '';
  key = key.replace(/^"/, '').replace(/"$/, '');
  if (key.includes('\\n')) {
    key = key.replace(/\\n/g, '\n');
  }
  if (!key.startsWith('-----BEGIN')) {
    console.error('PRIVATE_KEY issue. First 50 chars:', key.substring(0, 50));
  }

  return new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    key,
    ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events']
  );
}

export async function getBusyTimes(startDate, endDate) {
  const auth = getAuth();
  const calendar = google.calendar({ version: 'v3', auth });

  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
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

export async function getAvailableSlots(date, sessionType) {
  const session = SCHEDULE.sessions[sessionType];
  if (!session) return [];

  const dayOfWeek = date.getDay();
  const dayHours = SCHEDULE.hours[dayOfWeek];
  if (!dayHours) return [];

  const dayStart = new Date(date);
  dayStart.setHours(dayHours.start, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(dayHours.end, 0, 0, 0);

  const now = new Date();
  const minNotice = new Date(now.getTime() + SCHEDULE.minNoticeHours * 60 * 60 * 1000);
  if (dayEnd <= minNotice) return [];

  const busyTimes = await getBusyTimes(dayStart, dayEnd);

  const slotDuration = session.duration + SCHEDULE.buffer;
  const slots = [];
  let cursor = new Date(dayStart);

  while (cursor.getTime() + session.duration * 60000 <= dayEnd.getTime()) {
    const slotStart = new Date(cursor);
    const slotEnd = new Date(cursor.getTime() + session.duration * 60000);

    if (slotStart >= minNotice) {
      const isBusy = busyTimes.some(busy => {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);
        return slotStart < busyEnd && slotEnd > busyStart;
      });

      if (!isBusy) {
        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          label: slotStart.toLocaleTimeString('en-SG', {
            hour: '2-digit', minute: '2-digit', hour12: true, timeZone: SCHEDULE.timezone
          }),
        });
      }
    }

    cursor = new Date(cursor.getTime() + slotDuration * 60000);
  }

  return slots;
}
