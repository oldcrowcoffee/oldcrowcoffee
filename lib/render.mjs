// Server-side page templates. Every piece of owner-editable text goes through esc().
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

function shell({ title, description, c, body, current }) {
  const s = c.site;
  const home = current === 'home';
  const pre = home ? '' : '/';
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
  <script src="/app.js" defer></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="announcement">${esc(s.announcement)} <span>${esc(s.announcementTag)}</span></div>
  <header class="header">
    <a class="brand" href="${home ? '#' : '/'}" aria-label="${esc(s.name)} home"><img class="brand-logo" src="/oldcrow-transparent.png" alt="" width="68" height="68"><span class="brand-type"><span class="brand-title">${esc(s.shortName)}</span><span class="brand-sub">${esc(s.name.replace(/^old crow\s*/i, '').toUpperCase() || 'COFFEE COMPANY')}</span></span></a>
    <button class="nav-toggle" aria-controls="navigation" aria-expanded="false">Menu <span aria-hidden="true">${MENU_ICON}</span></button>
    <nav id="navigation" aria-label="Main navigation"><a href="${pre}#our-story">Our story</a><a href="/menu"${current === 'menu' ? ' aria-current="page"' : ''}>Menu</a><a href="${pre}#visit">Find us</a>${s.facebookUrl ? `<a class="nav-cta" href="${esc(s.facebookUrl)}" target="_blank" rel="noopener noreferrer">${esc(s.navFollow)} <span aria-hidden="true">${ARROW}</span></a>` : ''}</nav>
  </header>
  <main id="main">
${body}
  </main>
  <footer><div class="footer-top"><a class="footer-wordmark" href="${home ? '#' : '/'}" aria-label="${esc(s.name)} home"><img class="footer-logo" src="/oldcrow-transparent.png" alt="" width="104" height="104">${esc(s.shortName)}</a><p>${lines(s.footerTagline)}</p></div><div class="footer-bottom"><span>© <span id="year">${new Date().getFullYear()}</span> ${esc(s.name)}</span><span>${esc(s.footerLocation)}</span><a href="https://unsplash.com/photos/a-cup-of-coffee-on-a-saucer-on-a-black-table-S-ACh5HiDNE" target="_blank" rel="noopener noreferrer">Photography: Syauqy Ayyash</a><a href="#">Back to top ${UP}</a></div></footer>
</body>
</html>
`;
}

export function renderHome(c) {
  const { site: s, home: h, hours } = c;
  const hero = h.hero;
  const hoursHtml = hours.map(r => `<div><span>${esc(r.label)}</span><span>${esc(r.time)}</span></div>`).join('');
  const body = `    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy"><div class="eyebrow"><span class="short-line"></span> ${esc(hero.eyebrow)}</div><h1 id="hero-title">${accent(hero.title)}</h1><p>${lines(hero.text)}</p><div class="hero-actions"><a class="button" href="#visit">${esc(hero.button)} <span aria-hidden="true">${ARROW}</span></a><a class="text-link" href="#menu">${esc(hero.link)} <span aria-hidden="true">${DOWN}</span></a></div><div class="hero-foot"><span aria-hidden="true">${PIN}</span> ${esc(hero.foot)}</div></div>
      <div class="hero-photo"><img src="${esc(hero.photo)}" alt="${esc(hero.photoAlt)}" fetchpriority="high" width="1400" height="1600"><div class="photo-label">${lines(hero.photoLabel)}</div><div class="coffee-seal" aria-hidden="true"><span>${esc(hero.sealTop)}</span><b>${lines(hero.sealMain)}</b><span>${esc(hero.sealBottom)}</span></div></div>
    </section>
    <section class="coffee-slider" aria-label="${esc(s.name)} highlights"><button class="strip-arrow strip-prev" type="button" aria-label="Previous coffee highlight" aria-controls="coffee-strip">${PREV}</button><div class="ticker" id="coffee-strip" tabindex="0" aria-label="Coffee highlights. Swipe or use arrow keys to browse.">${(h.ticker.length ? h.ticker : [s.name]).map(t => `<div class="strip-slide">${esc(t)} <i aria-hidden="true">${STAR}</i></div>`).join('')}</div><button class="strip-arrow strip-next" type="button" aria-label="Next coffee highlight" aria-controls="coffee-strip">${NEXT}</button><span class="strip-status sr-only" aria-live="polite" aria-atomic="true"></span></section>
    <section class="story section" id="our-story"><div class="story-aside"><div class="eyebrow">${esc(h.story.eyebrow)}</div><div class="crow-perch"><button class="crow-friend" type="button" aria-label="Make the neighborhood crow fly" data-crow="neighbor"><span class="crow-art"><img class="crow-emblem" src="/oldcrow-emblem.png" alt="" width="120" height="120"><span class="crow-bird"><img src="/oldcrow-bird.png" alt="" width="120" height="120"></span></span><span class="crow-invitation"><span class="crow-hint-desktop">Hover or click to fly</span><span class="crow-hint-touch">Tap to fly</span></span></button><p class="crow-reply" aria-live="polite" aria-atomic="true"></p></div></div><div class="story-body"><h2>${accent(h.story.title)}</h2><div class="story-columns">${h.story.paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}</div></div></section>
    <section class="menu-section section" id="menu"><div class="menu-heading"><div class="eyebrow">${esc(h.menuTeaser.eyebrow)}</div><h2>${lines(h.menuTeaser.title)}</h2><p>${esc(h.menuTeaser.text)}</p><a class="text-link" href="/menu">${esc(h.menuTeaser.link)} <span aria-hidden="true">${ARROW}</span></a></div><div class="menu-card"><div class="menu-card-top"><span>${esc(h.menuTeaser.cardLabel)}</span><button class="crow-friend crow-friend-small" type="button" aria-label="Make the menu crow fly" data-crow="menu"><span class="crow-art"><img class="crow-emblem" src="/oldcrow-emblem.png" alt="" width="64" height="64"><span class="crow-bird"><img src="/oldcrow-bird.png" alt="" width="64" height="64"></span></span></button></div><p class="crow-reply menu-crow-reply" aria-live="polite" aria-atomic="true"></p><h3>${lines(h.menuTeaser.cardTitle)}</h3><div class="menu-qr-preview"><a href="/menu" aria-label="Open the ${esc(s.name)} menu"><img src="/menu-qr.svg" width="132" height="132" alt="QR code linking to the ${esc(s.name)} menu"></a><div><span class="qr-label">${esc(h.menuTeaser.qrLabel)}</span><p>${lines(h.menuTeaser.qrText)}</p>${s.domain ? `<span class="qr-note">${esc(s.domain)}/menu</span>` : ''}</div></div><div class="menu-rule"></div><div class="coming-soon">${esc(h.menuTeaser.tags)}</div><p>${lines(h.menuTeaser.cardText)}</p><a href="/menu">${esc(h.menuTeaser.cardLink)} <span aria-hidden="true">${ARROW}</span></a></div></section>
    <section class="visit section" id="visit"><div class="visit-title"><div class="eyebrow">${esc(h.visit.eyebrow)}</div><h2>${accent(h.visit.title)}</h2><p>${lines(h.visit.text)}</p>${s.mapsUrl ? `<a class="button" href="${esc(s.mapsUrl)}" target="_blank" rel="noopener noreferrer">${esc(h.visit.button)} <span aria-hidden="true">${ARROW}</span></a>` : ''}</div><div class="visit-info"><div class="info-row"><h3>${esc(h.visit.spotLabel)}</h3><address>${esc(s.address1)}<br>${esc(s.address2)}</address></div><div class="info-row"><h3>${esc(h.visit.hoursLabel)}</h3><div class="hours">${hoursHtml}${h.visit.hoursNote ? `<p>${esc(h.visit.hoursNote)}</p>` : ''}</div></div><div class="info-row"><h3>${esc(h.visit.helloLabel)}</h3><div>${s.email ? `<a class="email-link" href="mailto:${esc(s.email)}">${esc(s.email)}</a>` : ''}${s.facebookUrl ? `<a class="facebook-link" href="${esc(s.facebookUrl)}" target="_blank" rel="noopener noreferrer">${esc(s.facebookLabel)} ${ARROW}</a>` : ''}</div></div></div></section>`;
  return shell({ title: `${s.name} — Springfield, Oregon`, description: s.metaDescription, c, body, current: 'home' });
}

export function renderMenu(c) {
  const { site: s, menu: m } = c;
  const live = m.files.filter(f => f.live);
  const useUpload = m.display === 'upload' && live.length > 0;
  const digital = `<div class="menu-grid">${m.categories.map(cat => `<section class="menu-col"><h2>${esc(cat.name)}</h2><ul>${cat.items.map(i => `<li>${esc(i.name)}${i.price ? ` <span class="menu-price">${esc(i.price)}</span>` : ''}${i.desc ? `<small class="menu-desc">${esc(i.desc)}</small>` : ''}</li>`).join('')}</ul></section>`).join('')}</div>${m.kidsNote ? `<p class="menu-kids">${esc(m.kidsNote)}</p>` : ''}`;
  const uploaded = `<div class="menu-files">${live.map(f => f.kind === 'pdf'
    ? `<div class="menu-file menu-file-pdf"><a class="button" href="${esc(f.url)}" target="_blank" rel="noopener noreferrer">Open ${esc(f.name)} (PDF) <span aria-hidden="true">${ARROW}</span></a><object class="menu-pdf-embed" data="${esc(f.url)}" type="application/pdf" aria-label="${esc(f.name)}"></object></div>`
    : `<figure class="menu-file"><a href="${esc(f.url)}" target="_blank" rel="noopener noreferrer"><img src="${esc(f.url)}" alt="${esc(f.name)}" loading="lazy"></a></figure>`).join('')}</div>`;
  const body = `    <section class="menu-page section"><div class="menu-page-head"><div class="eyebrow">${esc(m.eyebrow)}</div><h1>${lines(m.title)}</h1>${m.notice ? `<p class="menu-notice">${esc(m.notice)}</p>` : ''}${!useUpload && m.sizesNote ? `<p class="menu-sizes">${esc(m.sizesNote)}</p>` : ''}</div>${useUpload ? uploaded : digital}<div class="menu-qr-card"><a href="/menu" aria-label="Menu QR code"><img src="/menu-qr.svg" width="120" height="120" alt="QR code linking to this menu"></a><div><span class="qr-label">${esc(m.qrLabel)}</span><p>${esc(m.qrText)}</p></div></div></section>`;
  return shell({ title: `Menu — ${s.name}`, description: m.metaDescription, c, body, current: 'menu' });
}
