import { getAvailableSlots } from '../../lib/calendar';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  var date = req.query.date;
  var type = req.query.type;
  var dow = req.query.dow;
  if (!date || !type || dow === undefined) return res.status(400).json({ error: 'Missing params' });

  try {
    var parts = date.split('-');
    var year = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10);
    var day = parseInt(parts[2], 10);
    var dayOfWeek = parseInt(dow, 10);
    var slots = await getAvailableSlots(year, month, day, dayOfWeek, type);
    res.status(200).json({ slots: slots });
  } catch (err) {
    console.error('Slots error:', err.message);
    res.status(500).json({ error: 'Failed to load availability', detail: err.message });
  }
}
