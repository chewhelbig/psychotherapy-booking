import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function SuccessPage() {
  const router = useRouter();
  const { session_id } = router.query;
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session_id) return;
    fetch('/api/booking-details?session_id=' + session_id)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        setBooking(data);
        setLoading(false);
      })
      .catch(function() {
        setLoading(false);
      });
  }, [session_id]);

  // Build Google Calendar add link
  function getCalendarLink() {
    if (!booking) return '#';
    var start = booking.slotStart.replace(/[-:]/g, '').replace('+08:00', '');
    var end = booking.slotEnd.replace(/[-:]/g, '').replace('+08:00', '');
    var title = encodeURIComponent(booking.sessionLabel + ' — Nicole Chew-Helbig');
    var details = encodeURIComponent('Psychotherapy session at 73 Eng Watt Street, Tiong Bahru Estate, Singapore 160073\n\nBalance due: SGD ' + booking.balanceDue.toFixed(2));
    var location = encodeURIComponent('73 Eng Watt Street, Tiong Bahru Estate, Singapore 160073');
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + title + '&dates=' + start + '/' + end + '&details=' + details + '&location=' + location + '&ctz=Asia/Singapore';
  }

  // Build .ics file download for Apple Calendar etc
  function downloadICS() {
    if (!booking) return;
    var start = booking.slotStart.replace(/[-:]/g, '').replace('+08:00', '');
    var end = booking.slotEnd.replace(/[-:]/g, '').replace('+08:00', '');
    var ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      'DTSTART;TZID=Asia/Singapore:' + start,
      'DTEND;TZID=Asia/Singapore:' + end,
      'SUMMARY:' + booking.sessionLabel + ' — Nicole Chew-Helbig',
      'LOCATION:73 Eng Watt Street, Tiong Bahru Estate, Singapore 160073',
      'DESCRIPTION:Balance due: SGD ' + booking.balanceDue.toFixed(2),
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    var blob = new Blob([ics], { type: 'text/calendar' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'psychotherapy-session.ics';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Head>
        <title>Booking Confirmed | Psychotherapist.sg</title>
      </Head>

      <div className="band" />

      <div className="header">
        <a href="https://psychotherapist.sg">psychotherapist.sg</a>
      </div>

      <div style={{ padding: '4rem 0', textAlign: 'center' }}>
        <div className="wrap">
          <div className="success-check">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h1>Session <em>Booked</em></h1>

          {!loading && booking && (
            <p style={{ marginTop: '1rem', fontSize: '1rem' }}>
              Your deposit has been received and your appointment is confirmed on <strong>{booking.dateFormatted}</strong> at <strong>{booking.timeFormatted}</strong>.
            </p>
          )}

          {loading ? (
            <div className="loading" style={{ marginTop: '2rem' }}>
              <div className="spinner" />
              <p>Loading your booking details...</p>
            </div>
          ) : booking ? (
            <>
              <div className="summary" style={{ textAlign: 'left', marginTop: '2rem' }}>
                <div className="summary-row">
                  <span className="summary-label">Session</span>
                  <span className="summary-value">{booking.sessionLabel}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Date</span>
                  <span className="summary-value">{booking.dateFormatted}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Time</span>
                  <span className="summary-value">{booking.timeFormatted}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Deposit paid</span>
                  <span className="summary-value">SGD {booking.depositPaid.toFixed(2)}</span>
                </div>
                <div className="summary-row summary-total">
                  <span className="summary-label">Balance due at session</span>
                  <span className="summary-value">SGD {booking.balanceDue.toFixed(2)}</span>
                </div>
              </div>

              <div style={{ marginTop: '2rem' }}>
                <p style={{ fontFamily: 'var(--font-heading)', fontStyle: 'italic', color: 'var(--green)', fontSize: '1rem', marginBottom: '0.5rem' }}>
                  73 Eng Watt Street, Tiong Bahru Estate
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--faint)' }}>
                  Tiong Bahru MRT (EW17) · 8 min walk
                </p>
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', gap: '0.8rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href={getCalendarLink()} target="_blank" rel="noopener noreferrer" className="btn btn--green">
                  Add to Google Calendar
                </a>
                <button onClick={downloadICS} className="btn btn--outline">
                  Add to Apple Calendar
                </button>
              </div>
            </>
          ) : (
            <p style={{ marginTop: '2rem' }}>
              Your deposit has been received and your appointment is confirmed.
            </p>
          )}

          <p style={{ fontSize: '0.82rem', color: 'var(--faint)', marginTop: '2rem' }}>
            Cancellations more than 48 hours before the session are refunded minus Stripe fees.
          </p>

          <div style={{ marginTop: '2rem', display: 'flex', gap: '0.8rem', justifyContent: 'center' }}>
            <a href="https://psychotherapist.sg" className="btn btn--outline">Back to Website</a>
            <a href="https://wa.me/6587978848" className="btn btn--green">WhatsApp Me</a>
          </div>

          <div style={{ borderTop: '1px solid var(--rule)', marginTop: '3rem', paddingTop: '1.5rem' }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--faint)' }}>
              Nicole Chew-Helbig, PhD · <a href="https://psychotherapist.sg" style={{ color: 'var(--green)' }}>psychotherapist.sg</a>
            </p>
          </div>
        </div>
      </div>

      <div className="band band--bottom" />
    </>
  );
}
