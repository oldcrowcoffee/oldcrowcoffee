// Server-side page templates. Every piece of owner-editable text goes through esc().
// With { edit: true } the same templates emit data-* markers that the visual editor (dist/visual.js) uses.
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const lines = s => String(s ?? '').split(/\r?\n/).map(esc).join('<br>');
const accent = s => { const l = String(s ?? '').split(/\r?\n/).map(esc); const last = l.pop(); return l.length ? `${l.join('<br>')}<br><span>${last}</span>` : `<span>${last}</span>`; };
const icon = d => `<svg class="site-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
const ARROW = icon('M6 18 18 6M6 6h12v12');
const DOWN = icon('M12 4v16m-6-6 6 6 6-6');
const UP = icon('M12 20V4m-6 6 6-6 6 6');
const MENU_ICON = icon('M4 6h16M4 12h16M4 18h16');
const STAR = icon('M12 2v20M2 12h20M5 5l14 14M5 19 19 5');
const PIN = `<svg class="site-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="6"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>`;
const PREV = icon('m15 5-7 7 7 7');
const NEXT = icon('m9 5 7 7-7 7');

// Editing helpers. Outside edit mode they all return '' (or the plain inner HTML), so public pages are unchanged.
function editing(edit) {
  const fmt = { text: esc, lines, accent, multiline: esc };
  const A = (path, kind = 'text', ph = '') => edit ? ` data-edit="${path}" data-kind="${kind}"${ph ? ` data-ph="${esc(ph)}"` : ''}` : '';
  return {
    edit,
    A,
    // value in the right format for its kind
    V: (kind, value) => (fmt[kind] || esc)(value),
    // wrap inline text in an editable span (edit mode only)
    S: (path, kind, value, ph, tag = 'span') => edit ? `<${tag}${A(path, kind, ph)}>${(fmt[kind] || esc)(value)}</${tag}>` : (fmt[kind] || esc)(value),
    ITEM: path => edit ? ` data-item="${path}"` : '',
    LINK: (path, kind = 'url') => edit ? ` data-link="${path}" data-link-kind="${kind}"` : '',
    ADD: (path, template, label) => edit ? `<button type="button" class="oc-add" data-add="${path}" data-new="${esc(JSON.stringify(template))}">+ ${esc(label)}</button>` : ''
  };
}

function shell({ title, description, c, body, current, ed }) {
  const s = c.site;
  const { A, S, LINK } = ed;
  const home = current === 'home';
  const pre = home ? '' : '/';
  const showFb = s.facebookUrl || ed.edit;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f3efe5">
  <meta name="description" content="${esc(description)}">
  <title>${esc(title)}</title>
  <link rel="icon" type="image/png" href="/oldcrow-transparent.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
  ${ed.edit ? '<script src="/visual.js" defer></script>' : '<script src="/app.js" defer></script>'}
</head>
<body${ed.edit ? ' class="oc-edit"' : ''}>
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="announcement">${ed.edit ? `<bdi${A('site.announcement')}>${esc(s.announcement)}</bdi>` : esc(s.announcement)} <span${A('site.announcementTag')}>${esc(s.announcementTag)}</span></div>
  <header class="header">
    <a class="brand" href="${home ? '#' : '/'}" aria-label="${esc(s.name)} home"><img class="brand-logo" src="/oldcrow-transparent.png" alt="" width="68" height="68"><span class="brand-type"><span class="brand-title"${A('site.shortName')}>${esc(s.shortName)}</span><span class="brand-sub">${esc(s.name.replace(/^old crow\s*/i, '').toUpperCase() || 'COFFEE COMPANY')}</span></span></a>
    <button class="nav-toggle" aria-controls="navigation" aria-expanded="false">Menu <span aria-hidden="true">${MENU_ICON}</span></button>
    <nav id="navigation" aria-label="Main navigation"><a href="${pre}#our-story">Our story</a><a href="/menu"${current === 'menu' ? ' aria-current="page"' : ''}>Menu</a><a href="${pre}#visit">Find us</a>${showFb ? `<a class="nav-cta" href="${esc(s.facebookUrl)}" target="_blank" rel="noopener noreferrer"${LINK('site.facebookUrl')}>${S('site.navFollow', 'text', s.navFollow, 'Button text')} <span aria-hidden="true">${ARROW}</span></a>` : ''}</nav>
  </header>
  <main id="main">
${body}
  </main>
  <footer><div class="footer-top"><a class="footer-wordmark" href="${home ? '#' : '/'}" aria-label="${esc(s.name)} home"><img class="footer-logo" src="/oldcrow-transparent.png" alt="" width="104" height="104">${S('site.shortName', 'text', s.shortName, '', 'bdi')}</a><p${A('site.footerTagline', 'lines')}>${lines(s.footerTagline)}</p></div><div class="footer-bottom"><span>© <span id="year">${new Date().getFullYear()}</span> ${S('site.name', 'text', s.name, 'Business name', 'bdi')}</span><span${A('site.footerLocation')}>${esc(s.footerLocation)}</span>${s.footerCredit || ed.edit ? `<span${A('site.footerCredit', 'text', 'Add a photo credit (optional)')}>${esc(s.footerCredit)}</span>` : ''}<a href="#">Back to top ${UP}</a></div></footer>
</body>
</html>
`;
}

export function renderHome(c, host = '', { edit = false } = {}) {
  const ed = editing(edit);
  const { A, S, ITEM, LINK, ADD } = ed;
  const { site: s, home: h, hours } = c;
  const hero = h.hero;
  const hoursHtml = hours.map((r, i) => `<div${ITEM(`hours.${i}`)}><span${A(`hours.${i}.label`, 'text', 'Days')}>${esc(r.label)}</span><span${A(`hours.${i}.time`, 'text', 'Hours')}>${esc(r.time)}</span></div>`).join('') + ADD('hours', { label: '', time: '' }, 'Add hours');
  const ticker = h.ticker.length || edit ? h.ticker : [s.name];
  const body = `    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy"><div class="eyebrow"><span class="short-line"></span> ${S('home.hero.eyebrow', 'text', hero.eyebrow)}</div><h1 id="hero-title"${A('home.hero.title', 'accent')}>${accent(hero.title)}</h1><p${A('home.hero.text', 'lines')}>${lines(hero.text)}</p><div class="hero-actions"><a class="button" href="#visit">${S('home.hero.button', 'text', hero.button)} <span aria-hidden="true">${ARROW}</span></a><a class="text-link" href="#menu">${S('home.hero.link', 'text', hero.link)} <span aria-hidden="true">${DOWN}</span></a></div><div class="hero-foot"><span aria-hidden="true">${PIN}</span> ${S('home.hero.foot', 'text', hero.foot)}</div></div>
      <div class="hero-photo"${edit ? ' data-edit-img="home.hero.photo"' : ''}><img src="${esc(hero.photo)}" alt="${esc(hero.photoAlt)}" fetchpriority="high" width="1400" height="1600"><div class="photo-label"${A('home.hero.photoLabel', 'lines')}>${lines(hero.photoLabel)}</div><div class="coffee-seal" aria-hidden="true"><span${A('home.hero.sealTop')}>${esc(hero.sealTop)}</span><b${A('home.hero.sealMain', 'lines')}>${lines(hero.sealMain)}</b><span${A('home.hero.sealBottom')}>${esc(hero.sealBottom)}</span></div></div>
    </section>
    <section class="coffee-slider" aria-label="${esc(s.name)} highlights"><button class="strip-arrow strip-prev" type="button" aria-label="Previous coffee highlight" aria-controls="coffee-strip">${PREV}</button><div class="ticker" id="coffee-strip" tabindex="0" aria-label="Coffee highlights. Swipe or use arrow keys to browse.">${ticker.map((t, i) => `<div class="strip-slide"${ITEM(`home.ticker.${i}`)}>${S(`home.ticker.${i}`, 'text', t, 'Highlight')} <i aria-hidden="true">${STAR}</i></div>`).join('')}</div><button class="strip-arrow strip-next" type="button" aria-label="Next coffee highlight" aria-controls="coffee-strip">${NEXT}</button><span class="strip-status sr-only" aria-live="polite" aria-atomic="true"></span>${ADD('home.ticker', '', 'Add highlight')}</section>
    <section class="story section" id="our-story"><div class="story-aside"><div class="eyebrow"${A('home.story.eyebrow')}>${esc(h.story.eyebrow)}</div><div class="crow-perch"><button class="crow-friend" type="button" aria-label="Make the neighborhood crow fly" data-crow="neighbor"><span class="crow-art"><img class="crow-emblem" src="/oldcrow-emblem.png" alt="" width="120" height="120"><span class="crow-bird"><img src="/oldcrow-bird.png" alt="" width="120" height="120"></span></span><span class="crow-invitation"><span class="crow-hint-desktop">Hover or click to fly</span><span class="crow-hint-touch">Tap to fly</span></span></button><p class="crow-reply" aria-live="polite" aria-atomic="true"></p></div></div><div class="story-body"><h2${A('home.story.title', 'accent')}>${accent(h.story.title)}</h2><div class="story-columns">${h.story.paragraphs.map((p, i) => `<p${ITEM(`home.story.paragraphs.${i}`)}${A(`home.story.paragraphs.${i}`, 'multiline', 'Write a paragraph')}>${esc(p)}</p>`).join('')}</div>${ADD('home.story.paragraphs', '', 'Add paragraph')}</div></section>
    <section class="menu-section section" id="menu"><div class="menu-heading"><div class="eyebrow"${A('home.menuTeaser.eyebrow')}>${esc(h.menuTeaser.eyebrow)}</div><h2${A('home.menuTeaser.title', 'lines')}>${lines(h.menuTeaser.title)}</h2><p${A('home.menuTeaser.text')}>${esc(h.menuTeaser.text)}</p><a class="text-link" href="/menu">${S('home.menuTeaser.link', 'text', h.menuTeaser.link)} <span aria-hidden="true">${ARROW}</span></a></div><div class="menu-card"><div class="menu-card-top"><span${A('home.menuTeaser.cardLabel')}>${esc(h.menuTeaser.cardLabel)}</span><button class="crow-friend crow-friend-small" type="button" aria-label="Make the menu crow fly" data-crow="menu"><span class="crow-art"><img class="crow-emblem" src="/oldcrow-emblem.png" alt="" width="64" height="64"><span class="crow-bird"><img src="/oldcrow-bird.png" alt="" width="64" height="64"></span></span></button></div><p class="crow-reply menu-crow-reply" aria-live="polite" aria-atomic="true"></p><h3${A('home.menuTeaser.cardTitle', 'lines')}>${lines(h.menuTeaser.cardTitle)}</h3><div class="menu-qr-preview"><a href="/menu" aria-label="Open the ${esc(s.name)} menu"><img src="/menu-qr.svg" width="132" height="132" alt="QR code linking to the ${esc(s.name)} menu"></a><div><span class="qr-label"${A('home.menuTeaser.qrLabel')}>${esc(h.menuTeaser.qrLabel)}</span><p${A('home.menuTeaser.qrText', 'lines')}>${lines(h.menuTeaser.qrText)}</p>${host ? `<span class="qr-note">${esc(host)}/menu</span>` : ''}</div></div><div class="menu-rule"></div><div class="coming-soon"${A('home.menuTeaser.tags')}>${esc(h.menuTeaser.tags)}</div><p${A('home.menuTeaser.cardText', 'lines')}>${lines(h.menuTeaser.cardText)}</p><a href="/menu">${S('home.menuTeaser.cardLink', 'text', h.menuTeaser.cardLink)} <span aria-hidden="true">${ARROW}</span></a></div></section>
    <section class="visit section" id="visit"><div class="visit-title"><div class="eyebrow"${A('home.visit.eyebrow')}>${esc(h.visit.eyebrow)}</div><h2${A('home.visit.title', 'accent')}>${accent(h.visit.title)}</h2><p${A('home.visit.text', 'lines')}>${lines(h.visit.text)}</p>${s.mapsUrl || edit ? `<a class="button" href="${esc(s.mapsUrl)}" target="_blank" rel="noopener noreferrer"${LINK('site.mapsUrl')}>${S('home.visit.button', 'text', h.visit.button)} <span aria-hidden="true">${ARROW}</span></a>` : ''}</div><div class="visit-info"><div class="info-row"><h3${A('home.visit.spotLabel')}>${esc(h.visit.spotLabel)}</h3><address>${S('site.address1', 'text', s.address1, 'Street address')}<br>${S('site.address2', 'text', s.address2, 'City, state, ZIP')}</address></div><div class="info-row"><h3${A('home.visit.hoursLabel')}>${esc(h.visit.hoursLabel)}</h3><div class="hours">${hoursHtml}${h.visit.hoursNote || edit ? `<p${A('home.visit.hoursNote', 'text', 'Add a note (holiday hours, etc.)')}>${esc(h.visit.hoursNote)}</p>` : ''}</div></div><div class="info-row"><h3${A('home.visit.helloLabel')}>${esc(h.visit.helloLabel)}</h3><div>${s.email || edit ? `<a class="email-link" href="mailto:${esc(s.email)}"${LINK('site.email', 'email')}>${esc(s.email) || 'Add an email address'}</a>` : ''}${s.facebookUrl || edit ? `<a class="facebook-link" href="${esc(s.facebookUrl)}" target="_blank" rel="noopener noreferrer"${LINK('site.facebookUrl')}>${S('site.facebookLabel', 'text', s.facebookLabel)} ${ARROW}</a>` : ''}</div></div></div></section>`;
  return shell({ title: `${s.name} — Springfield, Oregon`, description: s.metaDescription, c, body, current: 'home', ed });
}

export function renderMenu(c, { edit = false } = {}) {
  const ed = editing(edit);
  const { A, S, ITEM, ADD } = ed;
  const { site: s, menu: m } = c;
  const live = m.files.filter(f => f.live);
  const useUpload = m.display === 'upload' && live.length > 0;
  const digital = `<div class="menu-grid">${m.categories.map((cat, ci) => `<section class="menu-col"${ITEM(`menu.categories.${ci}`)}><h2${A(`menu.categories.${ci}.name`, 'text', 'Section name')}>${esc(cat.name)}</h2><ul>${cat.items.map((i, ii) => {
    const p = `menu.categories.${ci}.items.${ii}`;
    return `<li${ITEM(p)}>${S(`${p}.name`, 'text', i.name, 'Item name')}${i.price || edit ? ` <span class="menu-price"${A(`${p}.price`, 'text', 'price')}>${esc(i.price)}</span>` : ''}${i.desc || edit ? `<small class="menu-desc"${A(`${p}.desc`, 'text', 'Add a description')}>${esc(i.desc)}</small>` : ''}</li>`;
  }).join('')}</ul>${ADD(`menu.categories.${ci}.items`, { name: '', price: '', desc: '' }, 'Add item')}</section>`).join('')}</div>${ADD('menu.categories', { name: 'New section', items: [{ name: '', price: '', desc: '' }] }, 'Add section')}${m.kidsNote || edit ? `<p class="menu-kids"${A('menu.kidsNote', 'text', 'Add a note')}>${esc(m.kidsNote)}</p>` : ''}`;
  const uploaded = `<div class="menu-files">${live.map(f => f.kind === 'pdf'
    ? `<div class="menu-file menu-file-pdf"><a class="button" href="${esc(f.url)}" target="_blank" rel="noopener noreferrer">Open ${esc(f.name)} (PDF) <span aria-hidden="true">${ARROW}</span></a><object class="menu-pdf-embed" data="${esc(f.url)}" type="application/pdf" aria-label="${esc(f.name)}"></object></div>`
    : `<figure class="menu-file"><a href="${esc(f.url)}" target="_blank" rel="noopener noreferrer"><img src="${esc(f.url)}" alt="${esc(f.name)}" loading="lazy"></a></figure>`).join('')}</div>${edit ? '<p class="oc-note">You are showing an uploaded menu. Manage the files in the “Menu” tab, or switch to the typed menu there to edit items on this page.</p>' : ''}`;
  const body = `    <section class="menu-page section"><div class="menu-page-head"><div class="eyebrow"${A('menu.eyebrow')}>${esc(m.eyebrow)}</div><h1${A('menu.title', 'lines')}>${lines(m.title)}</h1>${m.notice || edit ? `<p class="menu-notice"${A('menu.notice', 'text', 'Add a special notice')}>${esc(m.notice)}</p>` : ''}${!useUpload && (m.sizesNote || edit) ? `<p class="menu-sizes"${A('menu.sizesNote', 'text', 'Add a sizes note')}>${esc(m.sizesNote)}</p>` : ''}</div>${useUpload ? uploaded : digital}<div class="menu-qr-card"><a href="/menu" aria-label="Menu QR code"><img src="/menu-qr.svg" width="120" height="120" alt="QR code linking to this menu"></a><div><span class="qr-label"${A('menu.qrLabel')}>${esc(m.qrLabel)}</span><p${A('menu.qrText')}>${esc(m.qrText)}</p></div></div></section>`;
  return shell({ title: `Menu — ${s.name}`, description: m.metaDescription, c, body, current: 'menu', ed });
}
