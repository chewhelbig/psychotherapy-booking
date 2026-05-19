// ═══════════════════════════════════════════════════
// SCHEDULE CONFIG — Booking app
//
// Office relocates to Tiong Bahru on 22 June 2026. From that date:
//   - Mondays open 8am–8pm (was closed)
//   - Saturdays 8am–5pm (was 9am–6pm)
//   - Sundays closed (unchanged)
//
// Slot model (from 22 June 2026):
//   Individual — client sees 50 min, calendar event is 60 min
//                (50 session + 10 buffer baked into the block).
//   Couples    — client sees 80 min, calendar event is 90 min
//                (80 session + 10 buffer baked into the block).
//   Between events — a further 15 min gap.
//
//   So next slot = previous event end + 15 min.
//   This always lands on a quarter-hour mark.
//
// To block time off (lunch, supervision, Singapore public holidays,
// personal time) create events in Google Calendar. Anything blocked
// there is unavailable for booking.
//
// Use getHoursForDate() and getBufferForDate() rather than reading
// SCHEDULE.hours / SCHEDULE.buffer directly.
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
  0: null,                    // Sunday — closed
  1: { start: 8, end: 20 },   // Monday 8am–8pm
  2: { start: 8, end: 20 },   // Tuesday
  3: { start: 8, end: 20 },   // Wednesday
  4: { start: 8, end: 20 },   // Thursday
  5: { start: 8, end: 20 },   // Friday
  6: { start: 8, end: 17 },   // Saturday 8am–5pm
};

export function getHoursForDate(sessionDate) {
  const date = new Date(sessionDate);
  const table = date >= TIONG_BAHRU_THRESHOLD
    ? HOURS_FROM_22_JUNE_2026
    : HOURS_BEFORE_22_JUNE_2026;
  return table[date.getDay()];
}

// Minutes between the end of one calendar event and the start of the next.
export function getBufferForDate(sessionDate) {
  return new Date(sessionDate) >= TIONG_BAHRU_THRESHOLD ? 15 : 10;
}

export const SCHEDULE = {
  timezone: 'Asia/Singapore',
  hours: HOURS_FROM_22_JUNE_2026,
  sessions: {
    individual: {
      label: 'Individual Psychotherapy',
      duration: 50,        // minutes shown to the client
      eventDuration: 60,   // calendar event block (50 + 10 in-event buffer)
      fee: 220,
      deposit: 55,
      stripePriceLabel: 'Deposit — Individual Session',
    },
    couples: {
      label: 'Couples Counselling',
      duration: 80,
      eventDuration: 90,   // 80 + 10 in-event buffer
      fee: 370,
      deposit: 92.50,
      stripePriceLabel: 'Deposit — Couples Session',
    },
  },
  buffer: 15,
  maxAdvanceDays: 60,
  minNoticeHours: 10,
};