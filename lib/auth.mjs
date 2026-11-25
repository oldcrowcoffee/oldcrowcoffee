import { createHmac, createHash, timingSafeEqual } from 'node:crypto';

const COOKIE = 'oc_admin';
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days

function password() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  // Local development only. Production without ADMIN_PASSWORD keeps the admin locked.
  return process.env.VERCEL ? '' : 'changeme';
}
export const adminEnabled = () => password().length > 0;

const secret = () => process.env.SESSION_SECRET || `oc:${password()}`;
const sign = value => createHmac('sha256', secret()).update(value).digest('base64url');
const digest = value => createHash('sha256').update(String(value)).digest();

export function checkPassword(input) {
  if (!adminEnabled()) return false;
  return timingSafeEqual(digest(input), digest(password()));
}

export function sessionCookie(request) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = Buffer.from(JSON.stringify({ exp })).toString('base64url');
  const secure = new URL(request.url).protocol === 'https:' || process.env.VERCEL ? '; Secure' : '';
  return `${COOKIE}=${payload}.${sign(payload)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${MAX_AGE}${secure}`;
}
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;

export function isAuthed(request) {
  if (!adminEnabled()) return false;
  const match = (request.headers.get('cookie') || '').split(/;\s*/).find(c => c.startsWith(COOKIE + '='));
  if (!match) return false;
  const [payload, mac] = match.slice(COOKIE.length + 1).split('.');
  if (!payload || !mac) return false;
  const expected = sign(payload);
  if (mac.length !== expected.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return false;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now() / 1000; } catch { return false; }
}

// Writes must come from our own admin page (blocks cross-site form posts on top of SameSite=Strict).
export function sameOriginWrite(request) {
  if (request.headers.get('x-admin') !== '1') return false;
  const origin = request.headers.get('origin');
  return !origin || new URL(origin).host === new URL(request.url).host;
}

const attempts = new Map();
export function rateLimited(request) {
  const ip = (request.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter(t => now - t < 15 * 60 * 1000);
  attempts.set(ip, recent);
  return recent.length >= 10;
}
export function noteFailure(request) {
  const ip = (request.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();
  attempts.set(ip, [...(attempts.get(ip) || []), Date.now()]);
}
