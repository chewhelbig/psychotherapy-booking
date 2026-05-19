import { google } from 'googleapis';
import {
  SCHEDULE,
  getHoursForDate,
  getBufferForDate,
  getEventDurationForDate,
} from './schedule';

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
      // attendees removed — service account cannot invite without domain delegation
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
  return year + '-' + mm + '-' + dd + 'T' + hh + ':' + mi + ':00+08:00';
}

function toMs(iso) {
  return new Date(iso).getTime();
}

function offsetToHourMin(offsetMs, startHour) {
  const minutes = Math.round(offsetMs / 60000);
  return {
    hour: startHour + Math.floor(minutes / 60),
    minute: minutes % 60,
  };
}

function formatLabel(hour, minute) {
  const ampm = hour >= 12 ? 'pm' : 'am';
  let displayHour = hour > 12 ? hour - 12 : hour;
  if (displayHour === 0) displayHour = 12;
  return String(displayHour).padStart(2, '0') + ':' + String(minute).padStart(2, '0') + ' ' + ampm;
}

export async function getAvailableSlots(year, month, day, dayOfWeek, sessionType) {
  const session = SCHEDULE.sessions[sessionType];
  if (!session) return [];

  // Resolve date-dependent rules.
  const sessionDate = new Date(sgtISO(year, month, day, 12, 0));
  const dayHours = getHoursForDate(sessionDate);
  const bufferMin = getBufferForDate(sessionDate);
  const eventMin = getEventDurationForDate(sessionDate, sessionType);
  if (!dayHours) return [];

  // Day boundaries.
  const dayStartISO = sgtISO(year, month, day, dayHours.start, 0);
  const dayEndISO = sgtISO(year, month, day, dayHours.end, 0);
  const dayStartMs = toMs(dayStartISO);
  const dayEndMs = toMs(dayEndISO);

  // Minimum notice.
  const nowMs = Date.now();
  const minNoticeMs = nowMs + SCHEDULE.minNoticeHours * 3600000;
  if (dayEndMs <= minNoticeMs) return [];

  // Existing bookings on this day, sorted.
  const busyTimes = await getBusyTimes(dayStartISO, dayEndISO);
  const busyRanges = busyTimes
    .map(function(b) { return { start: toMs(b.start), end: toMs(b.end) }; })
    .sort(function(a, b) { return a.start - b.start; });

  // Slot sizing.
  const eventMs = eventMin * 60000;
  const bufferMs = bufferMin * 60000;
  const stepMs = eventMs + bufferMs;

  // Free blocks — continuous time between busy ranges, padded by
  // `bufferMs` on each side of every busy range.
  const freeBlocks = [];
  let blockStart = dayStartMs;
  for (const busy of busyRanges) {
    const blockEnd = busy.start - bufferMs;
    if (blockEnd > blockStart) {
      freeBlocks.push({ start: blockStart, end: blockEnd });
    }
    blockStart = busy.end + bufferMs;
  }
  if (dayEndMs > blockStart) {
    freeBlocks.push({ start: blockStart, end: dayEndMs });
  }

  // Forward-pack slots within each free block, anchored to block.start.
  // slotStart = client-facing time and value passed to Stripe/Calendar.
  // slotEnd   = end of the calendar event block (slotStart + eventMs).
  const slots = [];
  for (const block of freeBlocks) {
    let cursor = block.start;
    while (cursor + eventMs <= block.end) {
      if (cursor >= minNoticeMs) {
        const slotStartMs = cursor;
        const slotEndMs = cursor + eventMs;
        const startHM = offsetToHourMin(slotStartMs - dayStartMs, dayHours.start);
        const endHM = offsetToHourMin(slotEndMs - dayStartMs, dayHours.start);
        slots.push({
          start: sgtISO(year, month, day, startHM.hour, startHM.minute),
          end: sgtISO(year, month, day, endHM.hour, endHM.minute),
          label: formatLabel(startHM.hour, startHM.minute),
        });
      }
      cursor += stepMs;
    }
  }

  return slots;
}