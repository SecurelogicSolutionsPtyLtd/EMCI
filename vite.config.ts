import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // Read without VITE_ prefix — these are server-only secrets and must never
  // be bundled into the client. Fall back to VITE_-prefixed names so existing
  // .env files continue working during development.
  const TENANT_ID     = env.TENANT_ID     ?? env.VITE_TENANT_ID     ?? '';
  const CLIENT_ID     = env.CLIENT_ID     ?? env.VITE_CLIENT_ID     ?? '';
  const CLIENT_SECRET = env.CLIENT_SECRET ?? env.VITE_CLIENT_SECRET ?? '';
  const TOKEN_SCOPE   = env.TOKEN_SCOPE   ?? env.VITE_TOKEN_SCOPE   ?? '';
  const MS_TOKEN_URL  = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const SITE_URL      = (env.VITE_SITE_URL ?? '').replace(/\/$/, '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'html-meta-site-url',
        transformIndexHtml(html) {
          return html.replaceAll('{{SITE_URL}}', SITE_URL);
        },
      },
      {
        name: 'dataverse-token-server',
        configureServer(server) {
          // POST /devtoken — Node fetches the token from Azure AD.
          // Because this runs in Node (no browser Origin header) AADSTS9002326 cannot fire.
          server.middlewares.use('/devtoken', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end('Method Not Allowed');
              return;
            }
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
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.statusCode = tokenRes.status;
              res.end(JSON.stringify(data));
            } catch (e: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: e?.message ?? 'Internal error' }));
            }
          });
        },
      },
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/dataverse': {
          target: 'https://mcicrm.crm6.dynamics.com',
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/dataverse/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              const auth = (req as any).headers?.authorization;
              if (auth) proxyReq.setHeader('Authorization', auth);
            });
          },
        },
      },
    },
  };
});
