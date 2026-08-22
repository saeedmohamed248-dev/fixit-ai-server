// حسابات العملاء
// POST /api/auth  { action: "register", name, phone, password, email? }
// POST /api/auth  { action: "login", phone, password }
// GET  /api/auth?action=me         → بيانات العميل (بتوكن العميل)
// GET  /api/auth?action=customers  → قائمة العملاء (إدارة)
import { getUsers, saveUsers } from '../db.js';
import { signToken, getUser, hashPassword, checkPassword } from '../auth.js';
import { cors, requireAdmin, rateLimit, validPhone } from '../util.js';

const publicUser = (u) => ({ id: u.id, name: u.name, phone: u.phone, email: u.email || '', points: u.points || 0 });

export default async function handler(req, res) {
  if (cors(req, res)) return;

  try {
    if (req.method === 'POST') {
      if (!rateLimit(req, res, 'auth', 10)) return;
      const { action, name, phone, password, email } = req.body || {};
      const users = await getUsers();

      if (action === 'register') {
        if (!name || !phone || !password) {
          return res.status(400).json({ error: 'الاسم ورقم الموبايل وكلمة السر مطلوبين' });
        }
        if (!validPhone(phone)) {
          return res.status(400).json({ error: 'رقم الموبايل لازم يكون 11 رقم ويبدأ بـ 01' });
        }
        if (password.length < 6) {
          return res.status(400).json({ error: 'كلمة السر لازم تكون 6 حروف على الأقل' });
        }
        if (users.some((u) => u.phone === phone)) {
          return res.status(400).json({ error: 'الرقم ده مسجل قبل كده — سجّل دخول' });
        }
        const user = {
          id: 'u' + Date.now(),
          name, phone, email: email || '',
          pass: hashPassword(password),
          createdAt: new Date().toISOString(),
        };
        users.push(user);
        await saveUsers(users);
        return res.status(201).json({ token: signToken({ uid: user.id, name: user.name }), user: publicUser(user) });
      }

      if (action === 'login') {
        const user = users.find((u) => u.phone === phone);
        if (!user || !checkPassword(password || '', user.pass)) {
          return res.status(401).json({ error: 'رقم الموبايل أو كلمة السر غير صحيحة' });
        }
        return res.status(200).json({ token: signToken({ uid: user.id, name: user.name }), user: publicUser(user) });
      }

      return res.status(400).json({ error: 'action غير معروف' });
    }

    if (req.method === 'GET') {
      if (req.query.action === 'customers') {
        if (!requireAdmin(req, res)) return;
        const users = await getUsers();
        return res.status(200).json(users.map(publicUser).reverse());
      }
      // بيانات العميل الحالي
      const session = getUser(req);
      if (!session) return res.status(401).json({ error: 'سجّل دخول الأول' });
      const users = await getUsers();
      const user = users.find((u) => u.id === session.uid);
      if (!user) return res.status(401).json({ error: 'الحساب غير موجود' });
      return res.status(200).json(publicUser(user));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
