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

// Like getBusyTimes, but uses events.list so we can see each event's title.
// freebusy strips titles, so it can't tell an untitled "(no title)" block
// apart from a named one. Returns sorted [{ start, end, untitled }] in ms.
// Untitled events are the ones a client may book right up against (no gap);
// every other event keeps the normal buffer on both sides.
export async function getBusyEvents(timeMin, timeMax) {
  const auth = getAuth();
  const calendar = google.calendar({ version: 'v3', auth });
  const res = await calendar.events.list({
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    timeMin,
    timeMax,
    timeZone: SCHEDULE.timezone,
    singleEvents: true,        // expand recurring events into instances
    orderBy: 'startTime',
    maxResults: 250,
  });

  const items = res.data.items || [];
  const windowStartMs = toMs(timeMin);
  const windowEndMs = toMs(timeMax);
  const events = [];

  for (const ev of items) {
    if (ev.status === 'cancelled') continue;
    // Events marked "Free" don't block bookings (matches freebusy behaviour).
    if (ev.transparency === 'transparent') continue;

    let startMs, endMs;
    if (ev.start && ev.start.dateTime) {
      startMs = toMs(ev.start.dateTime);
      endMs = toMs(ev.end.dateTime);
    } else if (ev.start && ev.start.date) {
      // All-day event (e.g. a holiday block) — treat as blocking the day.
      startMs = windowStartMs;
      endMs = windowEndMs;
    } else {
      continue;
    }

    // Ignore anything outside the working-day window; clamp partial overlaps.
    if (endMs <= windowStartMs || startMs >= windowEndMs) continue;
    if (startMs < windowStartMs) startMs = windowStartMs;
    if (endMs > windowEndMs) endMs = windowEndMs;

    const summary = (ev.summary || '').trim();
    events.push({ start: startMs, end: endMs, untitled: summary === '' });
  }

  events.sort(function(a, b) { return a.start - b.start; });
  return events;
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

// Split a possibly fractional hour (20.5) into { hour: 20, minute: 30 }.
function hourToHM(h) {
  const hour = Math.floor(h);
  return { hour: hour, minute: Math.round((h - hour) * 60) };
}

// Snap an epoch-ms timestamp to a quarter-hour mark. SGT is a whole-hour
// offset from UTC, so quarter-hour boundaries are the same in both.
const QUARTER_MS = 15 * 60000;
function ceilToQuarter(ms) {
  return Math.ceil(ms / QUARTER_MS) * QUARTER_MS;
}
function floorToQuarter(ms) {
  return Math.floor(ms / QUARTER_MS) * QUARTER_MS;
}

function offsetToHourMin(offsetMs, startHour, startMinute) {
  const minutes = (startMinute || 0) + Math.round(offsetMs / 60000);
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

  // Day boundaries (end may be fractional, e.g. 20.5 = 8:30pm).
  const openHM = hourToHM(dayHours.start);
  const closeHM = hourToHM(dayHours.end);
  const dayStartISO = sgtISO(year, month, day, openHM.hour, openHM.minute);
  const dayEndISO = sgtISO(year, month, day, closeHM.hour, closeHM.minute);
  const dayStartMs = toMs(dayStartISO);
  const dayEndMs = toMs(dayEndISO);

  // Minimum notice.
  const nowMs = Date.now();
  const minNoticeMs = nowMs + SCHEDULE.minNoticeHours * 3600000;
  if (dayEndMs <= minNoticeMs) return [];

  // Existing events on this day, sorted, each tagged untitled/titled.
  const busyRanges = await getBusyEvents(dayStartISO, dayEndISO);

  // Slot sizing.
  const eventMs = eventMin * 60000;
  const bufferMs = bufferMin * 60000;
  const stepMs = eventMs + bufferMs;

  // Free blocks — continuous time between busy ranges. Each busy range is
  // padded by `bufferMs` on both sides, EXCEPT untitled "(no title)" events,
  // which get no padding — a client can book right up to their edge.
  // Each block records whether it ends at an event (endsAtEvent) or at the
  // day's closing time.
  const freeBlocks = [];
  let blockStart = dayStartMs;
  for (const busy of busyRanges) {
    const pad = busy.untitled ? 0 : bufferMs;
    const blockEnd = busy.start - pad;
    if (blockEnd > blockStart) {
      freeBlocks.push({ start: blockStart, end: blockEnd, endsAtEvent: true });
    }
    // Math.max guards against overlapping events pulling the cursor backwards.
    blockStart = Math.max(blockStart, busy.end + pad);
  }
  if (dayEndMs > blockStart) {
    freeBlocks.push({ start: blockStart, end: dayEndMs, endsAtEvent: false });
  }

  // Slot placement.
  //   slotStart = client-facing time and value passed to Stripe/Calendar.
  //   slotEnd   = end of the calendar event block (slotStart + eventMs).
  //
  // A block that ends at an event offers exactly two slots: one flush
  // against the block's start and one flush against its end (so the new
  // booking sits right up to the neighbouring appointment / untitled block
  // and doesn't fragment the gap). If only one fits, or both land on the
  // same time, one slot is offered.
  //
  // The final block of the day (after the last event, or the whole day if
  // nothing is booked) forward-packs from its start as before.
  //
  // All slot starts are snapped to a quarter-hour mark: the start anchor
  // rounds up, the end anchor rounds down.
  const slots = [];
  const seen = {};

  function pushSlot(slotStartMs) {
    if (slotStartMs < minNoticeMs) return;
    if (seen[slotStartMs]) return;
    seen[slotStartMs] = true;
    const slotEndMs = slotStartMs + eventMs;
    const startHM = offsetToHourMin(slotStartMs - dayStartMs, openHM.hour, openHM.minute);
    const endHM = offsetToHourMin(slotEndMs - dayStartMs, openHM.hour, openHM.minute);
    slots.push({
      start: sgtISO(year, month, day, startHM.hour, startHM.minute),
      end: sgtISO(year, month, day, endHM.hour, endHM.minute),
      label: formatLabel(startHM.hour, startHM.minute),
    });
  }

  for (const block of freeBlocks) {
    const firstStart = ceilToQuarter(block.start);

    if (block.endsAtEvent) {
      // Start anchor.
      if (firstStart + eventMs <= block.end) pushSlot(firstStart);
      // End anchor — must still begin inside the block.
      const lastStart = floorToQuarter(block.end - eventMs);
      if (lastStart >= block.start && lastStart > firstStart) pushSlot(lastStart);
      continue;
    }

    // Last stretch of the day: forward-pack.
    let cursor = firstStart;
    while (cursor + eventMs <= block.end) {
      pushSlot(cursor);
      cursor += stepMs;
    }
  }

  slots.sort(function(a, b) { return a.start < b.start ? -1 : 1; });
  return slots;
}
