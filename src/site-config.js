// ---------------------------------------------------------------------------
// Site-wide configuration constants
// ---------------------------------------------------------------------------

/** Cloudflare Worker base URL for interactive features.
 *  Set to '' (empty string) to disable Worker and use GitHub fallbacks.
 *  Once the Worker is deployed, replace with your Worker URL, e.g.:
 *    'https://bangla-library-worker.<your-subdomain>.workers.dev'
 */
export const WORKER_URL = '';

/** Site canonical URL (no trailing slash) */
export const SITE_URL = 'https://shahriarspace.github.io/bangla-library';

/** GitHub repository in owner/name format */
export const GITHUB_REPO = 'shahriarspace/bangla-library';

/** Ko-fi / donation page URL (placeholder — update when account is created) */
export const DONATE_URL = 'https://ko-fi.com/banglalib';
