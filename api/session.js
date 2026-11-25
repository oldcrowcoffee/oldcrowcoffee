import { handle } from '../lib/router.mjs';

// Vercel maps single-segment files (/api/<name>) reliably; all of them share one router.
export default { fetch: handle };
