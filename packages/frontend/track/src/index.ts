import { enableAutoTrack, makeTracker } from './auto';
import { mixpanel } from './mixpanel';
import { sentry } from './sentry';

export const track = makeTracker((event, props) => {
  mixpanel.track(event, props);
});

export { enableAutoTrack, mixpanel, sentry };
export default track;
