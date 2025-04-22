import './setup';

import { Telemetry } from '@affine/core/components/telemetry';
import { Fragment, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app';

const StrictModeWrapper =
  process.env.CI || process.env.NODE_ENV === 'production'
    ? Fragment
    : StrictMode;

function mountApp() {
  // oxlint-disable-next-line @typescript-eslint/no-non-null-assertion
  const root = document.getElementById('app')!;
  createRoot(root).render(
    <StrictModeWrapper>
      <Telemetry />
      <App />
    </StrictModeWrapper>
  );
}

try {
  mountApp();
} catch (err) {
  console.error('Failed to bootstrap app', err);
}
