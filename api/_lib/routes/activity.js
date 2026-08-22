// سجل العمليات — كل حاجة حصلت في المتجر
// GET /api/activity → القائمة (إدارة)
import { getActivity } from '../db.js';
import { cors, requireAdmin } from '../util.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAdmin(req, res)) return;

  try {
    return res.status(200).json(await getActivity());
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
