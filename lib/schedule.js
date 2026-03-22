// ═══════════════════════════════════════════════════
// SCHEDULE CONFIG — Edit this to control your availability
// 
// These are your MAXIMUM available hours.
// To block time off, create events in Google Calendar.
// Any time blocked in Google Calendar = unavailable for booking.
// ═══════════════════════════════════════════════════

export const SCHEDULE = {
  timezone: 'Asia/Singapore',

  hours: {
    0: null,                          // Sunday — closed
    1: null,                          // Monday — blocked
    2: { start: 8, end: 20 },        // Tuesday 8am–8pm
    3: { start: 8, end: 20 },        // Wednesday
    4: { start: 8, end: 20 },        // Thursday
    5: { start: 8, end: 20 },        // Friday
    6: { start: 9, end: 18 },        // Saturday 9am–6pm
  },

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

  buffer: 10,
  maxAdvanceDays: 60,
  minNoticeHours: 10,
}
