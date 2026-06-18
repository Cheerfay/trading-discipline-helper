/// <reference types="vite/client" />
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createServerFn } from '@tanstack/react-start';
import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';

import { GoogleAnalytics } from '@/components/analytics/google-analytics';
import { Plausible } from '@/components/analytics/plausible';
import { GoogleOneTap } from '@/components/google-one-tap';
import { Toaster } from '@/components/ui/sonner';
import { envConfigs } from '@/config';
import { getQueryClient } from '@/lib/query-client';
import { getLocale, locales, localizeUrl } from '@/paraglide/runtime.js';

import '@fontsource-variable/inter';
import '@fontsource/libre-baskerville/400.css';
import '@fontsource/libre-baskerville/700.css';
import '@fontsource/libre-baskerville/400-italic.css';
import '@/styles/globals.css';

// Analytics IDs live in the DB config (1h-cached service). Fetched via a
// server function so drizzle/db code never reaches the client bundle.
const getAnalyticsConfigs = createServerFn().handler(async () => {
  const { getAllConfigs } = await import('@/modules/config/service');
  const configs = await getAllConfigs();
  return {
    gaId: configs.google_analytics_id?.trim() || '',
    plausibleDomain: configs.plausible_domain?.trim() || '',
    plausibleSrc: configs.plausible_src?.trim() || '',
  };
});

export const Route = createRootRoute({
  loader: () => getAnalyticsConfigs(),
  head: () => {
    // head() runs on the SSR server AND again on the client during hydration.
    // On the client, app_url falls back to the localhost dev default when
    // VITE_APP_URL wasn't inlined into the client bundle at build — which would
    // emit a second, localhost set of hreflang links. Prefer the live origin
    // on the client so it always matches; the server uses the configured URL.
    const appUrl =
      (typeof window !== 'undefined' && window.location?.origin) ||
      envConfigs.app_url ||
      '';
    return {
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { title: envConfigs.app_name },
        { name: 'description', content: envConfigs.app_description },
      ],
      links: [
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
        { rel: 'apple-touch-icon', href: '/favicon.svg' },
        ...locales.map((loc) => ({
          rel: 'alternate',
          hrefLang: loc,
          href: localizeUrl(`${appUrl}/`, { locale: loc }).href,
        })),
      ],
    };
  },
  component: RootComponent,
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
});

function RootComponent() {
  const analytics = Route.useLoaderData();

  return (
    <QueryClientProvider client={getQueryClient()}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <Outlet />
        <Toaster position="top-center" richColors />
        <GoogleOneTap />
        {analytics?.gaId ? (
          <GoogleAnalytics measurementId={analytics.gaId} />
        ) : null}
        {analytics?.plausibleDomain ? (
          <Plausible
            domain={analytics.plausibleDomain}
            src={analytics.plausibleSrc || undefined}
          />
        ) : null}
      </ThemeProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang={getLocale()} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="text-muted-foreground">Page not found</p>
      <a href="/" className="text-sm underline underline-offset-4">
        Back to home
      </a>
    </div>
  );
}
