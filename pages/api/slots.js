import { getAvailableSlots } from '../../lib/calendar';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { date, type } = req.query;
  if (!date || !type) return res.status(400).json({ error: 'Missing date or type' });

  try {
    const d = new Date(date + 'T00:00:00+08:00'); // SGT
    const slots = await getAvailableSlots(d, type);
    res.status(200).json({ slots });
  } catch (err) {
    console.error('Slots error:', err);
    res.status(500).json({ error: 'Failed to load availability' });
  }
}
