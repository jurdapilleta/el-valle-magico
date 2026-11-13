import {
  nextHop,
  portalApproach,
  standInFront,
  ZONES,
  type Point,
  type ZoneDef,
  type ZoneId,
} from './zones/defs';

// GAME_DESIGN §4.2
export const IDLE_HINT_SECONDS = 20;
export const IDLE_WALK_SECONDS = 45;
/** After this many unanswered rounds Luna stays quiet (an abandoned tablet should not chatter). */
export const IDLE_MAX_ROUNDS = 3;

export type IdleTarget = Point & { kind: 'game' | 'portal' | 'host'; to?: ZoneId };

const unplayed = (zone: ZoneDef, completed: ReadonlySet<string>) =>
  zone.games.find((game) => !completed.has(game.id));

/**
 * Where Luna wanders when nobody has touched the screen for a while: an
 * unplayed game in this zone, else the portal on the way to the nearest zone
 * that has one, else the host. Null when there is nowhere worth going.
 */
export function idleTarget(zoneId: ZoneId, completed: ReadonlySet<string>): IdleTarget | null {
  const zone = ZONES[zoneId];
  const game = unplayed(zone, completed);
  if (game) return { kind: 'game', ...standInFront(game) };
  const hop = nextHop(zoneId, (id) => unplayed(ZONES[id], completed) !== undefined);
  const portal = hop && zone.portals.find((p) => p.to === hop);
  if (portal) return { kind: 'portal', to: portal.to, ...portalApproach(portal) };
  if (zone.host) return { kind: 'host', ...standInFront(zone.host) };
  return null;
}

/** The spoken hint for the 20 s mark. */
export function idleLine(zoneId: ZoneId, round: number): string {
  if (zoneId !== 'hub') return 'common.idle.3';
  return round % 2 === 0 ? 'common.idle.1' : 'common.idle.2';
}
