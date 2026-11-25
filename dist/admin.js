// Old Crow site editor. Plain JavaScript, no build step.
const app = document.getElementById('app');
let data = null;
let session = { authed: false, enabled: true, storage: 'local-files' };
let tab = 'menu';
let dirty = false;
let saving = false;
let status = { text: '', kind: '' };

const h = (tag, props = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v;
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  return el;
};

async function api(path, options = {}) {
  const res = await fetch(path, { credentials: 'same-origin', ...options, headers: { 'X-Admin': '1', ...(options.headers || {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error || 'Something went wrong.'), { status: res.status });
  return body;
}

const get = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);
const set = (o, p, v) => { const ks = p.split('.'); const last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; };
const uid = () => Math.random().toString(36).slice(2, 10);
const move = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; };

function touch() { dirty = true; status = { text: 'Unsaved changes', kind: '' }; renderTop(); }
function say(text, kind = '') { status = { text, kind }; renderTop(); }

// ---------- form pieces ----------
function field(label, path, { rows, help, placeholder } = {}) {
  const el = rows
    ? h('textarea', { rows, placeholder, oninput: e => { set(data, path, e.target.value); touch(); } })
    : h('input', { type: 'text', placeholder, oninput: e => { set(data, path, e.target.value); touch(); } });
  el.value = get(data, path) ?? '';
  return h('label', { class: 'f' }, label, el, help ? h('span', { class: 'help' }, help) : null);
}

function stringList(label, path, { rows = 0, addLabel = 'Add another', help } = {}) {
  const arr = get(data, path);
  return h('div', { class: 'f' }, h('strong', {}, label), help ? h('p', { class: 'help' }, help) : null,
    arr.map((value, i) => h('div', { class: 'row' },
      rows ? h('textarea', { rows, value, style: 'flex:1;padding:9px 11px;border:1px solid var(--line)', oninput: e => { arr[i] = e.target.value; touch(); } }) : h('input', { type: 'text', value, oninput: e => { arr[i] = e.target.value; touch(); } }),
      h('button', { class: 'btn small', type: 'button', 'aria-label': 'Move up', onclick: () => { move(arr, i, -1); touch(); render(); } }, '↑'),
      h('button', { class: 'btn small', type: 'button', 'aria-label': 'Move down', onclick: () => { move(arr, i, 1); touch(); render(); } }, '↓'),
      h('button', { class: 'btn small danger', type: 'button', 'aria-label': 'Remove', onclick: () => { arr.splice(i, 1); touch(); render(); } }, '✕'))),
    h('div', { class: 'row' }, h('button', { class: 'btn small', type: 'button', onclick: () => { arr.push(''); touch(); render(); } }, '+ ' + addLabel)));
}

// ---------- uploads ----------
async function shrinkImage(file, maxSide) {
  const keep = file.size < 1_500_000 && ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error('That image could not be read. Try a JPG or PNG.');
  if (keep && Math.max(bitmap.width, bitmap.height) <= maxSide) return file;
  let scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', attempt < 2 ? 0.88 : 0.74));
    if (blob && blob.size < 4_200_000) return blob;
    scale *= 0.8;
  }
  throw new Error('That image is too large even after shrinking.');
}

async function uploadFile(file, { maxSide = 2400, allowPdf = false } = {}) {
  let body = file;
  if (file.type === 'application/pdf') {
    if (!allowPdf) throw new Error('Please choose an image (JPG, PNG or WebP).');
    if (file.size > 4_200_000) throw new Error('That PDF is over 4 MB. Try exporting a smaller PDF, or upload the menu as photos/images instead.');
  } else if (file.type.startsWith('image/')) {
    body = await shrinkImage(file, maxSide);
  } else {
    throw new Error('Only JPG, PNG, WebP' + (allowPdf ? ' and PDF' : '') + ' files can be uploaded.');
  }
  const type = body.type || file.type;
  return api(`/api/upload?name=${encodeURIComponent(file.name)}`, { method: 'POST', headers: { 'Content-Type': type }, body });
}

function imageField(label, path, altPath) {
  const preview = h('img', { class: 'preview', alt: '', src: get(data, path) || '' });
  if (!get(data, path)) preview.hidden = true;
  const input = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async e => {
    const file = e.target.files[0]; if (!file) return;
    say('Uploading photo…');
    try { const { url } = await uploadFile(file, { maxSide: 1800 }); set(data, path, url); touch(); render(); }
    catch (err) { say(err.message, 'bad'); }
  } });
  return h('div', { class: 'f' }, h('strong', {}, label),
    h('div', { class: 'row' }, h('input', { type: 'text', value: get(data, path) || '', placeholder: 'Photo address (or upload one)', oninput: e => { set(data, path, e.target.value); touch(); } }),
      h('button', { class: 'btn small', type: 'button', onclick: () => input.click() }, 'Upload photo'), input),
    preview, altPath ? field('Photo description (for screen readers)', altPath) : null);
}

// ---------- tabs ----------
function menuTab() {
  const m = data.menu;
  const uploadReady = m.files.some(f => f.live);
  const fileInput = h('input', { type: 'file', accept: 'image/*,application/pdf', multiple: true, hidden: true, onchange: async e => {
    const files = [...e.target.files]; e.target.value = '';
    for (const file of files) {
      say(`Uploading ${file.name}…`);
      try {
        const { url, kind } = await uploadFile(file, { allowPdf: true });
        m.files.push({ id: uid(), name: file.name.replace(/\.[^.]*$/, '').replace(/[-_]+/g, ' '), kind, url, live: true });
        m.display = 'upload';
        touch();
      } catch (err) { say(`${file.name}: ${err.message}`, 'bad'); render(); return; }
    }
    say('Uploaded. Press Save & publish to put it on the site.', 'ok'); render();
  } });

  return h('div', {},
    h('div', { class: 'card' },
      h('h2', {}, 'What people see when they scan the QR code'),
      h('p', { class: 'help' }, 'The QR code always opens ', h('a', { href: '/menu-file', target: '_blank', rel: 'noopener' }, '/menu-file'), ', which forwards to your current menu. Change the menu here and the printed QR code never needs replacing.'),
      ['digital', 'upload'].map(value => h('label', { class: 'choice' },
        h('input', { type: 'radio', name: 'display', checked: m.display === value, onchange: () => { m.display = value; touch(); render(); } }),
        h('span', {}, value === 'digital' ? [h('b', {}, 'Typed menu'), 'The item lists you edit below, shown in the site’s style.'] : [h('b', {}, 'Uploaded menu (PDF or images)'), 'Show the menu file(s) you upload, exactly as designed.']))),
      m.display === 'upload' && !uploadReady ? h('p', { class: 'err' }, 'No uploaded menu is switched on yet, so visitors currently see the typed menu.') : null),

    h('div', { class: 'card' },
      h('h2', {}, 'Uploaded menus'),
      h('p', { class: 'help' }, 'Upload a new menu any time. Tick “Show” on the ones that should appear (several images show one after another, top to bottom). Images (JPG, PNG, WebP) look best on phones; PDFs up to 4 MB also work.'),
      m.files.length ? m.files.map((f, i) => h('div', { class: 'file' },
        f.kind === 'pdf' ? h('div', { class: 'thumb' }, 'PDF') : h('img', { class: 'thumb', src: f.url, alt: '' }),
        h('input', { type: 'text', value: f.name, 'aria-label': 'Menu name', oninput: e => { f.name = e.target.value; touch(); } }),
        h('label', { class: 'live' }, h('input', { type: 'checkbox', checked: f.live, onchange: e => { f.live = e.target.checked; touch(); render(); } }), 'Show'),
        h('a', { class: 'btn small', href: f.url, target: '_blank', rel: 'noopener' }, 'View'),
        h('button', { class: 'btn small', type: 'button', 'aria-label': 'Move up', onclick: () => { move(m.files, i, -1); touch(); render(); } }, '↑'),
        h('button', { class: 'btn small', type: 'button', 'aria-label': 'Move down', onclick: () => { move(m.files, i, 1); touch(); render(); } }, '↓'),
        h('button', { class: 'btn small danger', type: 'button', onclick: () => { if (confirm(`Remove “${f.name}”? The file is deleted when you save.`)) { m.files.splice(i, 1); touch(); render(); } } }, 'Remove'))) : h('p', { class: 'help' }, 'Nothing uploaded yet.'),
      h('div', { class: 'drop' }, h('button', { class: 'btn primary', type: 'button', onclick: () => fileInput.click() }, '+ Upload a menu'), fileInput)),

    h('div', { class: 'card' },
      h('h2', {}, 'Typed menu'),
      h('p', { class: 'help' }, 'Shown when “Typed menu” is selected above. Price and description are optional.'),
      h('div', { class: 'grid2' }, field('Small heading', 'menu.eyebrow'), field('Page title (line breaks allowed)', 'menu.title', { rows: 2 })),
      field('Special notice (optional)', 'menu.notice', { help: 'For example “Pumpkin Spice is back!”. Appears under the title.' }),
      field('Sizes note', 'menu.sizesNote'),
      m.categories.map((cat, ci) => h('div', { class: 'cat' },
        h('div', { class: 'cat-head' },
          h('input', { type: 'text', value: cat.name, 'aria-label': 'Section name', placeholder: 'Section name', oninput: e => { cat.name = e.target.value; touch(); } }),
          h('button', { class: 'btn small', type: 'button', 'aria-label': 'Move section up', onclick: () => { move(m.categories, ci, -1); touch(); render(); } }, '↑'),
          h('button', { class: 'btn small', type: 'button', 'aria-label': 'Move section down', onclick: () => { move(m.categories, ci, 1); touch(); render(); } }, '↓'),
          h('button', { class: 'btn small danger', type: 'button', onclick: () => { if (confirm(`Delete the “${cat.name || 'untitled'}” section and its items?`)) { m.categories.splice(ci, 1); touch(); render(); } } }, 'Delete')),
        cat.items.map((item, ii) => h('div', { class: 'row' },
          h('input', { type: 'text', value: item.name, placeholder: 'Item', 'aria-label': 'Item name', oninput: e => { item.name = e.target.value; touch(); } }),
          h('input', { type: 'text', class: 'price', value: item.price, placeholder: 'Price', 'aria-label': 'Price', oninput: e => { item.price = e.target.value; touch(); } }),
          h('input', { type: 'text', class: 'desc', value: item.desc, placeholder: 'Description (optional)', 'aria-label': 'Description', oninput: e => { item.desc = e.target.value; touch(); } }),
          h('button', { class: 'btn small', type: 'button', 'aria-label': 'Move up', onclick: () => { move(cat.items, ii, -1); touch(); render(); } }, '↑'),
          h('button', { class: 'btn small', type: 'button', 'aria-label': 'Move down', onclick: () => { move(cat.items, ii, 1); touch(); render(); } }, '↓'),
          h('button', { class: 'btn small danger', type: 'button', 'aria-label': 'Remove item', onclick: () => { cat.items.splice(ii, 1); touch(); render(); } }, '✕'))),
        h('div', { class: 'row' }, h('button', { class: 'btn small', type: 'button', onclick: () => { cat.items.push({ name: '', price: '', desc: '' }); touch(); render(); } }, '+ Add item')))),
      h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', onclick: () => { m.categories.push({ name: '', items: [{ name: '', price: '', desc: '' }] }); touch(); render(); } }, '+ Add section')),
      field('Note under the menu', 'menu.kidsNote')),

    qrCard());
}

function qrCard() {
  const m = data.menu;
  const auto = `${location.origin}/menu-file`;
  const preview = h('img', { alt: 'Menu QR code', src: '/menu-qr.svg' });
  const download = h('a', { class: 'btn small', href: '/menu-qr.svg', download: 'old-crow-menu-qr.svg' }, 'Download QR code');
  const warn = h('p', { class: 'err', hidden: true }, 'The address must start with https://');
  const input = h('input', { type: 'text', inputmode: 'url', spellcheck: 'false' });
  const refresh = () => {
    const value = input.value.trim();
    const ok = /^https:\/\/\S{4,}$/.test(value);
    warn.hidden = ok || value === '';
    const src = `/menu-qr.svg?u=${encodeURIComponent(ok ? value : auto)}&t=${Date.now()}`;
    preview.src = src; download.href = src;
  };
  const apply = value => { m.qrUrl = value === auto ? '' : value; input.value = value; touch(); refresh(); };
  input.value = m.qrUrl || auto;
  input.addEventListener('input', () => { const v = input.value.trim(); m.qrUrl = v === auto ? '' : v; touch(); refresh(); });
  if (m.qrUrl) refresh();
  return h('div', { class: 'card' },
    h('h2', {}, 'Menu QR code'),
    h('div', { class: 'qr' }, preview,
      h('div', { style: 'flex:1;min-width:240px' },
        h('label', { class: 'f', style: 'margin-top:0' }, 'Address the QR code opens', input),
        warn,
        h('div', { class: 'row' },
          h('button', { class: 'btn small', type: 'button', onclick: () => apply(auto) }, 'Menu, automatic (recommended)'),
          h('button', { class: 'btn small', type: 'button', onclick: () => apply(`${location.origin}/menu`) }, 'Menu page'),
          download),
        h('p', { class: 'help' }, 'Automatic opens the menu file directly when exactly one uploaded menu is switched on, and the menu page otherwise, so you never reprint it after uploading a new menu. You can also paste any https:// address. Press Save & publish to make a change permanent; the preview and download update as you type.'))),
    h('div', { class: 'grid2' }, field('Label next to QR on menu page', 'menu.qrLabel'), field('Text next to QR on menu page', 'menu.qrText')));
}

function homeTab() {
  return h('div', {},
    h('div', { class: 'card' }, h('h2', {}, 'Top of the page'),
      field('Small heading', 'home.hero.eyebrow'),
      field('Big title', 'home.hero.title', { rows: 3, help: 'One line per row. The last line is shown in the accent color.' }),
      field('Intro text', 'home.hero.text', { rows: 3 }),
      h('div', { class: 'grid2' }, field('Main button', 'home.hero.button'), field('Link under it', 'home.hero.link')),
      field('Address line under the buttons', 'home.hero.foot'),
      imageField('Main photo', 'home.hero.photo', 'home.hero.photoAlt'),
      field('Text over the photo', 'home.hero.photoLabel', { rows: 2 }),
      h('div', { class: 'grid2' }, field('Round badge, top', 'home.hero.sealTop'), field('Round badge, big', 'home.hero.sealMain', { rows: 2 })),
      field('Round badge, bottom', 'home.hero.sealBottom'),
      stringList('Scrolling highlights', 'home.ticker', { addLabel: 'Add highlight' })),
    h('div', { class: 'card' }, h('h2', {}, 'Our story'),
      field('Small heading', 'home.story.eyebrow'),
      field('Title', 'home.story.title', { rows: 2, help: 'The last line is shown in the accent color.' }),
      stringList('Paragraphs', 'home.story.paragraphs', { rows: 4, addLabel: 'Add paragraph' })),
    h('div', { class: 'card' }, h('h2', {}, 'Menu preview'),
      field('Small heading', 'home.menuTeaser.eyebrow'), field('Title', 'home.menuTeaser.title', { rows: 2 }), field('Text', 'home.menuTeaser.text', { rows: 2 }), field('Link text', 'home.menuTeaser.link'),
      h('h3', {}, 'The dark menu card'),
      h('div', { class: 'grid2' }, field('Card label', 'home.menuTeaser.cardLabel'), field('Card title', 'home.menuTeaser.cardTitle', { rows: 2 })),
      h('div', { class: 'grid2' }, field('Beside the QR code, small', 'home.menuTeaser.qrLabel'), field('Beside the QR code, text', 'home.menuTeaser.qrText', { rows: 2 })),
      field('Menu categories line', 'home.menuTeaser.tags'), field('Card text', 'home.menuTeaser.cardText', { rows: 2 }), field('Card link text', 'home.menuTeaser.cardLink')),
    h('div', { class: 'card' }, h('h2', {}, 'Visit section'),
      field('Small heading', 'home.visit.eyebrow'), field('Title', 'home.visit.title', { rows: 2 }), field('Text', 'home.visit.text', { rows: 2 }), field('Directions button', 'home.visit.button'),
      h('div', { class: 'grid2' }, field('“Address” label', 'home.visit.spotLabel'), field('“Hours” label', 'home.visit.hoursLabel')),
      field('“Contact” label', 'home.visit.helloLabel')));
}

function infoTab() {
  const hours = data.hours;
  return h('div', {},
    h('div', { class: 'card' }, h('h2', {}, 'Hours'),
      hours.map((r, i) => h('div', { class: 'row' },
        h('input', { type: 'text', value: r.label, placeholder: 'Days (e.g. Monday – Friday)', 'aria-label': 'Days', oninput: e => { r.label = e.target.value; touch(); } }),
        h('input', { type: 'text', value: r.time, placeholder: 'Hours (e.g. 5 am – 6 pm)', 'aria-label': 'Hours', oninput: e => { r.time = e.target.value; touch(); } }),
        h('button', { class: 'btn small', type: 'button', 'aria-label': 'Move up', onclick: () => { move(hours, i, -1); touch(); render(); } }, '↑'),
        h('button', { class: 'btn small', type: 'button', 'aria-label': 'Move down', onclick: () => { move(hours, i, 1); touch(); render(); } }, '↓'),
        h('button', { class: 'btn small danger', type: 'button', 'aria-label': 'Remove', onclick: () => { hours.splice(i, 1); touch(); render(); } }, '✕'))),
      h('div', { class: 'row' }, h('button', { class: 'btn small', type: 'button', onclick: () => { hours.push({ label: '', time: '' }); touch(); render(); } }, '+ Add hours')),
      field('Note under the hours', 'home.visit.hoursNote', { help: 'Good place for holiday closures.' })),
    h('div', { class: 'card' }, h('h2', {}, 'Address & contact'),
      h('div', { class: 'grid2' }, field('Street address', 'site.address1'), field('City, state, ZIP', 'site.address2')),
      field('Email', 'site.email'),
      field('Facebook page address', 'site.facebookUrl', { help: 'Leave blank to hide the Facebook links.' }),
      h('div', { class: 'grid2' }, field('Facebook link text', 'site.facebookLabel'), field('Top menu button text', 'site.navFollow')),
      field('Directions link (Google Maps)', 'site.mapsUrl', { help: 'Opens when someone taps “Get directions”.' })));
}

function siteTab() {
  return h('div', {},
    h('div', { class: 'card' }, h('h2', {}, 'Site-wide text'),
      field('Business name', 'site.name'), field('Short name (logo text and footer)', 'site.shortName'),
      h('div', { class: 'grid2' }, field('Top banner message', 'site.announcement'), field('Top banner, right side', 'site.announcementTag')),
      field('Footer message', 'site.footerTagline', { rows: 2 }), field('Footer location', 'site.footerLocation'),
      field('Search result description (home page)', 'site.metaDescription', { rows: 3, help: 'What Google shows under the site name.' }),
      field('Search result description (menu page)', 'menu.metaDescription', { rows: 3 })),
    h('div', { class: 'card' }, h('h2', {}, 'Start over'),
      h('p', { class: 'help' }, 'Puts every text, the menu and hours back to the original site content. Uploaded menus are removed from the page. Nothing changes on the live site until you press Save & publish.'),
      h('button', { class: 'btn danger', type: 'button', onclick: async () => {
        if (!confirm('Replace everything on this page with the original content? You can still leave without saving.')) return;
        try { data = await api('/api/content?defaults=1'); touch(); render(); say('Original content loaded. Press Save & publish to apply it.', 'ok'); }
        catch (err) { say(err.message, 'bad'); }
      } }, 'Reset to original content')),
    h('div', { class: 'card' }, h('h2', {}, 'Photos & logo'),
      h('p', { class: 'help' }, 'The main photo is edited on the Home page tab. The logo and crow artwork are part of the site’s design files; ask your developer to change those.')));
}

// ---------- shell ----------
const tabs = [['menu', 'Menu'], ['home', 'Home page'], ['info', 'Hours & contact'], ['site', 'Site-wide']];
const topEl = h('div', { class: 'top' });
const panelEl = h('div', { class: 'panel', role: 'tabpanel' });
const tabsEl = h('div', { class: 'tabs', role: 'tablist' });

function renderTop() {
  const saveBtn = h('button', { class: 'btn primary', type: 'button', disabled: saving || !dirty, onclick: save }, saving ? 'Saving…' : 'Save & publish');
  topEl.replaceChildren(
    h('span', { class: 'title' }, 'Old Crow · Site Editor'),
    h('span', { class: 'status ' + status.kind, role: 'status' }, status.text),
    h('a', { href: '/', target: '_blank', rel: 'noopener' }, 'View site ↗'),
    h('a', { href: '/menu', target: '_blank', rel: 'noopener' }, 'View menu ↗'),
    saveBtn,
    h('button', { class: 'btn', type: 'button', onclick: logout }, 'Sign out'));
}

function render() {
  const scroll = window.scrollY;
  tabsEl.replaceChildren(...tabs.map(([id, label]) => h('button', { class: 'tab', role: 'tab', type: 'button', 'aria-selected': String(tab === id), onclick: () => { tab = id; render(); window.scrollTo(0, 0); } }, label)));
  const body = { menu: menuTab, home: homeTab, info: infoTab, site: siteTab }[tab]();
  panelEl.replaceChildren(...[
    session.storage === 'none' ? h('div', { class: 'banner' }, 'Saving is not set up yet. In Vercel, add a Blob store to this project (Storage tab), then redeploy.') : null,
    body].filter(Boolean));
  renderTop();
  window.scrollTo(0, scroll);
}

async function save() {
  saving = true; say('Saving…'); renderTop();
  try {
    data = await api('/api/content', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    dirty = false; saving = false;
    say('Saved. The site updates within about 30 seconds.', 'ok');
    render();
  } catch (err) {
    saving = false;
    if (err.status === 401) { session.authed = false; showLogin('Your session ended. Please sign in again (your edits are still on this page until you refresh).'); return; }
    say(err.message, 'bad'); renderTop();
  }
}

async function logout() {
  if (dirty && !confirm('You have unsaved changes. Sign out anyway?')) return;
  await api('/api/logout', { method: 'POST' }).catch(() => {});
  dirty = false; showLogin();
}

function showLogin(message = '') {
  const input = h('input', { type: 'password', autocomplete: 'current-password', required: true, 'aria-label': 'Password' });
  const err = h('p', { class: 'err', role: 'alert' }, message);
  const form = h('form', { class: 'login', onsubmit: async e => {
    e.preventDefault(); err.textContent = '';
    try { await api('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: input.value }) }); session.authed = true; await start(); }
    catch (ex) { err.textContent = ex.message; input.select(); }
  } },
  h('img', { src: '/oldcrow-transparent.png', alt: '' }), h('h1', {}, 'Site Editor'),
  session.enabled ? [h('label', { class: 'f' }, 'Password', input), h('p', {}, h('button', { class: 'btn primary', style: 'width:100%', type: 'submit' }, 'Sign in'))] : h('p', { class: 'err' }, 'The editor is not set up yet. Add an ADMIN_PASSWORD environment variable in Vercel and redeploy.'),
  err);
  app.replaceChildren(form);
  input.focus();
}

async function start() {
  try { data = await api('/api/content'); }
  catch (err) { if (err.status === 401) return showLogin(); app.replaceChildren(h('p', { class: 'loading' }, err.message)); return; }
  dirty = false; status = { text: '', kind: '' };
  app.replaceChildren(topEl, tabsEl, panelEl);
  render();
}

window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

(async () => {
  try { session = await api('/api/session'); } catch { /* shown on login */ }
  if (session.authed) await start(); else showLogin();
})();
