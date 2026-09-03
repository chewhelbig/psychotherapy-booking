import { useState, useEffect } from 'react';
import Head from 'next/head';

const SESSIONS = {
  individual: { label: 'Individual Psychotherapy', duration: '50 min', fee: 220, deposit: 55 },
  couples: { label: 'Couples Counselling', duration: '80 min', fee: 370, deposit: 92.50 },
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function BookingPage() {
  const [step, setStep] = useState(1);
  const [sessionType, setSessionType] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Fetch slots when date changes
  useEffect(() => {
    if (!selectedDate || !sessionType) return;
    setLoading(true);
    setSelectedSlot(null);
    const dateStr = selectedDate.getFullYear() + '-' + String(selectedDate.getMonth() + 1).padStart(2, '0') + '-' + String(selectedDate.getDate()).padStart(2, '0');
    fetch(`/api/slots?date=${dateStr}&type=${sessionType}&dow=${selectedDate.getDay()}`)
      .then(r => r.json())
      .then(data => { setSlots(data.slots || []); setLoading(false); })
      .catch(() => { setSlots([]); setLoading(false); });
  }, [selectedDate, sessionType]);

  // Calendar helpers
  function getDaysInMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }
  function getFirstDayOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  }
  function isToday(day) {
    const today = new Date();
    return day === today.getDate() && currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear();
  }
  function isSameDate(day) {
    if (!selectedDate) return false;
    return day === selectedDate.getDate() && currentMonth.getMonth() === selectedDate.getMonth() && currentMonth.getFullYear() === selectedDate.getFullYear();
  }
  function isPast(day) {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const today = new Date(); today.setHours(0,0,0,0);
    return d < today;
  }

  function prevMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  }
  function nextMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  }

  function selectDate(day) {
    if (isPast(day)) return;
    setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
  }

  async function handleCheckout() {
    if (!form.name || !form.email || !form.phone) {
      setError('Please fill in your name, email, and phone number.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionType,
          slotStart: selectedSlot.start,
          slotEnd: selectedSlot.end,
          clientName: form.name,
          clientEmail: form.email,
          clientPhone: form.phone,
          reason: form.reason,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('Something went wrong. Please try again.');
        setSubmitting(false);
      }
    } catch {
      setError('Connection error. Please try again.');
      setSubmitting(false);
    }
  }

  const canProceedToStep2 = sessionType !== null;
  const canProceedToStep3 = selectedSlot !== null;
  const session = sessionType ? SESSIONS[sessionType] : null;

  const slotIsZoom = selectedSlot && isInZoomPeriod(new Date(selectedSlot.start));
  const slotIsNewOfficeNotice = selectedSlot && isInNewOfficeNoticePeriod(new Date(selectedSlot.start));
  const dateIsZoom = selectedDate && isInZoomPeriod(selectedDate);
  const dateIsNewOfficeNotice = selectedDate && isInNewOfficeNoticePeriod(selectedDate);

  const currentBannerPhase = bannerPhase();

  return (
    <>
      <Head>
        <title>Book an Appointment | Psychotherapist.sg</title>
        <meta name="description" content="Book a psychotherapy or couples counselling session with Nicole Chew-Helbig in Singapore." />
      </Head>

      <div className="band" />

      <div className="header">
        <a href="https://psychotherapist.sg">psychotherapist.sg</a>
      </div>

      <div style={{ padding: '2rem 0 3rem' }}>
        <div className="wrap">
          <p className="label">Book an Appointment</p>
          <h1>Schedule Your <em>Session</em></h1>

          {/* ─── Office relocation banner ─── */}
          {/*  Until 21 June: dual-phase notice (Zoom phase + upcoming move).         */}
          {/*  22 – 30 June:  "NEW LOCATION" notice.                                  */}
          {/*  After 30 June: banner hidden.                                          */}
          {currentBannerPhase === 'transition' && (
            <div style={{
              background: '#fdf6e3',
              borderLeft: '3px solid #3d6b50',
              padding: '0.85rem 1rem',
              margin: '1rem 0 0',
              borderRadius: '2px',
              fontSize: '0.92rem',
              color: '#2a2822',
              lineHeight: 1.5,
            }}>
              <strong>Office relocation:</strong> sessions on <strong>15&ndash;21 June 2026</strong> will be online via Zoom. From <strong>22 June 2026</strong>, sessions move to the new Tiong Bahru office at 65 Tiong Poh Road, #02-26.
            </div>
          )}
          {currentBannerPhase === 'new-location' && (
            <div style={{
              background: '#fdf6e3',
              borderLeft: '3px solid #3d6b50',
              padding: '0.85rem 1rem',
              margin: '1rem 0 0',
              borderRadius: '2px',
              fontSize: '0.92rem',
              color: '#2a2822',
              lineHeight: 1.5,
            }}>
              <strong>NEW LOCATION:</strong> From 22 June 2026, we&rsquo;ll meet in Tiong Bahru: 65 Tiong Poh Road, #02-26, Singapore 160065.
            </div>
          )}

          {/* Steps indicator */}
          <div className="steps">
            <div className={`step ${step === 1 ? 'active' : step > 1 ? 'done' : ''}`}>Session Type</div>
            <div className={`step ${step === 2 ? 'active' : step > 2 ? 'done' : ''}`}>Date &amp; Time</div>
            <div className={`step ${step === 3 ? 'active' : ''}`}>Details &amp; Pay</div>
          </div>

          {/* ════ STEP 1: Session Type ════ */}
          {step === 1 && (
            <div>
              <h2 style={{ marginTop: '2rem' }}>Choose your session type</h2>
              <div className="type-cards">
                {Object.entries(SESSIONS).map(([key, s]) => (
                  <div
                    key={key}
                    className={`type-card ${sessionType === key ? 'selected' : ''}`}
                    onClick={() => setSessionType(key)}
                  >
                    <h3>{s.label}</h3>
                    <div className="duration">{s.duration}</div>
                    <div className="fee">SGD {s.fee}</div>
                    <div className="deposit">25% deposit: SGD {s.deposit.toFixed(2)}</div>
                  </div>
                ))}
              </div>
              <button
                className="btn btn--green btn--full"
                disabled={!canProceedToStep2}
                onClick={() => setStep(2)}
              >
                Continue
              </button>
            </div>
          )}

          {/* ════ STEP 2: Date & Time ════ */}
          {step === 2 && (
            <div>
              <h2 style={{ marginTop: '2rem' }}>Pick a date and time</h2>
              <p style={{ color: 'var(--faint)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {session.label} · {session.duration}
              </p>

              {/* Calendar */}
              <div className="calendar">
                <div className="cal-header">
                  <button className="cal-nav" onClick={prevMonth}>&larr;</button>
                  <h3>{MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h3>
                  <button className="cal-nav" onClick={nextMonth}>&rarr;</button>
                </div>
                <div className="cal-grid">
                  {DAYS.map(d => <div key={d} className="cal-day-label">{d}</div>)}
                  {Array.from({ length: getFirstDayOfMonth(currentMonth) }).map((_, i) => (
                    <div key={`e${i}`} className="cal-day empty" />
                  ))}
                  {Array.from({ length: getDaysInMonth(currentMonth) }).map((_, i) => {
                    const day = i + 1;
                    const past = isPast(day);
                    return (
                      <div
                        key={day}
                        className={`cal-day ${!past ? 'available' : ''} ${isToday(day) ? 'today' : ''} ${isSameDate(day) ? 'selected' : ''}`}
                        onClick={() => !past && selectDate(day)}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Online-only notice when selected date is in the Zoom phase (15–21 June) */}
              {dateIsZoom && (
                <div style={{
                  background: '#eef4f0',
                  borderLeft: '3px solid #3d6b50',
                  padding: '0.75rem 1rem',
                  margin: '1.2rem 0 0',
                  borderRadius: '2px',
                  fontSize: '0.88rem',
                  color: '#2a2822',
                  lineHeight: 1.5,
                }}>
                  This session will be <strong>online via Zoom</strong> — I'm relocating my office between 15&ndash;21 June 2026. The Zoom link will be in your confirmation email.
                </div>
              )}

              {/* New-office address notice when selected date is 22–30 June */}
              {dateIsNewOfficeNotice && (
                <div style={{
                  background: '#eaf2f8',
                  borderLeft: '3px solid #2e5a85',
                  padding: '0.75rem 1rem',
                  margin: '1.2rem 0 0',
                  borderRadius: '2px',
                  fontSize: '0.88rem',
                  color: '#2a2822',
                  lineHeight: 1.5,
                }}>
                  <strong>Address:</strong> 65 Tiong Poh Road, #02-26, Tiong Bahru Estate, Singapore 160065. <span style={{ color: '#5a6a7a' }}>(New office from 22 June 2026)</span>
                </div>
              )}

              {/* Time slots */}
              {selectedDate && (
                <>
                  <h3 style={{ marginTop: '1.5rem' }}>
                    Available times — {selectedDate.toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h3>
                  {loading ? (
                    <div className="loading">
                      <div className="spinner" />
                      <p>Checking availability…</p>
                    </div>
                  ) : slots.length === 0 ? (
                    <p style={{ color: 'var(--faint)', padding: '1rem 0' }}>No available slots on this date. Please try another day.</p>
                  ) : (
                    <div className="slots">
                      {slots.map(slot => (
                        <div
                          key={slot.start}
                          className={`slot ${selectedSlot?.start === slot.start ? 'selected' : ''}`}
                          onClick={() => setSelectedSlot(slot)}
                        >
                          {slot.label}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.5rem' }}>
                <button className="btn btn--outline" onClick={() => setStep(1)}>&larr; Back</button>
                <button
                  className="btn btn--green"
                  style={{ flex: 1 }}
                  disabled={!canProceedToStep3}
                  onClick={() => setStep(3)}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* ════ STEP 3: Details & Payment ════ */}
          {step === 3 && (
            <div>
              <h2 style={{ marginTop: '2rem' }}>Your details</h2>

              {/* Summary */}
              <div className="summary">
                <div className="summary-row">
                  <span className="summary-label">Session</span>
                  <span className="summary-value">{session.label}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Date</span>
                  <span className="summary-value">
                    {new Date(selectedSlot.start).toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Time</span>
                  <span className="summary-value">{selectedSlot.label}</span>
                </div>
                {slotIsZoom && (
                  <div className="summary-row">
                    <span className="summary-label">Format</span>
                    <span className="summary-value">Online via Zoom</span>
                  </div>
                )}
                <div className="summary-row">
                  <span className="summary-label">Session fee</span>
                  <span className="summary-value">SGD {session.fee.toFixed(2)}</span>
                </div>
                <div className="summary-row summary-total">
                  <span className="summary-label">Deposit due now (25%)</span>
                  <span className="summary-value">SGD {session.deposit.toFixed(2)}</span>
                </div>
              </div>

              {/* Online-only reminder in step 3 — Zoom phase */}
              {slotIsZoom && (
                <div style={{
                  background: '#eef4f0',
                  borderLeft: '3px solid #3d6b50',
                  padding: '0.75rem 1rem',
                  margin: '0 0 1.2rem',
                  borderRadius: '2px',
                  fontSize: '0.88rem',
                  color: '#2a2822',
                  lineHeight: 1.5,
                }}>
                  This is an <strong>online session via Zoom</strong>. You'll receive the Zoom link in your confirmation email.
                </div>
              )}

              {/* New-office address reminder in step 3 — 22–30 June */}
              {slotIsNewOfficeNotice && (
                <div style={{
                  background: '#eaf2f8',
                  borderLeft: '3px solid #2e5a85',
                  padding: '0.75rem 1rem',
                  margin: '0 0 1.2rem',
                  borderRadius: '2px',
                  fontSize: '0.88rem',
                  color: '#2a2822',
                  lineHeight: 1.5,
                }}>
                  <strong>Address:</strong> 65 Tiong Poh Road, #02-26, Tiong Bahru Estate, Singapore 160065. <span style={{ color: '#5a6a7a' }}>(New office from 22 June 2026)</span>
                </div>
              )}

              {/* Contact form */}
              <div className="form-group">
                <label>Full Name *</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Your name" />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="your@email.com" />
              </div>
              <div className="form-group">
                <label>Phone (with country code) *</label>
                <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+65 8XXX XXXX" />
              </div>
              <div className="form-group">
                <label>What brings you to therapy? (optional)</label>
                <textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="A brief note — or leave blank" />
              </div>

              {error && <p style={{ color: '#c44', marginBottom: '1rem', fontSize: '0.88rem' }}>{error}</p>}

              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <button className="btn btn--outline" onClick={() => setStep(2)}>&larr; Back</button>
                <button
                  className="btn btn--green"
                  style={{ flex: 1 }}
                  disabled={submitting}
                  onClick={handleCheckout}
                >
                  {submitting ? 'Redirecting to payment…' : `Pay SGD ${session.deposit.toFixed(2)} Deposit`}
                </button>
              </div>

              <p style={{ fontSize: '0.78rem', color: 'var(--faint)', marginTop: '1rem', textAlign: 'center' }}>
                You'll be redirected to Stripe for secure payment. The remaining balance of SGD {(session.fee - session.deposit).toFixed(2)} is due at the session.
              </p>
            </div>
          )}

          {/* Footer — address switches automatically on 15 June 2026 */}
          <div style={{ borderTop: '1px solid var(--rule)', marginTop: '3rem', paddingTop: '1.5rem', textAlign: 'center' }}>
            {!footerShowsNewAddressOnly() ? (
              <>
                <p style={{ fontSize: '0.85rem', color: 'var(--text)', fontFamily: 'var(--font-heading)', fontStyle: 'italic' }}>
                  20 Upper Circular Road #01-12/13, Singapore 058416
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--green)', marginTop: '0.5rem', fontFamily: 'var(--font-heading)', fontStyle: 'italic' }}>
                  From 22 June 2026: 65 Tiong Poh Road, #02-26, Tiong Bahru Estate, Singapore 160065
                </p>
              </>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text)', fontFamily: 'var(--font-heading)', fontStyle: 'italic' }}>
                65 Tiong Poh Road, #02-26, Tiong Bahru Estate, Singapore 160065
              </p>
            )}

            <p style={{ fontSize: '0.78rem', color: 'var(--faint)', marginTop: '0.5rem' }}>
              Cancel or move a session more than 48 hours ahead and your deposit is refunded, less Stripe&rsquo;s processing fee. Inside 48 hours the session is charged in full.
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--faint)', marginTop: '0.5rem' }}>
              <a href="https://psychotherapist.sg" style={{ color: 'var(--green)' }}>psychotherapist.sg</a> · Nicole Chew-Helbig, PhD
            </p>
          </div>
        </div>
      </div>

      <div className="band band--bottom" />
    </>
  );
}
