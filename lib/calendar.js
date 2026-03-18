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
  const auth = Auth();
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

// Calculate day of week from pure numbers — no Date object, no timezone issues
// Returns 0=Sunday, 1=Monday, 2=Tuesday, ... 6=Saturday
function getDayOfWeek(year, month, day) {
  // Use JavaScript but force UTC to avoid server timezone issues
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

// Build an ISO string in Singapore time (UTC+8)
function sgtISO(year, month, day, hour, minute) {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const hh = String(hour).padStart(2, '0');
  const mi = String(minute).padStart(2, '0');
  return year + '-' + mm + '-' + dd + 'T' + hh + ':' + mi + ':00+08:00';
}

// Parse an ISO string to epoch ms
function toMs(iso) {
  return new Date(iso).getTime();
}

export async function getAvailableSlots(year, month, day, dayOfWeek, sessionType) {
  const session = SCHEDULE.sessions[sessionType];
  if (!session) return [];

  // Day of week using pure math — no timezone shifting possible
  const dayHours = SCHEDULE.hours[dayOfWeek];
  console.log('SLOTS:', JSON.stringify({ year, month, day, dayOfWeek, open: !!dayHours }));
  if (!dayHours) return [];

  // Build SGT time range for the day
  const dayStartISO = sgtISO(year, month, day, dayHours.start, 0);
  const dayEndISO = sgtISO(year, month, day, dayHours.end, 0);
  const dayStartMs = toMs(dayStartISO);
  const dayEndMs = toMs(dayEndISO);

  // Minimum notice check (48 hours)
  const nowMs = Date.now();
  const minNoticeMs = nowMs + SCHEDULE.minNoticeHours * 3600000;
  if (dayEndMs <= minNoticeMs) return [];

  // Get busy times from Google Calendar
  const busyTimes = await getBusyTimes(dayStartISO, dayEndISO);
  const busyRanges = busyTimes.map(function(b) {
    return { start: toMs(b.start), end: toMs(b.end) };
  });
  console.log('BUSY:', JSON.stringify(busyRanges.map(function(b) {
    return { start: new Date(b.start).toISOString(), end: new Date(b.end).toISOString() };
  })));

  // Generate slots
  const slotDurationMs = (session.duration + SCHEDULE.buffer) * 60000;
  const sessionMs = session.duration * 60000;
  const slots = [];
  var cursor = dayStartMs;

  while (cursor + sessionMs <= dayEndMs) {
    var slotStartMs = cursor;
    var slotEndMs = cursor + sessionMs;

    if (slotStartMs >= minNoticeMs) {
      var isBusy = busyRanges.some(function(b) {
        return slotStartMs < b.end && slotEndMs > b.start;
      });

      if (!isBusy) {
        // Calculate hours and minutes from millisecond offset
        var minutesFromDayStart = (slotStartMs - dayStartMs) / 60000;
        var slotHour = dayHours.start + Math.floor(minutesFromDayStart / 60);
        var slotMin = Math.round(minutesFromDayStart % 60);

        var endMinutesFromDayStart = (slotEndMs - dayStartMs) / 60000;
        var endHour = dayHours.start + Math.floor(endMinutesFromDayStart / 60);
        var endMin = Math.round(endMinutesFromDayStart % 60);

        // Format label in 12-hour SGT
        var ampm = slotHour >= 12 ? 'pm' : 'am';
        var displayHour = slotHour > 12 ? slotHour - 12 : slotHour;
        if (displayHour === 0) displayHour = 12;
        var label = String(displayHour).padStart(2, '0') + ':' + String(slotMin).padStart(2, '0') + ' ' + ampm;

        slots.push({
          start: sgtISO(year, month, day, slotHour, slotMin),
          end: sgtISO(year, month, day, endHour, endMin),
          label: label,
        });
      }
    }

    cursor += slotDurationMs;
  }

  return slots;
}
