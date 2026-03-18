import { getAvailableSlots } from '../../lib/calendar';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { date, type } = req.query;
  if (!date || !type) return res.status(400).json({ error: 'Missing date or type' });

  try {
    // Parse date parts directly to avoid timezone conversion issues
    const [year, month, day] = date.split('-').map(Number);
    const slots = await getAvailableSlots(year, month, day, type);
    res.status(200).json({ slots });
  } catch (err) {
    console.error('Slots error:', err.message);
    res.status(500).json({ error: 'Failed to load availability', detail: err.message });
  }
}
