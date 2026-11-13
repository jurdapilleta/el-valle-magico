import { audio } from '../audio/AudioManager';
import { sceneActor } from '../core/machine';
import { useGameStore } from '../core/store';
import { cheerLuna, luna, placeLuna, walkLunaTo } from './lunaState';
import { burst } from './Particles';
import { ENTRY, portalApproach, standInFront, ZONES, type ZoneId } from './zones/defs';

/** Counters and timings read by smoke tests. */
export const worldStats = { greets: 0, idleHints: 0, idleWalks: 0, lastLoadMs: 0 };

/** Host animation state, read every frame by the host actor. */
export const hostState = { talking: false, happyUntil: 0 };

let loadStarted = 0;

/** Walks Luna to the portal for `to`, then steps through it. */
export function travelTo(to: ZoneId): void {
  const zone = ZONES[useGameStore.getState().zone];
  const portal = zone.portals.find((p) => p.to === to);
  if (!portal) return;
  walkLunaTo(portalApproach(portal), () => enterZone(to));
}

/** Swaps the zone: the scene shows the loading state until its assets are ready. */
export function enterZone(to: ZoneId): void {
  if (!sceneActor.getSnapshot().matches('world')) return;
  sceneActor.send({ type: 'PORTAL' });
  loadStarted = performance.now();
  audio.stopVoice();
  audio.playSfx('sparkle');
  audio.playMusic(to);
  hostState.talking = false;
  useGameStore.getState().setZone(to);
  placeLuna(ENTRY);
  burst('sparkle', { x: ENTRY.x, y: 1.4, z: ENTRY.z });
}

/** Called by the zone scene once everything it needs has loaded. */
export function zoneReady(): void {
  if (!sceneActor.getSnapshot().matches('loading')) return;
  if (loadStarted) worldStats.lastLoadMs = performance.now() - loadStarted;
  loadStarted = 0;
  sceneActor.send({ type: 'READY' });
}

/** Luna walks up to the zone's host, who says hello. */
export function visitHost(): void {
  const host = ZONES[useGameStore.getState().zone].host;
  if (!host) return;
  walkLunaTo(standInFront(host), () => {
    luna.faceYaw = Math.PI; // turn to the host
    hostState.talking = true;
    worldStats.greets++;
    void audio.say(host.hello).then((finished) => {
      hostState.talking = false;
      if (!finished) return;
      hostState.happyUntil = performance.now() + 1000;
      cheerLuna(1000);
    });
  });
}
