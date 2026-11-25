import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { defaults } from './defaults.mjs';

const CONTENT_KEY = 'site/content.json';
// Older stores: BLOB_READ_WRITE_TOKEN, or <PREFIX>_READ_WRITE_TOKEN if a custom prefix was chosen.
const blobToken = () => process.env.BLOB_READ_WRITE_TOKEN || process.env[Object.keys(process.env).find(k => /_READ_WRITE_TOKEN$/.test(k) && process.env[k]) || ''] || '';
// Newer stores set BLOB_STORE_ID and authenticate with Vercel's OIDC identity instead of a token; the Blob library handles that itself.
// OC_STORAGE=local forces local files (used by tests so they can never touch a real store).
const useBlob = () => process.env.OC_STORAGE !== 'local' && Boolean(blobToken() || process.env.BLOB_STORE_ID);
const dataDir = path.resolve('.data');
export const storageMode = () => (useBlob() ? 'vercel-blob' : process.env.VERCEL && process.env.OC_STORAGE !== 'local' ? 'none' : 'local-files');
export const getDefaultContent = () => sanitize({});

// ---------- validation / merge ----------
const str = (v, fallback = '', max = 2000) => (typeof v === 'string' ? v.slice(0, max) : fallback);
const safeUrl = (v, fallback = '') => {
  const s = str(v, fallback, 2000).trim();
  return /^(https:\/\/|\/(?!\/))/.test(s) ? s : s === '' ? '' : fallback;
};
const list = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);

function objectOf(template, input, fieldRules = {}) {
  const out = {};
  for (const key of Object.keys(template)) {
    const rule = fieldRules[key];
    out[key] = rule ? rule(input?.[key], template[key]) : str(input?.[key], template[key]);
  }
  return out;
}

export function sanitize(input = {}) {
  const d = defaults;
  const site = objectOf(d.site, input.site, {
    email: (v, f) => (/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(str(v, f).trim()) ? str(v, f).trim() : f),
    facebookUrl: (v, f) => safeUrl(v, f),
    mapsUrl: (v, f) => safeUrl(v, f)
  });
  const home = {
    hero: objectOf(d.home.hero, input.home?.hero, { photo: (v, f) => safeUrl(v, f) }),
    ticker: list(input.home?.ticker ?? d.home.ticker, 12).map(t => str(t, '', 120)).filter(Boolean),
    story: {
      ...objectOf({ eyebrow: d.home.story.eyebrow, title: d.home.story.title }, input.home?.story),
      paragraphs: list(input.home?.story?.paragraphs ?? d.home.story.paragraphs, 10).map(t => str(t, '', 2000)).filter(Boolean)
    },
    menuTeaser: objectOf(d.home.menuTeaser, input.home?.menuTeaser),
    visit: objectOf(d.home.visit, input.home?.visit)
  };
  const hours = list(input.hours ?? d.hours, 14)
    .map(h => ({ label: str(h?.label, '', 80), time: str(h?.time, '', 80) }))
    .filter(h => h.label || h.time);

  const m = input.menu ?? {};
  const menu = {
    ...objectOf(Object.fromEntries(Object.entries(d.menu).filter(([k, v]) => typeof v === 'string' && k !== 'display')), m),
    display: m.display === 'upload' ? 'upload' : 'digital',
    qrUrl: /^https:\/\/[^\s]{4,480}$/.test(str(m.qrUrl, '', 500).trim()) ? str(m.qrUrl, '', 500).trim() : '',
    files: list(m.files ?? d.menu.files, 40).map(f => ({
      id: str(f?.id, '', 40).replace(/[^\w-]/g, '') || randomBytes(6).toString('hex'),
      name: str(f?.name, 'Menu', 120),
      kind: f?.kind === 'pdf' ? 'pdf' : 'image',
      url: safeUrl(f?.url),
      live: Boolean(f?.live)
    })).filter(f => f.url),
    categories: list(m.categories ?? d.menu.categories, 40).map(c => ({
      name: str(c?.name, '', 80),
      items: list(c?.items, 200).map(i => (typeof i === 'string' ? { name: i, price: '', desc: '' } : {
        name: str(i?.name, '', 120), price: str(i?.price, '', 30), desc: str(i?.desc, '', 300)
      })).filter(i => i.name)
    })).filter(c => c.name || c.items.length)
  };
  return { site, home, hours, menu };
}

// URLs of files we host, so they can be cleaned up when no longer referenced.
const ownedUrl = u => typeof u === 'string' && (u.startsWith('/uploads/') || /^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\/uploads\//.test(u));
export function referencedFiles(content) {
  return new Set([content.home.hero.photo, ...content.menu.files.map(f => f.url)].filter(ownedUrl));
}

// ---------- persistence ----------
let cache = { at: 0, value: null };

async function readStored() {
  if (useBlob()) {
    const { head } = await import('@vercel/blob');
    try {
      const meta = await head(CONTENT_KEY, { token: blobToken() || undefined });
      const res = await fetch(`${meta.url}?v=${new Date(meta.uploadedAt).getTime()}`);
      if (!res.ok) throw new Error(`content fetch ${res.status}`);
      return await res.json();
    } catch (error) {
      if (error?.name === 'BlobNotFoundError') return null;
      throw error;
    }
  }
  try { return JSON.parse(await readFile(path.join(dataDir, 'content.json'), 'utf8')); } catch { return null; }
}

export async function getContent({ fresh = false } = {}) {
  if (!fresh && cache.value && Date.now() - cache.at < 10_000) return cache.value;
  let value;
  try {
    value = sanitize((await readStored()) ?? {});
  } catch (error) {
    console.error('Could not load stored content, using last good copy or defaults:', error);
    value = cache.value ?? sanitize({});
  }
  cache = { at: Date.now(), value };
  return value;
}

export async function saveContent(input) {
  if (storageMode() === 'none') throw Object.assign(new Error('Storage is not set up. Connect a Vercel Blob store to this project.'), { status: 503 });
  const before = await getContent({ fresh: true });
  const next = sanitize(input);
  const body = JSON.stringify(next, null, 2);
  if (useBlob()) {
    const { put } = await import('@vercel/blob');
    await put(CONTENT_KEY, body, { token: blobToken() || undefined, access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 60 });
  } else {
    await mkdir(dataDir, { recursive: true });
    await writeFile(path.join(dataDir, 'content.json'), body);
  }
  cache = { at: Date.now(), value: next };
  // Remove uploaded files that nothing points at anymore.
  const keep = referencedFiles(next);
  for (const url of referencedFiles(before)) if (!keep.has(url)) await deleteFile(url).catch(() => {});
  return next;
}

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };
export const allowedTypes = Object.keys(EXT);

export async function saveFile(originalName, contentType, buffer) {
  if (!EXT[contentType]) throw Object.assign(new Error('Only JPG, PNG, WebP and PDF files are allowed.'), { status: 415 });
  if (storageMode() === 'none') throw Object.assign(new Error('Storage is not set up. Connect a Vercel Blob store to this project.'), { status: 503 });
  const base = String(originalName || 'menu').replace(/\.[^.]*$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'file';
  const name = `${base}-${randomBytes(4).toString('hex')}.${EXT[contentType]}`;
  if (useBlob()) {
    const { put } = await import('@vercel/blob');
    const blob = await put(`uploads/${name}`, buffer, { token: blobToken() || undefined, access: 'public', addRandomSuffix: false, contentType, cacheControlMaxAge: 60 * 60 * 24 * 30 });
    return { url: blob.url, kind: contentType === 'application/pdf' ? 'pdf' : 'image' };
  }
  await mkdir(path.join(dataDir, 'uploads'), { recursive: true });
  await writeFile(path.join(dataDir, 'uploads', name), buffer);
  return { url: `/uploads/${name}`, kind: contentType === 'application/pdf' ? 'pdf' : 'image' };
}

export async function deleteFile(url) {
  if (!ownedUrl(url)) return;
  if (useBlob()) {
    const { del } = await import('@vercel/blob');
    await del(url, { token: blobToken() || undefined });
  } else {
    await unlink(path.join(dataDir, 'uploads', path.basename(url))).catch(() => {});
  }
}

export const localUploadPath = name => path.join(dataDir, 'uploads', path.basename(name));
