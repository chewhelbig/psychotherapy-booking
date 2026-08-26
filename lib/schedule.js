// ═══════════════════════════════════════════════════
// SCHEDULE CONFIG — Booking app
//
// Office relocates to Tiong Bahru on 22 June 2026. From that date:
//   - Mondays open (was closed)
//   - Sundays closed (unchanged)
//
// Hours updated August 2026:
//   - Mon–Fri 9am–8:30pm
//   - Saturday 9am–6pm
// `end` may be fractional (20.5 = 8:30pm); calendar.js converts it.
//
// Slot model differs by date:
//
//   Before 22 June 2026 — legacy behaviour, unchanged from 2025:
//     Individual: 50-min event blocks, 10-min buffer between them.
//     Couples:    80-min event blocks, 10-min buffer.
//     Slots on the hour (fixed grid).
//
//   From 22 June 2026:
//     Individual: 60-min event block (50 session + 10 in-event buffer).
//     Couples:    90-min event block (80 session + 10 in-event buffer).
//     A further 15 min between events. Slots always land on a
//     quarter-hour mark.
//
//   Slot placement (August 2026):
//     A free gap that ends at a calendar event offers only two slots —
//     one flush against the start of the gap and one flush against its
//     end — so bookings sit next to existing appointments instead of
//     fragmenting the gap. The stretch after the last event of the day
//     (or an empty day) forward-packs from its start as before.
//
// To block time off (lunch, supervision, Singapore public holidays,
// personal time) create events in Google Calendar. Anything blocked
// there is unavailable for booking.
//
// Use the getHoursForDate(), getBufferForDate(), getEventDurationForDate()
// helpers rather than reading SCHEDULE.hours / SCHEDULE.buffer directly.
// ═══════════════════════════════════════════════════

const TIONG_BAHRU_THRESHOLD = new Date('2026-06-22T00:00:00+08:00');

const HOURS_BEFORE_22_JUNE_2026 = {
  0: null,                    // Sunday — closed
  1: null,                    // Monday — closed
  2: { start: 8, end: 20 },   // Tuesday 8am–8pm
  3: { start: 8, end: 20 },   // Wednesday
  4: { start: 8, end: 20 },   // Thursday
  5: { start: 8, end: 20 },   // Friday
  6: { start: 9, end: 18 },   // Saturday 9am–6pm
};

const HOURS_FROM_22_JUNE_2026 = {
  0: null,                      // Sunday — closed
  1: { start: 9, end: 20.5 },   // Monday 9am–8:30pm
  2: { start: 9, end: 20.5 },   // Tuesday
  3: { start: 9, end: 20.5 },   // Wednesday
  4: { start: 9, end: 20.5 },   // Thursday
  5: { start: 9, end: 20.5 },   // Friday
  6: { start: 9, end: 18 },     // Saturday 9am–6pm
};

function isFrom22June(sessionDate) {
  return new Date(sessionDate) >= TIONG_BAHRU_THRESHOLD;
}

export function getHoursForDate(sessionDate) {
  const table = isFrom22June(sessionDate)
    ? HOURS_FROM_22_JUNE_2026
    : HOURS_BEFORE_22_JUNE_2026;
  return table[new Date(sessionDate).getDay()];
}

// Minutes between the end of one event and the start of the next.
export function getBufferForDate(sessionDate) {
  return isFrom22June(sessionDate) ? 15 : 10;
}

// Calendar event duration (the time block actually saved to Google Calendar).
// Pre-22-June: matches session duration (legacy).
// From 22 June: session duration + 10 min in-event buffer.
export function getEventDurationForDate(sessionDate, sessionType) {
  const session = SCHEDULE.sessions[sessionType];
  if (!session) return 0;
  return isFrom22June(sessionDate)
    ? session.duration + 10
    : session.duration;
}

export const SCHEDULE = {
  timezone: 'Asia/Singapore',
  hours: HOURS_FROM_22_JUNE_2026,
  sessions: {
    individual: {
      label: 'Individual Psychotherapy',
      duration: 50,        // minutes shown to the client
      fee: 220,
      deposit: 55,
      stripePriceLabel: 'Deposit — Individual Session',
    },
    couples: {
      label: 'Couples Counselling',
      duration: 80,
      fee: 370,
      deposit: 92.50,
      stripePriceLabel: 'Deposit — Couples Session',
    },
  },
  buffer: 15,
  maxAdvanceDays: 60,
  minNoticeHours: 10,
};