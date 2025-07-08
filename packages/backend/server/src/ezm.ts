import { start as startXprofiler } from 'xprofiler';
import { start as startXtransit } from 'xtransit';

startXprofiler();
startXtransit({
  server: process.env.EZM_SERVER ?? '',
  appId: parseInt(process.env.EZM_APP_ID ?? '0'),
  appSecret: process.env.EZM_APP_SECRET ?? '',
});
