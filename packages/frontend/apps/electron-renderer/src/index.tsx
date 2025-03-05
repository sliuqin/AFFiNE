import './setup';

import { appConfigProxy } from '@affine/core/components/hooks/use-app-config-storage';
import {
  init,
  reactRouterV6BrowserTracingIntegration,
  setTags,
} from '@sentry/react';
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';

import { App } from './app';

function main() {
  // skip bootstrap setup for desktop onboarding
  if (BUILD_CONFIG.debug || window.SENTRY_RELEASE) {
    // https://docs.sentry.io/platforms/javascript/guides/react/#configure
    init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.BUILD_TYPE ?? 'development',
      integrations: [
        reactRouterV6BrowserTracingIntegration({
          useEffect,
          useLocation,
          useNavigationType,
          createRoutesFromChildren,
          matchRoutes,
        }),
      ],
    });
    setTags({
      distribution: BUILD_CONFIG.distribution,
      appVersion: BUILD_CONFIG.appVersion,
      editorVersion: BUILD_CONFIG.editorVersion,
    });
  }

  // load persistent config for electron
  // TODO(@Peng): should be sync, but it's not necessary for now
  appConfigProxy
    .getSync()
    .catch(() => console.error('failed to load app config'));

  mountApp();
}

function mountApp() {
  // oxlint-disable-next-line typescript-eslint/no-non-null-assertion
  const root = document.getElementById('app')!;
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

try {
  main();
} catch (err) {
  console.error('Failed to bootstrap app', err);
}
