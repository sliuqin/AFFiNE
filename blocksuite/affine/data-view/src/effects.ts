import { coreEffects } from './core/effect.js';
import { propertyPresetsEffects } from './property-presets/effect.js';
import { viewPresetsEffects } from './view-presets/effect.js';
import { widgetPresetsEffects } from './widget-presets/effect.js';

/**
 * Registers all core, property preset, view preset, and widget preset custom elements.
 *
 * Invokes the effect functions responsible for setting up custom elements across different domains.
 */
export function effects() {
  coreEffects();
  propertyPresetsEffects();
  viewPresetsEffects();
  widgetPresetsEffects();
}
