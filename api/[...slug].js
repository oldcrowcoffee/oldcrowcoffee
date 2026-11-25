import { handle } from '../lib/router.mjs';

// One function serves the public pages (/ and /menu, via rewrites) and the admin API (/api/*).
export default { fetch: handle };
