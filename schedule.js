// ═══════════════════════════════════════════════════
// SCHEDULE CONFIG — Edit this to control your availability
// ═══════════════════════════════════════════════════

export const SCHEDULE = {
  // Time zone
  timezone: 'Asia/Singapore',

  // Default available hours per day of week
  // Set to null to mark a day as unavailable
  // Hours are in 24h format
  hours: {
    0: null,                          // Sunday — closed
    1: { start: 10, end: 19 },        // Monday 10am–7pm
    2: { start: 10, end: 19 },        // Tuesday
    3: { start: 10, end: 19 },        // Wednesday
    4: { start: 10, end: 19 },        // Thursday
    5: { start: 10, end: 19 },        // Friday
    6: null,                          // Saturday — closed
  },

  // Session types
  sessions: {
    individual: {
      label: 'Individual Psychotherapy',
      duration: 50,       // minutes
      fee: 220,           // SGD
      deposit: 55,        // 25% of 220
      stripePriceLabel: 'Deposit — Individual Session',
    },
    couples: {
      label: 'Couples Counselling',
      duration: 80,       // minutes
      fee: 370,           // SGD
      deposit: 92.50,     // 25% of 370 (Stripe needs cents: 9250)
      stripePriceLabel: 'Deposit — Couples Session',
    },
  },

  // Buffer between sessions (minutes)
  buffer: 10,

  // How far ahead clients can book (days)
  maxAdvanceDays: 60,

  // Minimum notice for booking (hours)
  minNoticeHours: 24,
}
