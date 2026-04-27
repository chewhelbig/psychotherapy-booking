// ═══════════════════════════════════════════════════
// SCHEDULE CONFIG — Edit this to control your availability
// 
// These are your MAXIMUM available hours.
// To block time off, create events in Google Calendar.
// Any time blocked in Google Calendar = unavailable for booking.
//
// Office relocates to Tiong Bahru on 1 July 2026. From that date:
//   - Mondays open (was closed)
//   - Buffer between sessions: 10 → 40 minutes
// Use getHoursForDate() and getBufferForDate() rather than reading
// SCHEDULE.hours / SCHEDULE.buffer directly.
// ═══════════════════════════════════════════════════

const TIONG_BAHRU_THRESHOLD = new Date('2026-07-01T00:00:00+08:00');

const HOURS_BEFORE_JULY_2026 = {
  0: null,                          // Sunday — closed
  1: null,                          // Monday — closed
  2: { start: 8, end: 20 },         // Tuesday 8am–8pm
  3: { start: 8, end: 20 },         // Wednesday
  4: { start: 8, end: 20 },         // Thursday
  5: { start: 8, end: 20 },         // Friday
  6: { start: 9, end: 18 },         // Saturday 9am–6pm
};

const HOURS_FROM_JULY_2026 = {
  0: null,                          // Sunday — closed
  1: { start: 8, end: 20 },         // Monday 8am–8pm (NEW)
  2: { start: 8, end: 20 },         // Tuesday
  3: { start: 8, end: 20 },         // Wednesday
  4: { start: 8, end: 20 },         // Thursday
  5: { start: 8, end: 20 },         // Friday
  6: { start: 9, end: 18 },         // Saturday 9am–6pm
};

export function getHoursForDate(sessionDate) {
  const date = new Date(sessionDate);
  const table = date >= TIONG_BAHRU_THRESHOLD
    ? HOURS_FROM_JULY_2026
    : HOURS_BEFORE_JULY_2026;
  return table[date.getDay()];
}

export function getBufferForDate(sessionDate) {
  return new Date(sessionDate) >= TIONG_BAHRU_THRESHOLD ? 40 : 10;
}

export const SCHEDULE = {
  timezone: 'Asia/Singapore',
  // Legacy reference. New code should use the helpers above —
  // these defaults reflect the post-July-2026 rules.
  hours: HOURS_FROM_JULY_2026,
  sessions: {
    individual: {
      label: 'Individual Psychotherapy',
      duration: 50,
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
  buffer: 40,
  maxAdvanceDays: 60,
  minNoticeHours: 10,
};
