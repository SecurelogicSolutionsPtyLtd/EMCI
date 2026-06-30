import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * POST /devtoken
 * Exchanges Azure AD client credentials for an access token.
 * Runs server-side so the CLIENT_SECRET is never exposed to the browser.
 */
const ALLOWED_ORIGIN = process.env.VITE_SITE_URL?.replace(/\/$/, '') ?? 'https://emci.acce.org.au';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const TENANT_ID     = process.env.TENANT_ID     ?? '';
  const CLIENT_ID     = process.env.CLIENT_ID     ?? '';
  const CLIENT_SECRET = process.env.CLIENT_SECRET ?? '';
  const TOKEN_SCOPE   = process.env.TOKEN_SCOPE   ?? '';

  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
    return res.status(500).json({ error: 'Azure AD credentials not configured on server.' });
  }

  const MS_TOKEN_URL = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;

  try {
    const body = new URLSearchParams({
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type:    'client_credentials',
      scope:         TOKEN_SCOPE,
    });

    const tokenRes = await fetch(MS_TOKEN_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    });

    const data = await tokenRes.json() as Record<string, unknown>;
    return res.status(tokenRes.status).json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Internal error';
    return res.status(500).json({ error: msg });
  }
}
