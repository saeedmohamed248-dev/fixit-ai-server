// نظام حسابات العملاء: توكن موقّع + تشفير كلمات السر
import crypto from 'crypto';

const SECRET = process.env.AUTH_SECRET || process.env.ADMIN_TOKEN || 'dev-secret-change-me';

export function signToken(payload, days = 30) {
  const data = { ...payload, exp: Date.now() + days * 864e5 };
  const body = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return body + '.' + sig;
}

export function verifyToken(token) {
  try {
    const [body, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url'));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getUser(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token || !token.includes('.')) return null;
  return verifyToken(token);
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 32).toString('hex');
  return salt + ':' + hash;
}

export function checkPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(password, salt, 32).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(candidate));
}
