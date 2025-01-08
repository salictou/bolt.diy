import { useStore } from '@nanostores/react';
import type { LinksFunction, LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from '@remix-run/react';
import tailwindReset from '@unocss/reset/tailwind-compat.css?url';
import { themeStore } from './lib/stores/theme';
import { stripIndents } from './utils/stripIndent';
import { createHead } from 'remix-island';
import { useEffect } from 'react';
import { logStore } from './lib/stores/logs';

import reactToastifyStyles from 'react-toastify/dist/ReactToastify.css?url';
import globalStyles from './styles/index.scss?url';
import xtermStyles from '@xterm/xterm/css/xterm.css?url';

import 'virtual:uno.css';

// Helper function to check IP
function isAllowedIp(requestIp: string, allowedIp: string): boolean {
  // Allow localhost always
  if (requestIp === '127.0.0.1' || requestIp === 'localhost') {
    return true;
  }
  
  // Check if the request IP matches the allowed IP
  return requestIp === allowedIp;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  // Get the IP from the request
  const forwardedFor = request.headers.get('cf-connecting-ip') || 
                      request.headers.get('x-forwarded-for');
                      
  const requestIp = forwardedFor?.split(',')[0].trim() || 
                   request.headers.get('x-real-ip') || 
                   '127.0.0.1';

  const allowedIp = context.env.ALLOWED_IP;

  // If there's no allowed IP set in environment variables, skip the check
  if (allowedIp && !isAllowedIp(requestIp, allowedIp)) {
    throw json({
      error: "Access denied: Unauthorized IP address",
      requestIp,
      allowedIp
    }, {
      status: 403
    });
  }

  // Continue with the rest of your loader logic if IP is allowed
  return json({ 
    ok: true,
    ip: requestIp // Useful for debugging
  });
}

export const links: LinksFunction = () => [
  {
    rel: 'icon',
    href: '/favicon.svg',
    type: 'image/svg+xml',
  },
  { rel: 'stylesheet', href: reactToastifyStyles },
  { rel: 'stylesheet', href: tailwindReset },
  { rel: 'stylesheet', href: globalStyles },
  { rel: 'stylesheet', href: xtermStyles },
  {
    rel: 'preconnect',
    href: 'https://fonts.googleapis.com',
  },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  },
];

const inlineThemeCode = stripIndents`
  setTutorialKitTheme();

  function setTutorialKitTheme() {
    let theme = localStorage.getItem('bolt_theme');

    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    document.querySelector('html')?.setAttribute('data-theme', theme);
  }
`;

export const Head = createHead(() => (
  <>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <Meta />
    <Links />
    <script dangerouslySetInnerHTML={{ __html: inlineThemeCode }} />
  </>
));

export function Layout({ children }: { children: React.ReactNode }) {
  const theme = useStore(themeStore);

  useEffect(() => {
    document.querySelector('html')?.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <>
      {children}
      <ScrollRestoration />
      <Scripts />
    </>
  );
}

export default function App() {
  const theme = useStore(themeStore);
  const data = useLoaderData<typeof loader>();

  useEffect(() => {
    logStore.logSystem('Application initialized', {
      theme,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      clientIp: data.ip // Log the IP for debugging
    });
  }, []);

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export function ErrorBoundary() {
  const theme = useStore(themeStore);

  useEffect(() => {
    document.querySelector('html')?.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <html lang="en" data-theme={theme}>
      <head>
        <title>Access Denied</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Links />
      </head>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-center">You are not authorized to access this application.</p>
          <p className="text-center mt-2 text-sm opacity-75">If you believe this is an error, please contact the administrator.</p>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
