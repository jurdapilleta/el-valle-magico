import type { Tier } from '../core/deviceTier';

export type QualityPreset = {
  /** Upper bound for devicePixelRatio. */
  dprCap: number;
  bloom: boolean;
  /** Directional-light shadow map (1024). */
  shadows: boolean;
  contactShadows: boolean;
  /** Multiplier for instanced grass/flowers/trees. */
  instanceDensity: number;
};

// GAME_DESIGN §5.3
export const QUALITY_PRESETS: Record<Tier, QualityPreset> = {
  high: { dprCap: 2, bloom: true, shadows: true, contactShadows: true, instanceDensity: 1 },
  medium: { dprCap: 1.5, bloom: false, shadows: false, contactShadows: true, instanceDensity: 1 },
  low: { dprCap: 1, bloom: false, shadows: false, contactShadows: false, instanceDensity: 0.5 },
};

export type QualitySetting = 'auto' | Tier;

export function resolvePreset(setting: QualitySetting, detected: Tier): QualityPreset {
  return QUALITY_PRESETS[setting === 'auto' ? detected : setting];
}
