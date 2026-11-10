// حسابات العملاء
// POST /api/auth  { action: "register", name, phone, password, email? }
// POST /api/auth  { action: "login", phone, password }
// GET  /api/auth?action=me         → بيانات العميل (بتوكن العميل)
// GET  /api/auth?action=customers  → قائمة العملاء (إدارة)
import { getUsers, saveUsers } from '../db.js';
import { signToken, getUser, hashPassword, checkPassword } from '../auth.js';
import { cors, requireAdmin, rateLimit, validPhone, validIntlPhone } from '../util.js';
import { sendWelcome } from '../email.js';

function countryFromPhone(p) {
  const d = String(p || '').replace(/\D/g, '').replace(/^00/, '');
  if (/^(20|01)/.test(d)) return 'مصر';
  if (/^971/.test(d)) return 'الإمارات';
  if (/^7/.test(d)) return 'روسيا';
  if (/^966/.test(d)) return 'السعودية';
  if (/^964/.test(d)) return 'العراق';
  return '';
}
const publicUser = (u) => ({ id: u.id, name: u.name, phone: u.phone, email: u.email || '', points: u.points || 0, credit: u.credit || 0, account: u.account || 'retail', company: u.company || '', country: u.country || '', kind: u.kind || '', createdAt: u.createdAt || '' });

export default async function handler(req, res) {
  if (cors(req, res)) return;

  try {
    if (req.method === 'POST') {
      if (!rateLimit(req, res, 'auth', 10)) return;
      const { action, phone, password, email, account, company, country, kind } = req.body || {};
      let { name } = req.body || {};
      const users = await getUsers();

      if (action === 'register') {
        // حساب الجملة (تاجر) بيقبل أرقام دولية، حساب القطاعي بيقبل الأرقام المصرية
        const isWholesale = account === 'wholesale';
        // تاجر الجملة: الموبايل وكلمة السر بس — الاسم يتكمّل بعدين من "تعديل بياناتي"
        if (isWholesale && !String(name || '').trim()) name = 'تاجر ' + String(phone || '').replace(/\D/g, '').slice(-4);
        if (!name || !phone || !password) {
          return res.status(400).json({ error: 'الاسم ورقم الموبايل وكلمة السر مطلوبين' });
        }
        if (isWholesale ? !validIntlPhone(phone) : !validPhone(phone)) {
          return res.status(400).json({
            error: isWholesale
              ? 'رقم موبايل غير صحيح (اكتبه بكود الدولة، مثال: 9715xxxxxxxx)'
              : 'رقم الموبايل لازم يكون 11 رقم ويبدأ بـ 01',
          });
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
          account: isWholesale ? 'wholesale' : 'retail',
          company: company || '',
          // الدولة من كود الموبايل لو مكتبهاش (عشان شروط الدفع حسب البلد)
          country: country || countryFromPhone(phone),
          kind: ['trader', 'workshop', 'personal'].includes(kind) ? kind : '',
          pass: hashPassword(password),
          createdAt: new Date().toISOString(),
        };
        users.push(user);
        await saveUsers(users);
        try { await sendWelcome(user); } catch {} // 📧 إيميل ترحيب
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

    // ✏️ تعديل بيانات الحساب / تغيير كلمة السر (العميل نفسه)
    if (req.method === 'PUT') {
      if (!rateLimit(req, res, 'auth_update', 10)) return;
      const session = getUser(req);
      if (!session) return res.status(401).json({ error: 'سجّل دخول الأول' });
      const users = await getUsers();
      const user = users.find((u) => u.id === session.uid);
      if (!user) return res.status(401).json({ error: 'الحساب غير موجود' });
      const b = req.body || {};
      if (b.newPassword) {
        if (!checkPassword(String(b.currentPassword || ''), user.pass)) {
          return res.status(400).json({ error: 'كلمة السر الحالية غلط' });
        }
        if (String(b.newPassword).length < 6) return res.status(400).json({ error: 'كلمة السر لازم تكون 6 حروف على الأقل' });
        user.pass = hashPassword(String(b.newPassword));
      }
      if (typeof b.name === 'string') {
        if (!b.name.trim()) return res.status(400).json({ error: 'الاسم مطلوب' });
        user.name = b.name.trim().slice(0, 80);
      }
      if (typeof b.email === 'string') user.email = b.email.trim().slice(0, 120);
      if (typeof b.company === 'string') user.company = b.company.trim().slice(0, 120);
      if (typeof b.country === 'string') user.country = b.country.trim().slice(0, 60);
      await saveUsers(users);
      return res.status(200).json(publicUser(user));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
