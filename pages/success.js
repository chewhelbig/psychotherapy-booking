import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function SuccessPage() {
  const router = useRouter();
  const { session_id } = router.query;

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
          <p style={{ marginTop: '1rem', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
            Your deposit has been received and your appointment is confirmed. I'll see you at the session.
          </p>

          <div className="summary" style={{ textAlign: 'left', marginTop: '2rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--faint)', marginBottom: '0.5rem' }}>
              A confirmation has been added to the calendar. If you need to reschedule, please reach out at least 48 hours before your session.
            </p>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <p style={{ fontFamily: 'var(--font-heading)', fontStyle: 'italic', color: 'var(--green)', fontSize: '1rem', marginBottom: '1.5rem' }}>
              73 Eng Watt Street, Tiong Bahru Estate, Singapore 160073
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--faint)' }}>
              Tiong Bahru MRT (EW17) · 8 min walk
            </p>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <a href="https://psychotherapist.sg" className="btn btn--outline">Back to Website</a>
            &nbsp;&nbsp;
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
