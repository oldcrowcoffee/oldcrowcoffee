import { getContent, getDefaultContent, saveContent, saveFile, allowedTypes, storageMode } from './store.mjs';
import { renderHome, renderMenu } from './render.mjs';
import QRCode from 'qrcode';
import { adminEnabled, checkPassword, sessionCookie, clearCookie, isAuthed, sameOriginWrite, rateLimited, noteFailure } from './auth.mjs';

const MAX_UPLOAD = 4_400_000; // Vercel functions accept request bodies up to 4.5 MB
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });
const hostOf = request => (request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(request.url).host).split(',')[0].trim();
const html = body => new Response(body, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=120' } });
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function handle(request) {
  const url = new URL(request.url);
  const route = url.pathname.replace(/\/+$/, '') || '/';
  const method = request.method;

  try {
    // Pages arrive as /, /menu, or (through Vercel rewrites) /api/page?p=home|menu.
    const page = route === '/api/page' ? url.searchParams.get('p') : { '/': 'home', '/menu': 'menu' }[route];
    if (page === 'home') return html(renderHome(await getContent(), hostOf(request)));
    if (page === 'menu') return html(renderMenu(await getContent()));

    // Permanent QR target: forwards to the live uploaded menu (one live file), else to the /menu page.
    if (route === '/menu-file' || route === '/api/menu-file') {
      const c = await getContent();
      const live = c.menu.files.filter(f => f.live);
      const target = c.menu.display === 'upload' && live.length === 1 ? new URL(live[0].url, request.url).href : new URL('/menu', request.url).href;
      return new Response(null, { status: 302, headers: { Location: target, 'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=120' } });
    }
    // QR code for that address, built from the website address saved in the admin.
    if (route === '/menu-qr.svg' || route === '/api/qr') {
      const c = await getContent();
      const preview = url.searchParams.get('u');
      const custom = isAuthed(request) && /^https:\/\/[^\s]{4,480}$/.test(preview || '') ? preview : '';
      const target = custom || c.menu.qrUrl || `https://${hostOf(request)}/menu-file`;
      const svg = await QRCode.toString(target, { type: 'svg', margin: 2, errorCorrectionLevel: 'M', color: { dark: '#262820', light: '#ffffff' } });
      return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': custom ? 'no-store' : 'public, max-age=0, s-maxage=60, stale-while-revalidate=300', 'Vary': 'x-forwarded-host' } });
    }

    if (route === '/api/session' && method === 'GET') {
      return json({ authed: isAuthed(request), enabled: adminEnabled(), storage: storageMode() });
    }
    if (route === '/api/login' && method === 'POST') {
      if (!sameOriginWrite(request)) return json({ error: 'Bad request.' }, 400);
      if (!adminEnabled()) return json({ error: 'Admin is not set up yet. Add an ADMIN_PASSWORD environment variable in Vercel.' }, 503);
      if (rateLimited(request)) return json({ error: 'Too many attempts. Try again in a few minutes.' }, 429);
      const { password } = await request.json().catch(() => ({}));
      if (!checkPassword(password ?? '')) {
        noteFailure(request);
        await sleep(700);
        return json({ error: 'Incorrect password.' }, 401);
      }
      return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(request) });
    }
    if (route === '/api/logout' && method === 'POST') {
      return json({ ok: true }, 200, { 'Set-Cookie': clearCookie() });
    }

    if (route === '/api/content') {
      if (!isAuthed(request)) return json({ error: 'Please sign in.' }, 401);
      if (method === 'GET') return json(url.searchParams.has('defaults') ? getDefaultContent() : await getContent({ fresh: true }));
      if (method === 'PUT') {
        if (!sameOriginWrite(request)) return json({ error: 'Bad request.' }, 400);
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object') return json({ error: 'Invalid content.' }, 400);
        return json(await saveContent(body));
      }
    }

    if (route === '/api/upload' && method === 'POST') {
      if (!isAuthed(request)) return json({ error: 'Please sign in.' }, 401);
      if (!sameOriginWrite(request)) return json({ error: 'Bad request.' }, 400);
      const type = (request.headers.get('content-type') || '').split(';')[0].trim();
      if (!allowedTypes.includes(type)) return json({ error: 'Only JPG, PNG, WebP and PDF files are allowed.' }, 415);
      const declared = Number(request.headers.get('content-length') || 0);
      if (declared > MAX_UPLOAD) return json({ error: 'That file is over 4 MB. Please use a smaller file.' }, 413);
      const buffer = Buffer.from(await request.arrayBuffer());
      if (buffer.length > MAX_UPLOAD) return json({ error: 'That file is over 4 MB. Please use a smaller file.' }, 413);
      return json(await saveFile(url.searchParams.get('name') || 'upload', type, buffer));
    }

    return json({ error: 'Not found.' }, 404);
  } catch (error) {
    console.error(error);
    return json({ error: error.status ? error.message : 'Something went wrong. Please try again.' }, error.status || 500);
  }
}
