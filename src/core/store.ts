import { create } from 'zustand';
import { resolvePreset, type QualityPreset } from '../app/quality';
import type { Tier } from './deviceTier';
import type { ZoneId } from '../world/zones/defs';
import { defaultSave, type Save } from './persistence';

type GameStore = {
  tier: Tier;
  zone: ZoneId;
  /** Times each zone was entered this session; orders Luna's suggestions. */
  visits: Partial<Record<ZoneId, number>>;
  save: Save;
  setTier: (tier: Tier) => void;
  setZone: (zone: ZoneId) => void;
  setSave: (save: Save) => void;
};

/** The quality preset in force: the parent's choice, or the detected tier on auto. */
export function usePreset(): QualityPreset {
  const tier = useGameStore((s) => s.tier);
  const quality = useGameStore((s) => s.save.settings.quality);
  return resolvePreset(quality, tier);
}

export const useGameStore = create<GameStore>((set) => ({
  tier: 'medium',
  zone: 'hub',
  visits: { hub: 1 },
  save: defaultSave(),
  setTier: (tier) => set({ tier }),
  setZone: (zone) =>
    set((s) => ({ zone, visits: { ...s.visits, [zone]: (s.visits[zone] ?? 0) + 1 } })),
  setSave: (save) => set({ save }),
}));
