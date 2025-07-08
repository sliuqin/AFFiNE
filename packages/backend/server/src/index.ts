/// <reference types="./global.d.ts" />
import './prelude';

import { run as runCli } from './cli';
import { run as runServer } from './server';

if (env.flavors.script) {
  await runCli();
} else {
  if (process.env.EZM_SERVER) {
    await import('./ezm');
  }
  await runServer();
}
