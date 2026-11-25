// Offline smoke test: rendering, escaping, validation and the admin API (uses a temp data dir, no network).
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

process.chdir(await mkdtemp(path.join(os.tmpdir(), 'oc-')));
// Hermetic: never touch a real store, even when run inside a Vercel build with credentials.
process.env.OC_STORAGE = 'local';
for (const key of Object.keys(process.env)) if (/^BLOB_|_READ_WRITE_TOKEN$|^VERCEL(_OIDC_TOKEN)?$/.test(key)) delete process.env[key];
process.env.ADMIN_PASSWORD = 'test-pass';

const { handle } = await import(new URL('../lib/router.mjs', import.meta.url));
const { sanitize, storageMode } = await import(new URL('../lib/store.mjs', import.meta.url));
assert.equal(storageMode(), 'local-files', 'tests must use local storage only');
const base = 'http://localhost';
const call = (p, init = {}) => handle(new Request(base + p, { ...init, headers: { 'x-admin': '1', ...(init.headers || {}) } }));

// public pages render with defaults
let res = await call('/');
let page = await res.text();
assert.equal(res.status, 200);
assert.match(page, /GOOD COFFEE\.<br>GOOD PEOPLE\.<br><span>OLD CROW\.<\/span>/);
assert.match(page, /6900 Main Street/);
assert.match(page, /<h2>A small stop\.<br><span>A bright spot in your day\.<\/span><\/h2>/);
assert.match(page, /01 \/ A LOCAL KIND OF LOVE/);
assert.match(await (await call('/api/page?p=home')).text(), /GOOD COFFEE/);
assert.match(await (await call('/api/page?p=menu')).text(), /House Coffee/);
res = await call('/menu');
page = await res.text();
assert.match(page, /<li>House Coffee<\/li>/);
assert.match(page, /menu-qr\.svg/);

// admin is locked without a session
assert.equal((await call('/api/content')).status, 401);
assert.equal((await call('/api/upload', { method: 'POST', headers: { 'content-type': 'image/png' }, body: 'x' })).status, 401);
res = await call('/api/login', { method: 'POST', body: JSON.stringify({ password: 'nope' }) });
assert.equal(res.status, 401);

// login, edit, save
res = await call('/api/login', { method: 'POST', body: JSON.stringify({ password: 'test-pass' }) });
assert.equal(res.status, 200);
const cookie = res.headers.get('set-cookie').split(';')[0];
const authed = (p, init = {}) => call(p, { ...init, headers: { cookie, ...(init.headers || {}) } });

// writes need the admin header (CSRF guard)
res = await handle(new Request(base + '/api/content', { method: 'PUT', headers: { cookie }, body: '{}' }));
assert.equal(res.status, 400);

const content = await (await authed('/api/content')).json();
content.home.hero.title = 'NEW <script>alert(1)</script>\nLINE';
content.hours[0].time = '4 am – 9 pm';
content.menu.categories[0].items.push({ name: 'Pumpkin Spice', price: '$5.50', desc: 'Seasonal & <b>good</b>' });
content.home.hero.photo = 'javascript:alert(1)';
content.site.email = 'not-an-email';
res = await authed('/api/content', { method: 'PUT', body: JSON.stringify(content) });
assert.equal(res.status, 200);
page = await (await call('/')).text();
assert.ok(!page.includes('<script>alert'), 'script must be escaped');
assert.match(page, /NEW &lt;script&gt;/);
assert.match(page, /4 am – 9 pm/);
assert.ok(!page.includes('javascript:'), 'unsafe URL dropped');
assert.match(page, /oldcrowcoffee2025@gmail\.com/, 'invalid email falls back');
page = await (await call('/menu')).text();
assert.match(page, /Pumpkin Spice <span class="menu-price">\$5\.50<\/span><small class="menu-desc">Seasonal &amp; &lt;b&gt;good&lt;\/b&gt;<\/small>/);

// upload a menu, make it live
res = await authed('/api/upload?name=Fall%20Menu.png', { method: 'POST', headers: { 'content-type': 'image/png' }, body: Buffer.from('89504e470d0a1a0a', 'hex') });
assert.equal(res.status, 200);
const file = await res.json();
assert.match(file.url, /^\/uploads\/fall-menu-[0-9a-f]{8}\.png$/);
res = await authed('/api/upload', { method: 'POST', headers: { 'content-type': 'text/html' }, body: '<h1>x</h1>' });
assert.equal(res.status, 415);
const withFile = await (await authed('/api/content')).json();
withFile.menu.files.push({ id: 'a1', name: 'Fall Menu', kind: 'image', url: file.url, live: true });
withFile.menu.display = 'upload';
await authed('/api/content', { method: 'PUT', body: JSON.stringify(withFile) });
page = await (await call('/menu')).text();
assert.match(page, new RegExp(`<img src="${file.url}" alt="Fall Menu"`));
assert.ok(!page.includes('class="menu-grid"'), 'typed menu hidden while upload is live');

// upload mode with nothing live falls back to the typed menu
withFile.menu.files[0].live = false;
await authed('/api/content', { method: 'PUT', body: JSON.stringify(withFile) });
assert.match(await (await call('/menu')).text(), /class="menu-grid"/);

// reset-to-original endpoint returns the defaults, not the edited content
const original = await (await authed('/api/content?defaults=1')).json();
assert.equal(original.home.hero.title, 'GOOD COFFEE.\nGOOD PEOPLE.\nOLD CROW.');
assert.equal(original.menu.files.length, 0);

// sanitize tolerates garbage
assert.doesNotThrow(() => sanitize({ site: 5, home: { ticker: 'x' }, hours: 'y', menu: { categories: [null, 3], files: [{}] } }));

console.log('smoke tests passed');
