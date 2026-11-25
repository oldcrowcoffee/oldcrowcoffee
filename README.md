# Old Crow Coffee Company

Responsive, dependency-free website for Old Crow Coffee Company in Springfield, Oregon.

## Editing the site (CMS)

The owner edits everything at **/admin** (password protected):

- **Visual editor tab (default)**: the real site, live inside the admin. Click any text to type over it, click the main photo to replace it, hover items for ↑ ↓ ✕ (and links for a 🔗 button), use the “+ Add” buttons for new menu items, sections, hours, paragraphs and highlights. Switch between the Home and Menu pages and between Desktop and Phone widths. Edits are drafts until **Save & publish**.

- **Menu tab**: upload a new menu (PDF or images) and switch it on, or edit the typed menu (sections, items, optional prices/descriptions, a "special notice" banner). The QR code always points at `/menu-file`, which forwards to the live menu, so changing the menu never means reprinting the QR code.
- **Home page / Hours & contact / Site-wide tabs**: every piece of text, the main photo, hours, address, email, Facebook link and SEO descriptions.

Press **Save & publish**; changes appear on the live site within about 30 seconds. Pages are rendered on the server from one content file (`lib/defaults.mjs` holds the starting content; edits are stored in Vercel Blob).

### One-time Vercel setup

1. **Storage**: in the Vercel project, Storage tab, create a **Blob** store (public) and connect it to the project. This adds `BLOB_READ_WRITE_TOKEN` automatically.
2. **Password**: add environment variable `ADMIN_PASSWORD` (a long passphrase). Optionally add `SESSION_SECRET` (any long random string).
3. Redeploy. Visit `/admin`, sign in, and share the password only with the owner.

Without `ADMIN_PASSWORD` the admin stays locked; without a Blob store it shows a banner and cannot save.

Uploads go through a Vercel function, which limits a request to about 4.5 MB: photos are shrunk automatically in the browser, and PDFs must be under 4 MB.

## Run locally

Requires Node.js 20+.

```sh
npm install
npm run dev
```

Open http://localhost:3000 and http://localhost:3000/admin (local password `changeme`, or set `ADMIN_PASSWORD`). Locally, content and uploads are saved in `.data/` (git-ignored) unless `BLOB_READ_WRITE_TOKEN` is set.

```sh
npm run check   # syntax checks + offline smoke tests
```

## Layout

- `dist/`: static files (CSS, images, `app.js`, admin UI `admin.html`/`admin.js`/`admin.css`, and `visual.js`, the in-page editor that only runs inside the admin preview)
- `lib/`: content defaults and validation, storage, auth, page templates, router
- `api/*.js`: one tiny Vercel function per endpoint (`page`, `preview`, `menu-file`, `qr`, `session`, `login`, `logout`, `content`, `upload`), all running `lib/router.mjs`. `/` and `/menu` reach `api/page.js` through rewrites in `vercel.json`. Keep these single-level: Vercel does not route nested `/api/a/b` paths to a catch-all file.
- `server.mjs`: local dev server using the same handlers

## Features

- Responsive warm coffeehouse design and mobile swipe slider
- Transparent brand logo and interactive crow flight, with reduced-motion support
- Menu QR code, generated at `/menu-qr.svg`. By default it encodes this site's own `/menu-file` address, which forwards to the live uploaded menu when exactly one is switched on and to the `/menu` page otherwise, so replacing the menu never means reprinting the code. The address is editable (with live preview and download) in the admin Menu tab; custom addresses must be https.

## Deployment

Vercel serves `dist/` plus the function in `api/`, and runs `npm run check` as the build step (`vercel.json`).
The current live site is https://oldcrowcoffeedraft.vercel.app.
Vercel account linking and credentials are not committed.

## Assets and attribution

The owner supplied the original logo in `dist/oldcrow.jpg`. The site uses the restored transparent version, `dist/oldcrow-transparent.png`, and separate bird/emblem layers. The Python asset scripts require Pillow and NumPy; they are not needed to run the website. Draft images are retained as inputs to the restoration scripts.

The coffee photograph is illustrative stock, not a photograph of the business or its products. Photo by Syauqy Ayyash: https://unsplash.com/photos/a-cup-of-coffee-on-a-saucer-on-a-black-table-S-ACh5HiDNE . Fonts and the photograph load from external services.

The airborne animation is a transparent, stabilized silhouette extracted from 36 frames of the user-supplied Tenor reference: https://tenor.com/view/epix-from-epix-crow-epix-from-gif-25283470 . `build_natural_flight.py` creates `dist/crow-natural-flight.webp` from `crow-flight-reference.gif`. The detailed logo crow remains visible while perched and transitions into the silhouette during flight.
