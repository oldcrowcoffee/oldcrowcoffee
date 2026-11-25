// Visual editor, runs inside the admin preview frame only. It needs the admin page's bridge (window.parent.ocBridge),
// so on the public site (or in a stray tab) it does nothing.
(() => {
  const B = window.parent !== window && window.parent.ocBridge;
  if (!B) return;

  const css = `
  body.oc-edit{cursor:default}
  .oc-edit [data-edit]{cursor:text;outline:1px dashed transparent;outline-offset:3px;transition:outline-color .12s;min-width:1.5em}
  .oc-edit :is(span,bdi,small)[data-edit]:not(.announcement span){display:inline-block}
  .oc-edit [data-edit]:hover{outline-color:#a94729}
  .oc-edit [data-edit]:focus{outline:2px solid #a94729;background:rgba(255,255,255,.45)}
  .oc-edit [data-edit]:empty::before{content:attr(data-ph);opacity:.55;font-style:italic;pointer-events:none}
  .oc-edit [data-edit]:empty:not([data-ph])::before{content:"Click to type"}
  .oc-edit [data-kind=multiline],.oc-edit [data-kind=lines],.oc-edit [data-kind=accent]{white-space:pre-wrap}
  .oc-edit [data-edit-img]{cursor:pointer;position:relative}
  .oc-edit [data-edit-img]::after{content:"Click to replace photo";position:absolute;left:50%;top:14px;transform:translateX(-50%);background:#262820;color:#fff;font:600 13px/1 'DM Sans',sans-serif;padding:9px 12px;opacity:0;transition:opacity .15s;pointer-events:none;z-index:5}
  .oc-edit [data-edit-img]:hover::after{opacity:1}
  .oc-edit [data-link]{outline:1px dashed transparent;outline-offset:3px}
  .oc-edit [data-link]:hover{outline-color:#a94729}
  .oc-add{all:unset;box-sizing:border-box;cursor:pointer;display:inline-block;margin:10px 0;padding:8px 14px;border:1px dashed #a94729;color:#a94729;font:600 13px/1.2 'DM Sans',sans-serif;background:rgba(255,255,255,.6)}
  .oc-add:hover{background:#a94729;color:#fff}
  .oc-note{max-width:900px;margin:24px auto;padding:12px 16px;background:#fff3cd;border:1px solid #e0c36a;font:14px/1.5 'DM Sans',sans-serif}
  .oc-bar{position:absolute;z-index:99999;display:none;gap:4px;background:#262820;padding:4px;box-shadow:0 2px 8px rgba(0,0,0,.3)}
  .oc-bar button{all:unset;cursor:pointer;color:#fff;font:600 13px/1 'DM Sans',sans-serif;padding:7px 9px;min-width:28px;text-align:center}
  .oc-bar button:hover{background:#a94729}
  .oc-bar button[data-act=remove]:hover{background:#b3261e}
  .oc-toast{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);background:#262820;color:#fff;padding:10px 14px;font:600 13px/1.3 'DM Sans',sans-serif;z-index:99999;max-width:90vw}
  .oc-edit footer [data-edit]{padding:3px 6px;margin:-3px -6px}
  .oc-edit footer [data-edit]:hover{outline-color:#cd744f}
  .oc-edit footer [data-edit]:focus{outline-color:#cd744f;background:rgba(255,255,255,.14)}
  .oc-edit .announcement [data-edit]:hover{outline-color:#cd744f}
  .oc-edit .announcement [data-edit]:focus{outline-color:#cd744f;background:rgba(255,255,255,.14)}
  .oc-edit .strip-slide{position:relative}
  .oc-edit .menu-col>h2,.oc-edit .hours>div{position:relative}
  `;
  document.head.append(Object.assign(document.createElement('style'), { textContent: css }));

  const toast = msg => {
    const el = Object.assign(document.createElement('div'), { className: 'oc-toast', textContent: msg });
    document.body.append(el); setTimeout(() => el.remove(), 3500);
  };

  // ----- text -----
  const valueOf = el => {
    let t = el.innerText.replace(/\r/g, '').replace(/ /g, ' ');
    if (el.dataset.kind === 'text') return t.replace(/\s*\n+\s*/g, ' ').trim();
    return t.replace(/\n+$/, '');
  };
  document.querySelectorAll('[data-edit]').forEach(el => {
    el.setAttribute('contenteditable', 'plaintext-only');
    if (el.contentEditable !== 'plaintext-only') el.setAttribute('contenteditable', 'true'); // older Firefox
    el.setAttribute('spellcheck', 'true');
    el.addEventListener('input', () => B.set(el.dataset.edit, valueOf(el)));
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' && el.dataset.kind === 'text') { e.preventDefault(); el.blur(); }
      e.stopPropagation(); // keep the page's own key handlers (arrows, space) out of the way while typing
    });
    el.addEventListener('paste', e => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, el.dataset.kind === 'text' ? text.replace(/\s*\n+\s*/g, ' ') : text);
    });
    el.addEventListener('blur', () => { if (!el.textContent.trim()) el.textContent = ''; }); // lets the placeholder show
  });

  // ----- links and navigation -----
  document.addEventListener('click', e => {
    const link = e.target.closest('a');
    if (link) e.preventDefault();
    if (e.target.closest('button:not(.oc-add)') && !e.target.closest('.oc-bar')) e.preventDefault();
  }, true);

  const editLink = el => {
    const path = el.dataset.link; const kind = el.dataset.linkKind;
    const current = B.get(path) || '';
    const next = window.prompt(kind === 'email' ? 'Email address:' : 'Link address (must start with https://). Leave blank to hide the link:', current);
    if (next == null) return;
    const v = next.trim();
    if (kind === 'email' ? v && !/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(v) : v && !/^https:\/\/\S+$/.test(v)) { toast(kind === 'email' ? 'That does not look like an email address.' : 'Links must start with https://'); return; }
    B.set(path, v);
    el.setAttribute('href', kind === 'email' ? `mailto:${v}` : v);
    if (kind === 'email') el.textContent = v || 'Add an email address';
    toast(v ? 'Link updated.' : 'Link cleared. It will be hidden once you save.');
  };

  // ----- photo -----
  document.querySelectorAll('[data-edit-img]').forEach(box => {
    box.addEventListener('click', async e => {
      if (e.target.closest('[data-edit]')) return;
      const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*' });
      input.onchange = async () => {
        if (!input.files[0]) return;
        toast('Uploading photo…');
        try {
          const url = await B.upload(input.files[0]);
          B.set(box.dataset.editImg, url);
          box.querySelector('img').src = url;
          toast('Photo replaced. Save to publish.');
        } catch (err) { toast(err.message); }
      };
      input.click();
    });
  });

  // ----- lists: add / move / remove -----
  const split = path => { const i = path.lastIndexOf('.'); return [path.slice(0, i), Number(path.slice(i + 1))]; };
  document.querySelectorAll('.oc-add').forEach(btn => btn.addEventListener('click', () => B.insert(btn.dataset.add, null, JSON.parse(btn.dataset.new))));

  const bar = document.createElement('div');
  bar.className = 'oc-bar';
  bar.innerHTML = '<button data-act="link" title="Change the link">🔗 Link</button><button data-act="up" title="Move up">↑</button><button data-act="down" title="Move down">↓</button><button data-act="remove" title="Remove">✕</button>';
  document.body.append(bar);
  let target = { item: null, link: null };
  let hideTimer;

  function place() {
    const { item, link } = target;
    if (!item && !link) { bar.style.display = 'none'; return; }
    bar.querySelector('[data-act=link]').style.display = link ? '' : 'none';
    for (const act of ['up', 'down', 'remove']) bar.querySelector(`[data-act=${act}]`).style.display = item ? '' : 'none';
    const el = item || link;
    const r = el.getBoundingClientRect();
    bar.style.display = 'flex';
    const w = bar.offsetWidth;
    bar.style.top = `${window.scrollY + Math.max(2, r.top - bar.offsetHeight - 2)}px`;
    bar.style.left = `${Math.max(4, Math.min(window.scrollX + r.right - w, window.scrollX + document.documentElement.clientWidth - w - 4))}px`;
  }
  document.addEventListener('mouseover', e => {
    clearTimeout(hideTimer);
    if (e.target.closest('.oc-bar')) return;
    target = { item: e.target.closest('[data-item]'), link: e.target.closest('[data-link]') };
    place();
  });
  document.documentElement.addEventListener('mouseleave', () => { hideTimer = setTimeout(() => { target = { item: null, link: null }; place(); }, 300); });
  window.addEventListener('scroll', () => { if (target.item || target.link) place(); }, { passive: true });

  bar.addEventListener('click', e => {
    const act = e.target.closest('button')?.dataset.act;
    if (!act) return;
    if (act === 'link' && target.link) return editLink(target.link);
    if (!target.item) return;
    const [list, index] = split(target.item.dataset.item);
    if (act === 'up') B.move(list, index, -1);
    if (act === 'down') B.move(list, index, 1);
    if (act === 'remove') {
      const isSection = /\.categories$/.test(list);
      if (!isSection || window.confirm('Delete this whole section and its items?')) B.remove(list, index);
    }
    bar.style.display = 'none';
  });
})();
