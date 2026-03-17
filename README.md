# Psychotherapist.sg — Booking System

Custom booking app for psychotherapist.sg with Google Calendar integration, Stripe payments, and WhatsApp notifications.

## Architecture

```
Client → Next.js React App → Vercel API Routes
                                  ├── Google Calendar API (availability + event creation)
                                  ├── Stripe Checkout (25% deposit)
                                  └── WhatsApp notification (via CallMeBot or Twilio)
```

## Quick Start

### 1. Clone and install

```bash
git clone <this-repo>
cd psychotherapist-booking
npm install
```

### 2. Set up Google Calendar API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (e.g. "Psychotherapist Booking")
3. Enable **Google Calendar API**
4. Go to **IAM & Admin → Service Accounts** → Create service account
5. Create a JSON key for the service account
6. Copy the `client_email` and `private_key` from the JSON
7. In your Google Calendar, go to **Settings → Share with specific people** → Add the service account email with "Make changes to events" permission

### 3. Set up Stripe

1. Log into [Stripe Dashboard](https://dashboard.stripe.com)
2. Copy your **Secret Key** and **Publishable Key** from API keys
3. Set up a webhook:
   - Go to **Developers → Webhooks → Add endpoint**
   - URL: `https://book.psychotherapist.sg/api/webhook`
   - Events: Select `checkout.session.completed`
   - Copy the **Webhook signing secret**

### 4. Set up WhatsApp notifications (optional but recommended)

**Option A: CallMeBot (free, easiest)**
1. Send this WhatsApp message to +34 644 51 95 23:
   `I allow callmebot to send me messages`
2. You'll receive an API key
3. Add `CALLMEBOT_API_KEY=your_key` to your `.env.local`

**Option B: Twilio WhatsApp (paid, more reliable)**
- Replace the `sendWhatsAppNotification` function in `lib/whatsapp.js` with Twilio SDK calls

### 5. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in all values in `.env.local`.

### 6. Run locally

```bash
npm run dev
```

Visit http://localhost:3000

### 7. Deploy to Vercel

```bash
npx vercel
```

Or connect your GitHub repo to Vercel:
1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → Import project
3. Add all environment variables in the Vercel dashboard
4. Deploy

### 8. Custom domain

In Vercel dashboard:
1. Go to **Settings → Domains**
2. Add `book.psychotherapist.sg`
3. In your DNS, add a CNAME record:
   - Name: `book`
   - Value: `cname.vercel-dns.com`

## Configuration

Edit `lib/schedule.js` to change:
- Available days and hours
- Session types, durations, and fees
- Deposit amounts
- Buffer between sessions
- How far ahead clients can book
- Minimum booking notice

## How It Works

1. **Client visits** `book.psychotherapist.sg`
2. **Picks session type** (Individual $220 / Couples $370)
3. **Picks date** from calendar → app fetches available slots from your Google Calendar
4. **Picks time slot** from available options
5. **Fills in details** (name, email, phone, optional reason)
6. **Pays 25% deposit** via Stripe Checkout
7. **On successful payment:**
   - Google Calendar event created automatically
   - WhatsApp notification sent to you
   - Client sees confirmation page

## Files

```
pages/
  index.js          → Main booking flow (3-step)
  success.js        → Post-payment confirmation
  _app.js           → App wrapper
  api/
    slots.js        → GET available time slots
    checkout.js     → POST create Stripe checkout
    webhook.js      → POST Stripe webhook handler
lib/
  schedule.js       → Your availability config
  calendar.js       → Google Calendar integration
  stripe.js         → Stripe checkout helpers
  whatsapp.js       → WhatsApp notification
styles/
  globals.css       → Matches psychotherapist.sg design
```
