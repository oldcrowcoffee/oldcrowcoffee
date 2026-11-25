import { getContent, saveContent, saveFile, allowedTypes, storageMode } from './store.mjs';
import { renderHome, renderMenu } from './render.mjs';
import { adminEnabled, checkPassword, sessionCookie, clearCookie, isAuthed, sameOriginWrite, rateLimited, noteFailure } from './auth.mjs';

const MAX_UPLOAD = 4_400_000; // Vercel functions accept request bodies up to 4.5 MB
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });
const html = body => new Response(body, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=120' } });
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function handle(request) {
  const url = new URL(request.url);
  const route = url.pathname.replace(/\/+$/, '') || '/';
  const method = request.method;

  try {
    if (route === '/' || route === '/api/page/home') return html(renderHome(await getContent()));
    if (route === '/menu' || route === '/api/page/menu') return html(renderMenu(await getContent()));

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
      if (method === 'GET') return json(await getContent({ fresh: true }));
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
